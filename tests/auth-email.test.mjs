/* 1UP Anime — native account tests (email + password, no Google sign-in).
 * Runs auth.js in a vm with stubbed DOM/storage and a fake Supabase backend
 * injected through the window.__ONEUP_SUPABASE_LOADER__ seam.
 * Live Supabase is NOT used here; see tests/auth-supabase.test.mjs for the
 * real local-stack run (sign-up/login/RLS against supabase start).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const authSrc = fs.readFileSync(path.join(repo, 'auth.js'), 'utf8');

function makeBackend() {
  const usersByEmail = new Map();
  const profiles = new Map(); // userId -> { id, username }
  const usernameIndex = new Map(); // username -> userId
  const calls = { resetEmails: [], signOuts: 0 };
  const flags = { raceUsername: null, noTrigger: false, confirmEmail: false };
  let uidSeq = 0;
  let currentUser = null;
  const listeners = new Set();
  const notify = (event = 'SIGNED_IN', session = currentUser ? { user: currentUser } : null) => {
    for (const cb of listeners) { try { cb(event, session); } catch { /* ignore */ } }
  };
  const client = {
    auth: {
      signUp: async ({ email, password, options }) => {
        if (usersByEmail.has(email)) {
          return { data: {}, error: { message: 'User already registered' } };
        }
        const username = String(options?.data?.username || '');
        if (flags.raceUsername === username) {
          // Another user claimed the name between the pre-check and sign-up.
          usernameIndex.set(username, 'uid-other');
          profiles.set('uid-other', { id: 'uid-other', username });
        }
        if (!/^[a-z0-9_]{3,20}$/.test(username)) {
          return { data: {}, error: { message: 'Username must be 3-20 chars' } };
        }
        if (usernameIndex.has(username)) {
          return { data: {}, error: { message: 'Username already taken' } };
        }
        const user = { id: 'uid' + (++uidSeq), email, password, user_metadata: options?.data || {} };
        usersByEmail.set(email, user);
        if (!flags.noTrigger) {
          profiles.set(user.id, { id: user.id, username });
          usernameIndex.set(username, user.id);
        }
        currentUser = user;
        const session = flags.confirmEmail ? null : { user };
        notify('SIGNED_IN', session);
        return { data: { user, session }, error: null };
      },
      signInWithPassword: async ({ email, password }) => {
        const user = usersByEmail.get(email);
        if (!user || user.password !== password) {
          return { data: {}, error: { message: 'Invalid login credentials' } };
        }
        currentUser = user;
        notify('SIGNED_IN', { user });
        return { data: { user, session: { user } }, error: null };
      },
      signOut: async () => {
        calls.signOuts++;
        currentUser = null;
        notify('SIGNED_OUT', null);
        return { error: null };
      },
      getSession: async () => ({
        data: { session: currentUser ? { user: currentUser } : null }, error: null,
      }),
      getUser: async () => ({
        data: { user: currentUser }, error: currentUser ? null : { name: 'AuthSessionMissingError' },
      }),
      onAuthStateChange: (cb) => {
        listeners.add(cb);
        return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } };
      },
      resetPasswordForEmail: async (email) => {
        calls.resetEmails.push(email);
        if (!usersByEmail.has(email)) {
          return { data: {}, error: { message: 'User not found' } };
        }
        return { data: {}, error: null };
      },
      updateUser: async ({ password }) => {
        if (!currentUser) return { data: {}, error: { message: 'Auth session missing' } };
        currentUser.password = password;
        return { data: { user: currentUser }, error: null };
      },
    },
    from: (table) => {
      if (table !== 'profiles') throw new Error('unexpected table ' + table);
      const query = {
        _eq: null,
        select: () => query,
        eq: (col, val) => { query._eq = [col, val]; return query; },
        maybeSingle: async () => {
          const [col, val] = query._eq || [];
          let row = null;
          if (col === 'username') {
            const id = usernameIndex.get(val);
            if (id) row = profiles.get(id) || null;
          } else if (col === 'id') {
            row = profiles.get(val) || null;
          }
          return { data: row, error: null };
        },
        insert: async (row) => {
          if (usernameIndex.has(row.username)) {
            return { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint "profiles_username_key"' } };
          }
          profiles.set(row.id, { id: row.id, username: row.username });
          usernameIndex.set(row.username, row.id);
          return { data: [row], error: null };
        },
      };
      return query;
    },
  };
  const loader = async () => client;
  return {
    usersByEmail, profiles, usernameIndex, calls, flags, loader, client,
    get currentUser() { return currentUser; },
  };
}

