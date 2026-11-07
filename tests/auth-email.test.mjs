/* 1UP Anime — native account tests (email + password, no Google sign-in).
 * Runs auth.js in a vm with stubbed DOM/storage and a fake Firebase backend
 * injected through the window.__ONEUP_FIREBASE_LOADER__ seam.
 * Live Firebase is NOT used here; see tests/auth-emulator.test.mjs for the
 * real Auth/Firestore emulator run.
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
  const docs = new Map();
  const calls = { resetEmails: [], deletedUids: [], persistence: [] };
  const flags = { raceUsername: null };
  let uidSeq = 0;
  let currentUser = null;
  const listeners = new Set();
  const notify = () => { for (const cb of listeners) { try { cb(currentUser); } catch { /* ignore */ } } };
  const snap = (p) => ({ exists: () => docs.has(p), data: () => docs.get(p) });
  const fakeAuthObj = { get currentUser() { return currentUser; } };
  const authMod = {
    browserLocalPersistence: 'local',
    getAuth: () => fakeAuthObj,
    setPersistence: async (_a, p) => { calls.persistence.push(p); },
    onAuthStateChanged: (_a, cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    authStateReady: async () => {},
    createUserWithEmailAndPassword: async (_a, email, password) => {
      if (usersByEmail.has(email)) {
        throw Object.assign(new Error('email in use'), { code: 'auth/email-already-in-use' });
      }
      const user = { uid: 'uid' + (++uidSeq), email, password, displayName: null };
      usersByEmail.set(email, user);
      currentUser = user;
      notify();
      return { user };
    },
    signInWithEmailAndPassword: async (_a, email, password) => {
      const user = usersByEmail.get(email);
      if (!user || user.password !== password) {
        throw Object.assign(new Error('bad credentials'), { code: 'auth/invalid-credential' });
      }
      currentUser = user;
      notify();
      return { user };
    },
    sendPasswordResetEmail: async (_a, email) => {
      calls.resetEmails.push(email);
      if (!usersByEmail.has(email)) {
        throw Object.assign(new Error('no such user'), { code: 'auth/user-not-found' });
      }
    },
    signOut: async () => { currentUser = null; notify(); },
    updateProfile: async (user, patch) => { Object.assign(user, patch); },
    deleteUser: async (user) => {
      for (const [email, u] of usersByEmail) if (u.uid === user.uid) usersByEmail.delete(email);
      calls.deletedUids.push(user.uid);
      if (currentUser && currentUser.uid === user.uid) { currentUser = null; notify(); }
    },
  };
  const dbMod = {
    getFirestore: () => ({ __db: true }),
    doc: (_db, ...segs) => ({ path: segs.join('/') }),
    getDoc: async (ref) => snap(ref.path),
    runTransaction: async (_db, fn) => {
      if (flags.raceUsername) {
        docs.set('usernames/' + flags.raceUsername, { uid: 'uid-other', username: flags.raceUsername });
      }
      const tx = {
        get: async (ref) => snap(ref.path),
        set: (ref, data) => { docs.set(ref.path, { ...data }); },
      };
      await fn(tx);
    },
    serverTimestamp: () => 'TS',
  };
  const appMod = { getApps: () => [], initializeApp: () => ({}) };
  const loader = async () => ({ app: appMod, auth: authMod, db: dbMod, instance: {} });
  return {
    usersByEmail, docs, calls, flags, loader,
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

function makeContext(backend, config = { apiKey: 'fake', authDomain: 'demo.firebaseapp.com', projectId: 'demo', appId: '1:1:web:x' }) {
  const elements = new Map();
  const domReady = [];
  const store = new Map();
  const sandbox = {
    console,
    setTimeout, clearTimeout,
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
  sandbox.window.ONEUP_FIREBASE_CONFIG = config;
  sandbox.window.__ONEUP_FIREBASE_LOADER__ = backend.loader;
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
  assert.equal(auth.FIREBASE_SDK_VERSION, '12.19.0');
});

test('sign-up creates the account and claims the username in Firestore', async () => {
  const backend = makeBackend();
  const { auth } = makeContext(backend);
  const res = await auth.signUp({ username: 'Asta_Fan', email: 'asta@ejemplo.com', password: 'abc12345' });
  assert.equal(res.ok, true);
  assert.equal(res.name, 'asta_fan');
  const me = auth.get();
  assert.equal(me.kind, 'account');
  assert.equal(me.name, 'asta_fan');
  assert.equal(me.email, 'asta@ejemplo.com');
  assert.deepEqual(backend.docs.get('usernames/asta_fan'), { uid: me.uid, username: 'asta_fan', createdAt: 'TS' });
  assert.deepEqual(backend.docs.get('users/' + me.uid), { uid: me.uid, username: 'asta_fan', createdAt: 'TS' });
  assert.deepEqual(backend.calls.persistence, ['local']);
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

test('sign-up race on the username deletes the orphan Auth user', async () => {
  const backend = makeBackend();
  const { auth } = makeContext(backend);
  backend.flags.raceUsername = 'yuno_fan';
  const res = await auth.signUp({ username: 'yuno_fan', email: 'yuno@ejemplo.com', password: 'abc12345' });
  assert.equal(res.ok, false);
  assert.match(res.message, /ya está en uso/);
  assert.equal(backend.usersByEmail.size, 0);
  assert.equal(backend.calls.deletedUids.length, 1);
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

test('session is restored from Firebase on a fresh page load', async () => {
  const backend = makeBackend();
  const first = makeContext(backend);
  await first.auth.signUp({ username: 'asta_fan', email: 'asta@ejemplo.com', password: 'abc12345' });
  // Fresh page: new JS context, empty localStorage, same Firebase session.
  const second = makeContext(backend);
  await tick(50);
  assert.equal(second.auth.get().kind, 'account');
  assert.equal(second.auth.get().name, 'asta_fan');
});

test('without Firebase configured, sign-up explains the missing setup', async () => {
  const backend = makeBackend();
  const { auth } = makeContext(backend, null);
  const res = await auth.signUp({ username: 'asta_fan', email: 'asta@ejemplo.com', password: 'abc12345' });
  assert.equal(res.ok, false);
  assert.match(res.message, /propietario debe crear el proyecto Firebase/);
});

test('no Google sign-in code remains; Firebase SDK version is unified', () => {
  const codeFiles = ['auth.js', 'auth-config.js', 'social-backend.js', 'community.js',
    'episode-comments.js', 'functions/index.js', 'moderacion.js', 'experience.js',
    'supabase-episode-backend.js', 'studio.js', 'index.html', 'studio.html',
    'comunidad.html', 'moderacion.html', 'preview-kokomi.html',
    'preview-kokomi-mobile.html', 'preview-october.html', 'firestore.rules', 'storage.rules'];
  const forbidden = ['GoogleAuthProvider', 'signInWithPopup', 'signInWithRedirect',
    'signInWithOAuth', 'google-login', 'OneUpGoogle', 'loginWithGoogle', 'auth-google',
    'Google', 'google.com'];
  for (const file of codeFiles) {
    const text = fs.readFileSync(path.join(repo, file), 'utf8')
      .replaceAll('console.firebase.google.com', '');
    for (const bad of forbidden) {
      assert.equal(text.includes(bad), false, `${file} still contains ${bad}`);
    }
  }
  for (const gone of ['auth-google.js', 'firebase-config.js', 'GOOGLE_LOGIN_SETUP.md']) {
    assert.equal(fs.existsSync(path.join(repo, gone)), false, `${gone} should be deleted`);
  }
  for (const file of ['auth.js', 'social-backend.js']) {
    const text = fs.readFileSync(path.join(repo, file), 'utf8');
    assert.match(text, /12\.19\.0/);
    assert.equal(text.includes('11.10.0'), false, `${file} still uses Firebase 11.10.0`);
  }
  const rules = fs.readFileSync(path.join(repo, 'firestore.rules'), 'utf8');
  assert.match(rules, /match \/usernames\/\{username\}/);
  assert.match(rules, /match \/users\/\{uid\}/);
  const storage = fs.readFileSync(path.join(repo, 'storage.rules'), 'utf8');
  assert.match(storage, /sign_in_provider == 'password'/);
  assert.equal(fs.existsSync(path.join(repo, 'docs', 'AUTH_SETUP.md')), true);
  assert.match(fs.readFileSync(path.join(repo, 'docs', 'AUTH_SETUP.md'), 'utf8'), /Email\/Password/);
  assert.equal(fs.existsSync(path.join(repo, '.env.example')), true);
});
