import test from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import { createDashboardSync, emptyData, readTable, TABLES } from './dashboardSync.js';

function fakeClient(initial = {}) {
  const database = { ...emptyData(), ...initial };
  const handlers = {};
  const failures = {};
  const calls = [];
  const channelNames = [];
  let gate;
  let removed = false;
  let subscription;
  const channel = {
    on(_event, filter, callback) { handlers[filter.table] = callback; return this; },
    subscribe(callback) { subscription = callback; return this; },
  };
  const client = {
    channel: (name) => { channelNames.push(name); return channel; },
    removeChannel: () => { removed = true; },
    from(table) {
      let start = 0;
      let end = 999;
      let includeCount = false;
      const orders = [];
      const query = {
        select(_columns, options) { includeCount = options.count === 'exact'; return this; },
        order(column, options = {}) { orders.push({ column, ...options }); return this; },
        range(first, last) { start = first; end = last; return this; },
        async abortSignal(signal) {
          calls.push({ table, start, end, orders });
          const snapshot = structuredClone(database[table]);
          if (gate) await gate;
          if (signal.aborted) return { error: { message: 'Aborted' } };
          if (failures[table]) return { data: null, error: failures[table] };
          return { data: snapshot.slice(start, Math.min(end + 1, start + client.serverLimit)), error: null, count: includeCount ? snapshot.length : null };
        },
      };
      return query;
    },
    serverLimit: 1000,
  };
  return { client, database, failures, calls, handlers, channelNames, get removed() { return removed; },
    setGate(value) { gate = value; }, status(value) { subscription(value); } };
}

function startSync(fake) {
  let state = {};
  let poll;
  let cleared = false;
  const updates = [];
  const sync = createDashboardSync(fake.client, (patch) => {
    state = { ...state, ...patch };
    updates.push(patch);
  }, {
    setIntervalFn(callback) { poll = callback; return 1; },
    clearIntervalFn() { cleared = true; },
  });
  return { sync, updates, poll: () => poll(), get state() { return state; }, get cleared() { return cleared; } };
}

test('reads past the old 100-row limit and a lower server page limit', async () => {
  const rows = Array.from({ length: 1005 }, (_, id) => ({ id, fecha_hora: '2026-10-30' }));
  const fake = fakeClient({ historial_acceso: rows });
  fake.client.serverLimit = 400;
  assert.deepEqual(await readTable(fake.client, 'historial_acceso', new AbortController().signal), rows);
  assert.deepEqual(fake.calls.map((call) => call.start), [0, 400, 800]);
  assert.deepEqual(fake.calls[0].orders.map((order) => order.column), ['fecha_hora', 'id']);
});

test('polling mirrors inserts, updates and deletion of the final row in all five tables', async (t) => {
  const fake = fakeClient();
  const run = startSync(fake);
  t.after(() => run.sync.stop());
  await setImmediate();
  assert.deepEqual(run.state.data, emptyData());
  for (const table of TABLES) fake.database[table] = [{ id: 1, value: 'inserted' }];
  run.poll();
  await setImmediate();
  for (const table of TABLES) assert.equal(run.state.data[table][0].value, 'inserted');
  for (const table of TABLES) fake.database[table][0].value = 'updated';
  run.poll();
  await setImmediate();
  for (const table of TABLES) assert.equal(run.state.data[table][0].value, 'updated');
  for (const table of TABLES) fake.database[table] = [];
  run.poll();
  await setImmediate();
  assert.deepEqual(run.state.data, emptyData());
});

test('Realtime subscribes to every table and refreshes related data', async (t) => {
  const fake = fakeClient();
  const run = startSync(fake);
  t.after(() => run.sync.stop());
  await setImmediate();
  assert.deepEqual(Object.keys(fake.handlers), TABLES);
  for (const table of TABLES) {
    fake.database[table] = [{ id: 42 }];
    fake.handlers[table]();
    await setImmediate();
    assert.equal(run.state.data[table][0].id, 42);
  }
  fake.status('CHANNEL_ERROR');
  assert.equal(run.state.realtime, 'polling');
  fake.database.historial_acceso = [{ id: 43 }];
  run.poll();
  await setImmediate();
  assert.equal(run.state.data.historial_acceso[0].id, 43);
});

test('failed reads are visible, do not keep misleading rows, and recover', async (t) => {
  const fake = fakeClient({ historial_acceso: [{ id: 1 }], usuario: [{ id: 2 }] });
  const run = startSync(fake);
  t.after(() => run.sync.stop());
  await setImmediate();
  fake.failures.historial_acceso = { code: '42501', message: 'permission denied' };
  await run.sync.refresh();
  assert.match(run.state.errors.historial_acceso, /42501.*permission denied/);
  assert.deepEqual(run.state.data.historial_acceso, []);
  assert.equal(run.state.data.usuario[0].id, 2);
  assert.equal(run.state.lastSync, null);
  delete fake.failures.historial_acceso;
  await run.sync.refresh();
  assert.deepEqual(run.state.errors, {});
  assert.equal(run.state.data.historial_acceso[0].id, 1);
  assert.ok(run.state.lastSync instanceof Date);
});

test('changes during an in-flight read queue a fresh read without overlap', async (t) => {
  const fake = fakeClient({ historial_acceso: [{ id: 1 }] });
  let release;
  fake.setGate(new Promise((resolve) => { release = resolve; }));
  const run = startSync(fake);
  t.after(() => run.sync.stop());
  assert.equal(fake.calls.length, 5);
  fake.database.historial_acceso = [{ id: 2 }];
  fake.handlers.historial_acceso();
  run.poll();
  assert.equal(fake.calls.length, 5);
  fake.setGate(null);
  release();
  await setImmediate();
  assert.equal(fake.calls.length, 10);
  assert.equal(run.state.data.historial_acceso[0].id, 2);
});

test('cleanup cancels polling, removes channel, and ignores late responses', async () => {
  const fake = fakeClient();
  let release;
  fake.setGate(new Promise((resolve) => { release = resolve; }));
  const run = startSync(fake);
  run.sync.stop();
  const updateCount = run.updates.length;
  release();
  await setImmediate();
  run.poll();
  assert.equal(run.updates.length, updateCount);
  assert.equal(fake.removed, true);
  assert.equal(run.cleared, true);
});

test('missing configuration reports a connection error and empty data', () => {
  let state;
  const sync = createDashboardSync(null, (patch) => { state = patch; });
  assert.match(state.errors.conexion, /VITE_SUPABASE_URL/);
  assert.deepEqual(state.data, emptyData());
  assert.equal(state.loading, false);
  sync.stop();
});

test('reopening the panel never reuses a channel whose removal is pending', async () => {
  const fake = fakeClient();
  fake.client.removeChannel = () => new Promise(() => {});
  const first = startSync(fake);
  first.sync.stop();
  const second = startSync(fake);
  await setImmediate();
  assert.equal(fake.channelNames.length, 2);
  assert.notEqual(fake.channelNames[0], fake.channelNames[1]);
  assert.equal(second.state.checked, true);
  second.sync.stop();
});