function makeEl(id) {
  return {
    id, hidden: false, disabled: false, textContent: '', value: '', open: false,
    showModal() { this.open = true; },
    close() { this.open = false; },
    addEventListener() {},
    setAttribute() {},
    focus() {},
    querySelector() { return null; },
    replaceChildren() {},
    append() {},
    classList: { add() {}, remove() {}, toggle() {} },
  };
}

function makeContext(backend, config = { url: 'https://demo.supabase.co', publishableKey: 'sb_publishable_demo' }, hash = '') {
  const elements = new Map();
  const domReady = [];
  const store = new Map();
  const sandbox = {
    console,
    setTimeout, clearTimeout,
    location: { origin: 'https://ejemplo.test', pathname: '/index.html', hash },
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => { store.set(k, String(v)); },
      removeItem: (k) => { store.delete(k); },
    },
    document: {
      querySelector: (sel) => {
        const id = typeof sel === 'string' && sel.startsWith('#') ? sel.slice(1) : null;
        if (!id) return null;
        if (!elements.has(id)) elements.set(id, makeEl(id));
        return elements.get(id);
      },
      addEventListener: (type, cb) => { if (type === 'DOMContentLoaded') domReady.push(cb); },
      createElement: () => makeEl('x'),
    },
  };
  sandbox.window = sandbox;
  sandbox.window.ONEUP_SUPABASE_CONFIG = config;
  sandbox.window.__ONEUP_SUPABASE_LOADER__ = backend.loader;
  const ctx = vm.createContext(sandbox);
  vm.runInContext(authSrc, ctx, { filename: 'auth.js' });
  for (const cb of domReady) cb();
  return { sandbox, elements, auth: sandbox.window.OneUpAuth };
}

const tick = (ms = 25) => new Promise((r) => setTimeout(r, ms));

test('validation rejects bad usernames, emails and passwords', async () => {
  const backend = makeBackend();
  const { auth } = makeContext(backend);
  const v = auth.validate;
  assert.equal(v.validateUsername('ab').ok, false);
  assert.equal(v.validateUsername('a'.repeat(21)).ok, false);
  assert.equal(v.validateUsername('Con espacios').ok, false);
  assert.equal(v.validateUsername('josé_fan').ok, false);
  assert.equal(v.validateUsername('admin').ok, false);
  assert.equal(v.validateUsername('ASTA_FAN').ok, true);
  assert.equal(v.validateUsername('ASTA_FAN').username, 'asta_fan');
  assert.equal(v.validateEmail('no-es-correo').ok, false);
  assert.equal(v.validateEmail('fan@ejemplo.com').ok, true);
  assert.equal(v.validatePassword('corta1').ok, false);
  assert.equal(v.validatePassword('sinnumeros').ok, false);
  assert.equal(v.validatePassword('abc12345').ok, true);
  assert.equal(auth.SUPABASE_SDK_VERSION, '2.117.3');
});

test('sign-up creates the account and claims the username in profiles', async () => {
  const backend = makeBackend();
  const { auth } = makeContext(backend);
  const res = await auth.signUp({ username: 'Asta_Fan', email: 'asta@ejemplo.com', password: 'abc12345' });
  assert.equal(res.ok, true);
  assert.equal(res.name, 'asta_fan');
  const me = auth.get();
  assert.equal(me.kind, 'account');
  assert.equal(me.name, 'asta_fan');
  assert.equal(me.email, 'asta@ejemplo.com');
  assert.deepEqual(backend.profiles.get(me.uid), { id: me.uid, username: 'asta_fan' });
  assert.equal(backend.usernameIndex.get('asta_fan'), me.uid);
});

test('sign-up rejects a taken username without creating an Auth user', async () => {
  const backend = makeBackend();
  const { auth } = makeContext(backend);
  await auth.signUp({ username: 'asta_fan', email: 'asta@ejemplo.com', password: 'abc12345' });
  const before = backend.usersByEmail.size;
  const res = await auth.signUp({ username: 'ASTA_FAN', email: 'otro@ejemplo.com', password: 'abc12345' });
  assert.equal(res.ok, false);
  assert.match(res.message, /ya está en uso/);
  assert.equal(backend.usersByEmail.size, before);
});

