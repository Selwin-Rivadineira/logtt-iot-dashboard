export const TABLES = ['historial_acceso', 'area', 'usuario', 'tarjeta', 'permiso'];
const PAGE_SIZE = 1000;

export const emptyData = () => Object.fromEntries(TABLES.map((table) => [table, []]));

// Paginar también las tablas auxiliares: Supabase limita las filas por respuesta.
export async function readTable(client, table, signal) {
  const rows = [];
  let total;
  do {
    let query = client.from(table).select('*', rows.length === 0 ? { count: 'exact' } : {});
    if (table === 'historial_acceso') {
      query = query.order('fecha_hora', { ascending: false, nullsFirst: false })
        .order('id', { ascending: false });
    } else if (table === 'tarjeta') {
      query = query.order('codigo_rfid');
    } else if (table === 'permiso') {
      query = query.order('usuario_id').order('area_id');
    } else {
      query = query.order('id');
    }
    const { data, error, count } = await query
      .range(rows.length, rows.length + PAGE_SIZE - 1).abortSignal(signal);
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error('Respuesta de datos no válida.');
    if (rows.length === 0) total = count;
    rows.push(...data);
    if (data.length === 0 || (total == null && data.length < PAGE_SIZE)) break;
  } while (total == null || rows.length < total);
  return rows;
}

// Una sola lectura en curso. Un cambio recibido durante la consulta provoca
// otra lectura al terminar, sin permitir que respuestas antiguas pisen nuevas.
export function createDashboardSync(client, onChange, {
  pollMs = 2000,
  setIntervalFn = setInterval,
  clearIntervalFn = clearInterval,
} = {}) {
  let stopped = false;
  let inFlight = null;
  let pending = false;
  let controller;
  let channel;
  let timer;

  const emit = (patch) => { if (!stopped) onChange(patch); };
  const refresh = () => {
    if (stopped) return Promise.resolve();
    if (inFlight) {
      pending = true;
      return inFlight;
    }
    if (!client) {
      emit({ data: emptyData(), loading: false, errors: {
        conexion: 'Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY con valores del mismo proyecto.',
      } });
      return Promise.resolve();
    }
    emit({ loading: true });
    controller = new AbortController();
    const started = performance.now();
    const timeout = setTimeout(() => controller.abort(), 15000);
    inFlight = Promise.all(TABLES.map(async (table) => {
      try {
        return { table, data: await readTable(client, table, controller.signal) };
      } catch (error) {
        return { table, data: [], error: `${error.code ? `${error.code}: ` : ''}${error.message || 'No se pudo consultar la tabla.'}` };
      }
    })).then((results) => {
      const errors = Object.fromEntries(results.filter((r) => r.error).map((r) => [r.table, r.error]));
      emit({
        data: Object.fromEntries(results.map((r) => [r.table, r.data])),
        errors,
        loading: false,
        queryLatency: Math.round(performance.now() - started),
        lastSync: Object.keys(errors).length === 0 ? new Date() : null,
        checked: true,
      });
    }).finally(() => {
      clearTimeout(timeout);
      inFlight = null;
      if (pending && !stopped) {
        pending = false;
        void refresh();
      }
    });
    return inFlight;
  };

  emit({ data: emptyData(), loading: false, errors: {}, queryLatency: null,
    lastSync: null, checked: false, realtime: 'polling' });
  if (client) {
    // El cierre es asíncrono: StrictMode o volver a entrar al panel no debe
    // reutilizar un canal anterior que todavía está cerrándose.
    channel = client.channel(`logtt-dashboard-${crypto.randomUUID()}`);
    for (const table of TABLES) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => void refresh());
    }
    channel.subscribe((status) => {
      emit({ realtime: status === 'SUBSCRIBED' ? 'connected' : 'polling' });
      if (status === 'SUBSCRIBED') void refresh();
    });
    timer = setIntervalFn(() => { if (!inFlight) void refresh(); }, pollMs);
  }
  void refresh();

  return {
    refresh,
    stop() {
      stopped = true;
      controller?.abort();
      if (timer !== undefined) clearIntervalFn(timer);
      if (channel) void client.removeChannel(channel);
    },
  };
}
