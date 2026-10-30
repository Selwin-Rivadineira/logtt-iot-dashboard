import test from 'node:test';
import assert from 'node:assert/strict';
import { isServerOnlyKey, assertPublicEnvironment } from './supabaseKey.js';

const jwtFor = (role) => `header.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.signature`;

test('rejects secret and legacy service_role keys without rejecting public keys', () => {
  assert.equal(isServerOnlyKey('sb_secret_test_fixture'), true);
  assert.equal(isServerOnlyKey(jwtFor('service_role')), true);
  assert.equal(isServerOnlyKey('sb_publishable_test_fixture'), false);
  assert.equal(isServerOnlyKey(jwtFor('anon')), false);
});

test('blocks secret keys in Vite variables without leaking the value in errors', () => {
  const secret = 'sb_secret_test_fixture';
  assert.throws(() => assertPublicEnvironment({ VITE_SUPABASE_ANON_KEY: secret }), (error) => {
    assert.match(error.message, /VITE_SUPABASE_ANON_KEY/);
    assert.equal(error.message.includes(secret), false);
    return true;
  });
  assert.doesNotThrow(() => assertPublicEnvironment({ SUPABASE_SECRET_KEY: secret,
    VITE_SUPABASE_ANON_KEY: 'sb_publishable_test_fixture' }));
});