test('sign-up race on the username creates no usable account', async () => {
  const backend = makeBackend();
  const { auth } = makeContext(backend);
  backend.flags.raceUsername = 'yuno_fan';
  const res = await auth.signUp({ username: 'yuno_fan', email: 'yuno@ejemplo.com', password: 'abc12345' });
  assert.equal(res.ok, false);
  assert.match(res.message, /ya está en uso/);
  assert.equal(backend.usersByEmail.has('yuno@ejemplo.com'), false);
  assert.equal(auth.get().kind, 'guest');
});

test('sign-up without a profile trigger falls back to a direct profile insert', async () => {
  const backend = makeBackend();
  backend.flags.noTrigger = true;
  const { auth } = makeContext(backend);
  const res = await auth.signUp({ username: 'asta_fan', email: 'asta@ejemplo.com', password: 'abc12345' });
  assert.equal(res.ok, true);
  assert.deepEqual(backend.profiles.get(auth.get().uid), { id: auth.get().uid, username: 'asta_fan' });
});

test('sign-up with email confirmation on asks the user to confirm', async () => {
  const backend = makeBackend();
  backend.flags.confirmEmail = true;
  const { auth } = makeContext(backend);
  const res = await auth.signUp({ username: 'asta_fan', email: 'asta@ejemplo.com', password: 'abc12345' });
  assert.equal(res.ok, true);
  assert.equal(res.needsConfirmation, true);
  assert.match(res.message, /confirmarla/);
  assert.equal(auth.get().kind, 'guest');
});

test('sign-up rejects a duplicate email', async () => {
  const backend = makeBackend();
  const { auth } = makeContext(backend);
  await auth.signUp({ username: 'asta_fan', email: 'asta@ejemplo.com', password: 'abc12345' });
  const res = await auth.signUp({ username: 'otro_fan', email: 'asta@ejemplo.com', password: 'abc12345' });
  assert.equal(res.ok, false);
  assert.match(res.message, /ya tiene una cuenta/);
});

test('sign-in restores the username; wrong password fails', async () => {
  const backend = makeBackend();
  const { auth } = makeContext(backend);
  await auth.signUp({ username: 'asta_fan', email: 'asta@ejemplo.com', password: 'abc12345' });
  await auth.signOut();
  assert.equal(auth.get().kind, 'guest');
  const bad = await auth.signIn({ email: 'asta@ejemplo.com', password: 'wrong999' });
  assert.equal(bad.ok, false);
  assert.match(bad.message, /incorrectos/);
  const ok = await auth.signIn({ email: 'asta@ejemplo.com', password: 'abc12345' });
  assert.equal(ok.ok, true);
  assert.equal(ok.name, 'asta_fan');
  assert.equal(auth.get().kind, 'account');
});

test('password reset sends the email and never reveals unknown accounts', async () => {
  const backend = makeBackend();
  const { auth } = makeContext(backend);
  await auth.signUp({ username: 'asta_fan', email: 'asta@ejemplo.com', password: 'abc12345' });
  const ok = await auth.resetPassword('asta@ejemplo.com');
  assert.equal(ok.ok, true);
  assert.match(ok.message, /correo para restablecer/);
  const ghost = await auth.resetPassword('nadie@ejemplo.com');
  assert.equal(ghost.ok, true);
  assert.match(ghost.message, /Si ese correo tiene una cuenta/);
  assert.deepEqual(backend.calls.resetEmails, ['asta@ejemplo.com', 'nadie@ejemplo.com']);
});

test('update password works for a signed-in account', async () => {
  const backend = makeBackend();
  const { auth } = makeContext(backend);
  await auth.signUp({ username: 'asta_fan', email: 'asta@ejemplo.com', password: 'abc12345' });
  const res = await auth.updatePassword('nueva1234');
  assert.equal(res.ok, true);
  assert.match(res.message, /actualizada/);
  await auth.signOut();
  const login = await auth.signIn({ email: 'asta@ejemplo.com', password: 'nueva1234' });
  assert.equal(login.ok, true);
});

test('requireAccount blocks guests with a login prompt and allows accounts', async () => {
  const backend = makeBackend();
  const { auth, elements } = makeContext(backend);
  assert.equal(auth.isAccount(), false);
  assert.equal(auth.requireAccount('guardar este anime en Mi lista'), false);
  assert.equal(elements.get('auth-dialog').open, true);
  assert.match(elements.get('auth-message').textContent, /Inicia sesión/);
  await auth.signUp({ username: 'asta_fan', email: 'asta@ejemplo.com', password: 'abc12345' });
  assert.equal(auth.requireAccount('guardar este anime en Mi lista'), true);
});

