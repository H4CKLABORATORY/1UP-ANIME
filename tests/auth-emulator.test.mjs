/* 1UP Anime — native account emulator tests (real Firebase Auth + Firestore).
 * Runs against the local Firebase emulators (auth :9099, firestore :8080):
 *   npm run test:auth:emulator   (or scripts/run-auth-emulator.sh)
 * If the emulators are not running, every test is skipped (not faked).
 * Live Firebase is NOT used; live sign-up stays UNVERIFIED until the owner
 * creates the project and pastes the config (see docs/AUTH_SETUP.md).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const AUTH = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1';
const FS = 'http://127.0.0.1:8080/v1/projects/demo-1up-anime/databases/(default)/documents';
const KEY = 'fake-api-key';

async function emulatorUp() {
  try {
    const res = await fetch('http://127.0.0.1:9099/', { signal: AbortSignal.timeout(2000) });
    return res.ok || res.status === 404;
  } catch { return false; }
}

async function authCall(path, body) {
  const res = await fetch(`${AUTH}/${path}?key=${KEY}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json().catch(() => ({})) };
}

async function fsCreate(collection, docId, fields, idToken) {
  const headers = { 'content-type': 'application/json' };
  if (idToken) headers.authorization = `Bearer ${idToken}`;
  const res = await fetch(`${FS}/${collection}?documentId=${encodeURIComponent(docId)}`, {
    method: 'POST', headers, body: JSON.stringify({ fields }),
  });
  return { status: res.status, json: await res.json().catch(() => ({})) };
}

const str = (v) => ({ stringValue: v });
const ts = { timestampValue: '2026-11-07T00:00:00Z' };
const stamp = () => `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

test('emulator: sign-up, duplicate email, sign-in, wrong password, reset', async (t) => {
  if (!(await emulatorUp())) { t.skip('Firebase emulators are not running'); return; }
  const suffix = stamp();
  const email = `asta_${suffix}@ejemplo.com`;
  const signed = await authCall('accounts:signUp', { email, password: 'abc12345', returnSecureToken: true });
  assert.equal(signed.status, 200, JSON.stringify(signed.json));
  assert.ok(signed.json.idToken);
  assert.ok(signed.json.localId);
  const dup = await authCall('accounts:signUp', { email, password: 'abc12345', returnSecureToken: true });
  assert.equal(dup.status, 400);
  assert.match(JSON.stringify(dup.json), /EMAIL_EXISTS/);
  const login = await authCall('accounts:signInWithPassword', { email, password: 'abc12345', returnSecureToken: true });
  assert.equal(login.status, 200, JSON.stringify(login.json));
  assert.equal(login.json.localId, signed.json.localId);
  const wrong = await authCall('accounts:signInWithPassword', { email, password: 'wrong999', returnSecureToken: true });
  assert.equal(wrong.status, 400);
  assert.match(JSON.stringify(wrong.json), /INVALID_LOGIN_CREDENTIALS|INVALID_PASSWORD/);
  const reset = await authCall('accounts:sendOobCode', { requestType: 'PASSWORD_RESET', email });
  assert.equal(reset.status, 200, JSON.stringify(reset.json));
});

test('emulator: username claim is unique and enforced by Firestore rules', async (t) => {
  if (!(await emulatorUp())) { t.skip('Firebase emulators are not running'); return; }
  const suffix = stamp();
  const a = await authCall('accounts:signUp', { email: `a_${suffix}@ejemplo.com`, password: 'abc12345', returnSecureToken: true });
  const b = await authCall('accounts:signUp', { email: `b_${suffix}@ejemplo.com`, password: 'abc12345', returnSecureToken: true });
  assert.equal(a.status, 200);
  assert.equal(b.status, 200);
  const name = `fan_${suffix}`.replace(/[^a-z0-9_]/g, '').slice(0, 20);
  // Owner claims the username.
  const claim = await fsCreate('usernames', name,
    { uid: str(a.json.localId), username: str(name), createdAt: ts }, a.json.idToken);
  assert.equal(claim.status, 200, JSON.stringify(claim.json));
  // Another user cannot claim the same username (rules deny or doc exists).
  const steal = await fsCreate('usernames', name,
    { uid: str(b.json.localId), username: str(name), createdAt: ts }, b.json.idToken);
  assert.ok([403, 409].includes(steal.status), `expected 403/409, got ${steal.status}: ${JSON.stringify(steal.json)}`);
  // A claim with someone else's uid is rejected by the rules.
  const forged = await fsCreate('usernames', `otro_${suffix}`.slice(0, 20),
    { uid: str(a.json.localId), username: str(`otro_${suffix}`.slice(0, 20)), createdAt: ts }, b.json.idToken);
  assert.equal(forged.status, 403, JSON.stringify(forged.json));
  // Unauthenticated claims are rejected.
  const anon = await fsCreate('usernames', `anon_${suffix}`.slice(0, 20),
    { uid: str(a.json.localId), username: str(`anon_${suffix}`.slice(0, 20)), createdAt: ts }, null);
  assert.equal(anon.status, 403, JSON.stringify(anon.json));
  // Usernames must match ^[a-z0-9_]{3,20}$ (uppercase is rejected by the rules).
  const badName = await fsCreate('usernames', 'MAL_Nombre',
    { uid: str(b.json.localId), username: str('MAL_Nombre'), createdAt: ts }, b.json.idToken);
  assert.equal(badName.status, 403, JSON.stringify(badName.json));
  // The owner profile doc can only be created by its own uid.
  const profile = await fsCreate('users', a.json.localId,
    { uid: str(a.json.localId), username: str(name), createdAt: ts }, a.json.idToken);
  assert.equal(profile.status, 200, JSON.stringify(profile.json));
  const profileForged = await fsCreate('users', b.json.localId,
    { uid: str(b.json.localId), username: str(name), createdAt: ts }, a.json.idToken);
  assert.equal(profileForged.status, 403, JSON.stringify(profileForged.json));
});
