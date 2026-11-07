/* 1UP Anime — Phase 6: licensed-media admin tests against a REAL local
 * Supabase stack (`supabase start`, API :54321, DB :54322), with
 * supabase/sql/oneup_licensed_media.sql applied (scripts/run-supabase-local.sh
 * does this). If the local stack is not running, every test is skipped
 * (not faked), exactly like tests/auth-supabase.test.mjs.
 * The hosted project stays IMPLEMENTADO PERO NO VERIFICADO until Douglas
 * creates it. Keys below are LOCAL-DEV ONLY.
 * Test entries use ONLY the test anime id mal-999006 and the project's own
 * synthetic fixture URL — never real catalog content (Rule 12) — and are
 * deleted again at the end of the run.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const API = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const ANON = process.env.SUPABASE_ANON_KEY || 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';
const ANIME = 'mal-999006';
const PASSWORD = 'abc12345';

async function stackUp() {
  try {
    const res = await fetch(`${API}/auth/v1/health`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch { return false; }
}
async function authCall(path, body) {
  const res = await fetch(`${API}/auth/v1/${path}`, {
    method: 'POST',
    headers: { apikey: ANON, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json().catch(() => ({})) };
}
async function rest(table, { method = 'GET', body = null, token = null, query = '' } = {}) {
  // No token = anonymous role: send NO Authorization header (the local
  // stack does not translate the sb_publishable_ key into a JWT; see
  // tests/auth-supabase.test.mjs).
  const headers = {
    apikey: ANON,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    'content-type': 'application/json',
    Prefer: 'return=representation',
  };
  const res = await fetch(`${API}/rest/v1/${table}${query}`, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json().catch(() => ({})) };
}
const stamp = () => `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
function psql(sql) {
  execFileSync('psql', ['-h', '127.0.0.1', '-p', '54322', '-U', 'postgres', '-d', 'postgres',
    '-v', 'ON_ERROR_STOP=1', '-c', sql],
    { env: { ...process.env, PGPASSWORD: 'postgres' }, stdio: 'pipe' });
}
async function signUpUser(t, role = null) {
  if (!(await stackUp())) { t.skip('Local Supabase stack is not running (supabase start)'); return null; }
  const suffix = stamp();
  const username = `fan_${suffix}`.replace(/[^a-z0-9_]/g, '').slice(0, 20);
  const email = `fan_${suffix}@ejemplo.com`;
  const signed = await authCall('signup', { email, password: PASSWORD, data: { username } });
  assert.equal(signed.status, 200, JSON.stringify(signed.json));
  assert.ok(signed.json.user?.id, JSON.stringify(signed.json));
  if (role) {
    psql(`insert into public.oneup_admin_roles (user_id, role) values ('${signed.json.user.id}', '${role}')
          on conflict (user_id) do update set role = excluded.role;`);
  }
  return { token: signed.json.access_token, id: signed.json.user.id, email, username };
}
const baseEntry = (overrides = {}) => ({
  anime_id: ANIME, season: 1, episode_number: 1,
  episode_title: 'Fixture sintético fase 6', provider: 'Fixture propio 1UP',
  mode: 'file', video_id: null,
  source_url: 'https://fixtures.example.com/player-fixture.webm',
  language: 'es-419', quality: '180p', subtitles_url: null,
  rights_status: 'authorized',
  rights_note: 'Fixture WebM sintético propio, generado para pruebas; sin contenido de terceros.',
  active: true,
  ...overrides,
});

test('phase6: anonymous cannot insert a licensed entry', async (t) => {
  if (!(await stackUp())) { t.skip('Local Supabase stack is not running (supabase start)'); return; }
  const res = await rest('oneup_licensed_media', { method: 'POST', body: baseEntry() });
  assert.ok([401, 403].includes(res.status), `expected 401/403, got ${res.status}: ${JSON.stringify(res.json)}`);
});

test('phase6: a non-admin account cannot insert, update or delete', async (t) => {
  const fan = await signUpUser(t);
  if (!fan) return;
  const owner = await signUpUser(t, 'owner');
  if (!owner) return;
  const ins = await rest('oneup_licensed_media', { method: 'POST', token: fan.token, body: baseEntry() });
  assert.ok([401, 403].includes(ins.status), `expected 401/403, got ${ins.status}: ${JSON.stringify(ins.json)}`);
  const made = await rest('oneup_licensed_media', { method: 'POST', token: owner.token, body: baseEntry({ episode_number: 41 }) });
  assert.equal(made.status, 201, JSON.stringify(made.json));
  const rowId = made.json[0].id;
  // The fan can SEE the active row (public read) but cannot change it:
  const upd = await rest('oneup_licensed_media', {
    method: 'PATCH', token: fan.token, query: `?id=eq.${rowId}`,
    body: { active: false, episode_title: 'Modificado por un fan' },
  });
  assert.ok(upd.status === 200 || [401, 403, 404].includes(upd.status), JSON.stringify(upd));
  const after = await rest('oneup_licensed_media', { query: `?id=eq.${rowId}&select=active,episode_title` });
  assert.equal(after.json[0]?.active, true, 'fan PATCH must not deactivate the entry');
  assert.equal(after.json[0]?.episode_title, 'Fixture sintético fase 6');
  const del = await rest('oneup_licensed_media', { method: 'DELETE', token: fan.token, query: `?id=eq.${rowId}` });
  assert.ok(del.status === 200 || [401, 403, 404].includes(del.status), JSON.stringify(del));
  const still = await rest('oneup_licensed_media', { query: `?id=eq.${rowId}&select=id` });
  assert.equal(still.json.length, 1, 'fan DELETE must not remove the entry');
});

test('phase6: owner (and moderator) can insert; created_by is forced to the caller', async (t) => {
  const owner = await signUpUser(t, 'owner');
  if (!owner) return;
  const other = await signUpUser(t);
  if (!other) return;
  const forged = await rest('oneup_licensed_media', {
    method: 'POST', token: owner.token,
    body: baseEntry({ episode_number: 42, created_by: other.id }),
  });
  assert.equal(forged.status, 201, JSON.stringify(forged.json));
  assert.equal(forged.json[0]?.created_by, owner.id, 'guard trigger must override created_by with auth.uid()');
  assert.equal(forged.json[0]?.active, true);
  const mod = await signUpUser(t, 'moderator');
  if (!mod) return;
  const byMod = await rest('oneup_licensed_media', {
    method: 'POST', token: mod.token, body: baseEntry({ episode_number: 43 }),
  });
  assert.equal(byMod.status, 201, JSON.stringify(byMod.json));
  // The admin RPC answers only about the caller.
  const roleRes = await fetch(`${API}/rest/v1/rpc/oneup_my_admin_role`, {
    method: 'POST',
    headers: { apikey: ANON, Authorization: `Bearer ${owner.token}`, 'content-type': 'application/json' },
    body: '{}',
  });
  assert.equal(await roleRes.json(), 'owner');
  const fanRole = await fetch(`${API}/rest/v1/rpc/oneup_my_admin_role`, {
    method: 'POST',
    headers: { apikey: ANON, Authorization: `Bearer ${other.token}`, 'content-type': 'application/json' },
    body: '{}',
  });
  assert.equal(await fanRole.json(), null);
});

test('phase6: Rule 12 — pending / rejected / undocumented entries CANNOT become active (direct API)', async (t) => {
  const owner = await signUpUser(t, 'owner');
  if (!owner) return;
  for (const bad of [
    { rights_status: 'pending' },
    { rights_status: 'rejected' },
    { rights_status: 'authorized', rights_note: '' },
    { rights_status: 'owned', rights_note: '   ' },
  ]) {
    const res = await rest('oneup_licensed_media', {
      method: 'POST', token: owner.token, body: baseEntry({ episode_number: 44, ...bad }),
    });
    assert.equal(res.status, 400, `active + ${JSON.stringify(bad)} must fail the CHECK, got ${res.status}: ${JSON.stringify(res.json)}`);
    assert.match(JSON.stringify(res.json), /23514|rule12|check/i);
  }
  // Inactive pending is allowed (a draft), but activating it afterwards fails too:
  const draft = await rest('oneup_licensed_media', {
    method: 'POST', token: owner.token,
    body: baseEntry({ episode_number: 45, rights_status: 'pending', rights_note: '', active: false }),
  });
  assert.equal(draft.status, 201, JSON.stringify(draft.json));
  const activate = await rest('oneup_licensed_media', {
    method: 'PATCH', token: owner.token, query: `?id=eq.${draft.json[0].id}`, body: { active: true },
  });
  assert.equal(activate.status, 400, `activating a pending draft must fail, got ${activate.status}`);
  // Documenting the rights and clearing the status makes activation work:
  const fixed = await rest('oneup_licensed_media', {
    method: 'PATCH', token: owner.token, query: `?id=eq.${draft.json[0].id}`,
    body: { active: true, rights_status: 'owned', rights_note: 'Obra propia del proyecto 1UP.' },
  });
  assert.equal(fixed.status, 200, JSON.stringify(fixed.json));
  assert.equal(fixed.json[0]?.active, true);
});

test('phase6: source shape is enforced in the schema (embed id / file URL)', async (t) => {
  const owner = await signUpUser(t, 'owner');
  if (!owner) return;
  const badEmbed = await rest('oneup_licensed_media', {
    method: 'POST', token: owner.token,
    body: baseEntry({ episode_number: 46, mode: 'official_embed', video_id: 'corto', source_url: null }),
  });
  assert.equal(badEmbed.status, 400, JSON.stringify(badEmbed.json));
  const badFile = await rest('oneup_licensed_media', {
    method: 'POST', token: owner.token,
    body: baseEntry({ episode_number: 47, source_url: 'http://fixtures.example.com/player-fixture.avi' }),
  });
  assert.equal(badFile.status, 400, JSON.stringify(badFile.json));
  const goodEmbed = await rest('oneup_licensed_media', {
    method: 'POST', token: owner.token,
    body: baseEntry({
      episode_number: 48, mode: 'official_embed', video_id: 'TESTID12345', source_url: null,
      provider: 'Fixture embed de prueba',
    }),
  });
  // 'TESTID12345' is a synthetic 11-char shape probe (not a real catalog
  // entry, never in the static manifest); the row is removed in cleanup.
  assert.equal(goodEmbed.status, 201, JSON.stringify(goodEmbed.json));
});

test('phase6: public read returns ONLY active + rights-cleared entries; deactivating hides', async (t) => {
  const owner = await signUpUser(t, 'owner');
  if (!owner) return;
  const probe = stamp();
  const visible = await rest('oneup_licensed_media', {
    method: 'POST', token: owner.token,
    body: baseEntry({ episode_number: 51, episode_title: 'Visible ' + probe }),
  });
  assert.equal(visible.status, 201, JSON.stringify(visible.json));
  const hidden = await rest('oneup_licensed_media', {
    method: 'POST', token: owner.token,
    body: baseEntry({ episode_number: 52, episode_title: 'Oculto ' + probe, active: false }),
  });
  assert.equal(hidden.status, 201, JSON.stringify(hidden.json));
  const anon = await rest('oneup_licensed_media', {
    query: `?anime_id=eq.${ANIME}&episode_number=in.(51,52)&select=id,episode_number,active,rights_status`,
  });
  assert.equal(anon.status, 200, JSON.stringify(anon.json));
  assert.deepEqual(anon.json.map((r) => r.episode_number), [51], 'anon must see only the active entry');
  const fan = await signUpUser(t);
  if (!fan) return;
  const fanRead = await rest('oneup_licensed_media', {
    token: fan.token,
    query: `?anime_id=eq.${ANIME}&episode_number=in.(51,52)&select=episode_number`,
  });
  assert.deepEqual(fanRead.json.map((r) => r.episode_number), [51], 'a non-admin account must also see only the active entry');
  const adminRead = await rest('oneup_licensed_media', {
    token: owner.token,
    query: `?anime_id=eq.${ANIME}&episode_number=in.(51,52)&select=episode_number`,
  });
  assert.equal(adminRead.json.length, 2, 'the admin list must include inactive entries');
  const off = await rest('oneup_licensed_media', {
    method: 'PATCH', token: owner.token, query: `?id=eq.${visible.json[0].id}`, body: { active: false },
  });
  assert.equal(off.status, 200, JSON.stringify(off.json));
  const anonAfter = await rest('oneup_licensed_media', {
    query: `?anime_id=eq.${ANIME}&episode_number=in.(51,52)&select=episode_number`,
  });
  assert.deepEqual(anonAfter.json, [], 'deactivating must hide the entry from the public immediately');
});

test('phase6: cleanup — remove every test-scoped row', async (t) => {
  const owner = await signUpUser(t, 'owner');
  if (!owner) return;
  const del = await rest('oneup_licensed_media', {
    method: 'DELETE', token: owner.token, query: `?anime_id=eq.${ANIME}`,
  });
  assert.ok([200, 204].includes(del.status), JSON.stringify(del));
  const left = await rest('oneup_licensed_media', {
    token: owner.token, query: `?anime_id=eq.${ANIME}&select=id`,
  });
  assert.deepEqual(left.json, [], 'no test rows may remain');
});