test('session is restored from Supabase on a fresh page load', async () => {
  const backend = makeBackend();
  const first = makeContext(backend);
  await first.auth.signUp({ username: 'asta_fan', email: 'asta@ejemplo.com', password: 'abc12345' });
  // Fresh page: new JS context, empty localStorage, same Supabase session.
  const second = makeContext(backend);
  await tick(50);
  assert.equal(second.auth.get().kind, 'account');
  assert.equal(second.auth.get().name, 'asta_fan');
});

test('recovery link opens the new-password form', async () => {
  const backend = makeBackend();
  const { elements } = makeContext(backend, undefined, '#access_token=tok&type=recovery');
  await tick(25);
  assert.equal(elements.get('auth-dialog').open, true);
  assert.equal(elements.get('auth-new-password-form').hidden, false);
  assert.equal(elements.get('auth-login-form').hidden, true);
  assert.match(elements.get('auth-message').textContent, /nueva contraseña/);
});

test('without Supabase configured, sign-up explains the missing setup', async () => {
  const backend = makeBackend();
  const { auth } = makeContext(backend, null);
  const res = await auth.signUp({ username: 'asta_fan', email: 'asta@ejemplo.com', password: 'abc12345' });
  assert.equal(res.ok, false);
  assert.match(res.message, /propietario debe crear el proyecto Supabase/);
});

test('no Google sign-in and no Firebase code remains', () => {
  const codeFiles = ['auth.js', 'supabase-config.js', 'social-backend.js', 'community.js',
    'episode-comments.js', 'moderacion.js', 'experience.js',
    'supabase-episode-backend.js', 'studio.js', 'index.html', 'studio.html',
    'comunidad.html', 'moderacion.html', 'preview-kokomi.html',
    'preview-kokomi-mobile.html', 'preview-october.html',
    'supabase/sql/oneup_auth.sql', 'supabase/sql/oneup_community.sql',
    'supabase/sql/oneup_storage.sql', 'supabase/sql/oneup_community_optional.sql'];
  const forbidden = ['GoogleAuthProvider', 'signInWithPopup', 'signInWithRedirect',
    'signInWithOAuth', 'google-login', 'OneUpGoogle', 'loginWithGoogle', 'auth-google',
    'signInAnonymously', 'firebase', 'Firebase', 'firestore', 'Firestore',
    'gstatic.com/firebasejs', 'ONEUP_FIREBASE_CONFIG', 'FIREBASE_SDK_VERSION'];
  for (const file of codeFiles) {
    const text = fs.readFileSync(path.join(repo, file), 'utf8');
    for (const bad of forbidden) {
      assert.equal(text.includes(bad), false, `${file} still contains ${bad}`);
    }
  }
  // The word Google may only appear in "no Google" statements (docs/setup notes).
  for (const file of ['auth.js', 'social-backend.js', 'supabase-episode-backend.js']) {
    const text = fs.readFileSync(path.join(repo, file), 'utf8');
    assert.equal(/Google/.test(text), false, `${file} still mentions Google`);
  }
  for (const gone of ['auth-google.js', 'firebase-config.js', 'GOOGLE_LOGIN_SETUP.md',
    'auth-config.js', 'social-config.js', 'firebase.json', 'firestore.rules',
    'firestore.indexes.json', 'storage.rules', 'FIREBASE_COMUNIDAD_SETUP.md',
    'docs/AUTH_SETUP.md', 'tests/auth-emulator.test.mjs', 'scripts/run-auth-emulator.sh']) {
    assert.equal(fs.existsSync(path.join(repo, gone)), false, `${gone} should be deleted`);
  }
  assert.equal(fs.existsSync(path.join(repo, 'functions')), false, 'functions/ should be deleted');
  assert.equal(fs.existsSync(path.join(repo, 'docs', 'SUPABASE_SETUP.md')), true);
  assert.match(fs.readFileSync(path.join(repo, 'docs', 'SUPABASE_SETUP.md'), 'utf8'), /Email/);
  assert.equal(fs.existsSync(path.join(repo, '.env.example')), true);
  const config = fs.readFileSync(path.join(repo, 'supabase-config.js'), 'utf8');
  assert.match(config, /ONEUP_SUPABASE_CONFIG/);
  assert.match(config, /ONEUP_SUPABASE_CONFIG = null/,
    'supabase-config.js must keep a null placeholder, never a real key');
  const authSql = fs.readFileSync(path.join(repo, 'supabase/sql/oneup_auth.sql'), 'utf8');
  assert.match(authSql, /create table if not exists public\.profiles/);
  assert.match(authSql, /oneup_handle_new_user/);
  assert.match(authSql, /unique/);
});
