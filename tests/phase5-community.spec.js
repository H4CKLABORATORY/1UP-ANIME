/* 1UP Anime — Phase 5: multimedia community moderation flow, browser E2E
 * against the REAL local Supabase stack (`supabase start` +
 * `supabase functions serve`). If the stack is not running, every test is
 * skipped (not faked), exactly like tests/auth-supabase.test.mjs.
 *
 * How the browser reaches the local stack without touching the committed
 * config: supabase-config.js stays `null` in the repo. This spec intercepts
 * that one request in the test browser and answers it with the LOCAL stack
 * config (local-dev publishable key only, same one auth-supabase.test.mjs
 * uses), pointing at an HTTPS reverse proxy started by this spec
 * (https://127.0.0.1:54421 -> http://127.0.0.1:54321) because the site
 * code only accepts https Supabase URLs. Test media are tiny synthetic
 * PNG/GIF buffers generated here — no external or protected content.
 */
const { test, expect } = require('@playwright/test');
const http = require('node:http');
const https = require('node:https');
const net = require('node:net');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const API = 'http://127.0.0.1:54321';
const ANON = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';
const PROXY_PORT = 54421;
const PASSWORD = 'abc12345';

const stamp = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64');
const GIF_1PX = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

let stackIsUp = false;
let proxy = null;
const users = {};

async function stackUp() {
  try {
    const res = await fetch(`${API}/auth/v1/health`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch { return false; }
}

function startProxy() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oneup-p5-'));
  const key = path.join(dir, 'key.pem');
  const crt = path.join(dir, 'crt.pem');
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes',
    '-keyout', key, '-out', crt, '-days', '2', '-subj', '/CN=127.0.0.1',
    '-addext', 'subjectAltName=IP:127.0.0.1'], { stdio: 'ignore' });
  const server = https.createServer(
    { key: fs.readFileSync(key), cert: fs.readFileSync(crt) },
    (req, res) => {
      const headers = { ...req.headers, host: '127.0.0.1:54321' };
      // Local-stack quirk (documented in tests/auth-supabase.test.mjs): the
      // local PostgREST does not translate the sb_publishable_ key sent as a
      // Bearer token and answers 401 PGRST301. supabase-js sends exactly
      // that for anonymous reads, so the proxy drops that one header and
      // the request reaches PostgREST as the anon role (apikey only) —
      // the same seam the API tests use. Real user JWTs pass untouched.
      if (headers.authorization === `Bearer ${ANON}`) delete headers.authorization;
      const up = http.request({
        host: '127.0.0.1', port: 54321, path: req.url, method: req.method,
        headers,
      }, (upRes) => { res.writeHead(upRes.statusCode, upRes.headers); upRes.pipe(res); });
      up.on('error', () => { res.writeHead(502); res.end(); });
      req.pipe(up);
    });
  server.on('upgrade', (req, socket, head) => {
    const up = net.connect(54321, '127.0.0.1', () => {
      const lines = [`${req.method} ${req.url} HTTP/1.1`];
      for (let i = 0; i < req.rawHeaders.length; i += 2) {
        lines.push(`${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}`);
      }
      up.write(lines.join('\r\n') + '\r\n\r\n');
      if (head && head.length) up.write(head);
      up.pipe(socket); socket.pipe(up);
    });
    up.on('error', () => socket.destroy());
  });
  return new Promise((resolve) => server.listen(PROXY_PORT, '127.0.0.1', () => resolve(server)));
}

async function newCommunityContext(browser) {
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  await context.route('**/supabase-config.js', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: `window.ONEUP_SUPABASE_CONFIG={url:'https://127.0.0.1:${PROXY_PORT}',publishableKey:'${ANON}'};`,
  }));
  return context;
}

async function signUpViaUi(page, username, email) {
  await page.goto('/comunidad.html');
  await page.locator('#c-login').click();
  await page.locator('#c-toggle-signup').click();
  await page.locator('#c-signup-username').fill(username);
  await page.locator('#c-signup-email').fill(email);
  await page.locator('#c-signup-password').fill(PASSWORD);
  await page.locator('#c-signup-form button[type=submit]').click();
  await expect(page.locator('#c-login')).toHaveText(username, { timeout: 20000 });
}

async function loginViaUi(page, email) {
  await page.goto('/comunidad.html');
  await page.locator('#c-login').click();
  await page.locator('#c-login-email').fill(email);
  await page.locator('#c-login-password').fill(PASSWORD);
  await page.locator('#c-login-form button[type=submit]').click();
  await expect(page.locator('#c-auth-dialog')).toBeHidden({ timeout: 20000 });
}

async function rest(table, { token = null, query = '' } = {}) {
  const res = await fetch(`${API}/rest/v1/${table}${query}`, {
    headers: { apikey: ANON, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  return { status: res.status, json: await res.json().catch(() => ({})) };
}

async function signInToken(email) {
  const res = await fetch(`${API}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  const json = await res.json();
  return json.access_token;
}

test.beforeAll(async () => {
  stackIsUp = await stackUp();
  if (!stackIsUp) return;
  proxy = await startProxy();
  // Moderator/owner: created through the real Auth API, then granted the
  // owner role directly in the local database (the documented bootstrap).
  const s = stamp();
  const username = ('mod_' + s).slice(0, 20);
  const email = `mod_${s}@ejemplo.com`;
  const res = await fetch(`${API}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: ANON, 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD, data: { username } }),
  });
  const json = await res.json();
  if (!json.user?.id) throw new Error('moderator signup failed: ' + JSON.stringify(json));
  execFileSync('psql', ['-h', '127.0.0.1', '-p', '54322', '-U', 'postgres', '-d', 'postgres',
    '-v', 'ON_ERROR_STOP=1', '-c',
    `insert into public.oneup_admin_roles (user_id, role) values ('${json.user.id}', 'owner');`],
    { env: { ...process.env, PGPASSWORD: 'postgres' }, stdio: 'pipe' });
  users.mod = { username, email, id: json.user.id };
});

test.afterAll(async () => {
  if (!proxy) return;
  proxy.closeAllConnections?.();
  await Promise.race([
    new Promise((r) => proxy.close(r)),
    new Promise((r) => setTimeout(r, 3000)),
  ]);
});

test('phase5: full loop — quarantine, approve, comment, react, report, hide', async ({ browser }) => {
  test.skip(!stackIsUp, 'Local Supabase stack is not running (supabase start)');
  test.setTimeout(300000);
  const s = stamp();
  const postText = 'Debate sintetico fase5 ' + s;
  const replyText = 'Respuesta sintetica fase5 ' + s;
  users.a = { username: ('autor' + s).slice(0, 20), email: `autor_${s}@ejemplo.com` };
  users.b = { username: ('fanb' + s).slice(0, 20), email: `fanb_${s}@ejemplo.com` };

  // --- User A signs up in the browser and posts with a synthetic PNG. ---
  const ctxA = await newCommunityContext(browser);
  const pageA = await ctxA.newPage();
  pageA.on('dialog', (d) => d.accept('Contenido inapropiado'));
  await signUpViaUi(pageA, users.a.username, users.a.email);
  await pageA.locator('#c-compose').click();
  await pageA.locator('#post-text').fill(postText);
  await pageA.locator('#post-media').setInputFiles({
    name: 'sintetico.png', mimeType: 'image/png', buffer: PNG_1PX,
  });
  // Guarded local preview: the image renders locally before any submit.
  await expect(pageA.locator('#post-media-preview img')).toBeVisible();
  await pageA.locator('#post-form button[type=submit]').click();
  await expect(pageA.locator('#post-result')).toContainText('pendiente de revisión', { timeout: 20000 });

  // --- Quarantine: anonymous visitors and user B cannot see the post. ---
  const ctxAnon = await newCommunityContext(browser);
  const pageAnon = await ctxAnon.newPage();
  await pageAnon.goto('/comunidad.html');
  await expect(pageAnon.locator('#feed-list')).not.toContainText(postText, { timeout: 20000 });
  const anonRest = await rest('oneup_community_posts', { query: `?text=eq.${encodeURIComponent(postText)}&select=id,status` });
  expect(anonRest.json).toEqual([]);

  const ctxB = await newCommunityContext(browser);
  const pageB = await ctxB.newPage();
  pageB.on('dialog', (d) => d.accept('Contenido inapropiado en la publicacion'));
  await signUpViaUi(pageB, users.b.username, users.b.email);
  await pageB.reload();
  await expect(pageB.locator('#feed-list')).not.toContainText(postText, { timeout: 20000 });

  // --- Moderator approves from the real dashboard UI. ---
  const ctxM = await newCommunityContext(browser);
  const pageM = await ctxM.newPage();
  pageM.on('dialog', (d) => d.accept());
  await loginViaUi(pageM, users.mod.email);
  await pageM.goto('/moderacion.html');
  await expect(pageM.locator('#admin-dashboard')).toBeVisible({ timeout: 20000 });
  const pendingCard = pageM.locator('#mod-posts .mod-card', { hasText: postText });
  await expect(pendingCard).toBeVisible({ timeout: 20000 });
  await expect(pendingCard.locator('img')).toHaveCount(1); // moderator media preview
  await pendingCard.locator('button[data-decision="approve"]').click();
  await expect(pageM.locator('#mod-posts')).not.toContainText(postText, { timeout: 20000 });

  // --- Now the post is public, with its image rendered. ---
  await pageAnon.reload();
  await expect(pageAnon.locator('#feed-list')).toContainText(postText, { timeout: 20000 });
  const cardAnon = pageAnon.locator('.c-feed-card', { hasText: postText });
  await expect(cardAnon.locator('.c-media img')).toHaveCount(1, { timeout: 20000 });

  // --- User B replies and reacts. ---
  await pageB.reload();
  const cardB = pageB.locator('.c-feed-card', { hasText: postText });
  await expect(cardB).toBeVisible({ timeout: 20000 });
  await cardB.locator('[data-reply]').click();
  await pageB.locator('#reply-text').fill(replyText);
  await pageB.locator('#reply-form button[type=submit]').click();
  await expect(pageB.locator('#reply-state')).toContainText('Respuesta publicada', { timeout: 20000 });
  // Reopening the conversation re-reads it over REST. (Live push uses
  // Supabase Realtime; the local stack does not translate the publishable
  // key for realtime either — same documented local quirk as REST — so
  // this spec verifies reads on open/reload instead of push timing.)
  await pageB.locator('#c-reply-close').click();
  await cardB.locator('[data-reply]').click();
  await expect(pageB.locator('#reply-list')).toContainText(replyText, { timeout: 20000 });
  await pageB.locator('#c-reply-close').click();
  // The like handler is fire-and-forget in the page, so wait for the real
  // RPC response before reloading (a reload would abort it in flight).
  const rpcDone = pageB.waitForResponse(
    (r) => r.url().includes('toggle_community_reaction') && r.status() === 200,
    { timeout: 20000 });
  await cardB.locator('[data-like]').click();
  await rpcDone;
  await pageB.reload();
  const cardB2 = pageB.locator('.c-feed-card', { hasText: postText });
  await expect(cardB2.locator('[data-like]')).toContainText('1', { timeout: 20000 });

  // --- B reports the post; A reports B's reply (separate users: the
  //     30 s report rate limit is per user). ---
  await cardB2.locator('[data-report]').click();
  await expect(pageB.locator('#c-info')).toContainText('Reporte enviado', { timeout: 20000 });
  await pageA.reload();
  await expect(pageA.locator('#feed-list')).toContainText(postText, { timeout: 20000 });
  const cardA = pageA.locator('.c-feed-card', { hasText: postText });
  await cardA.locator('[data-reply]').click();
  await expect(pageA.locator('#reply-list')).toContainText(replyText, { timeout: 20000 });
  await pageA.locator('#reply-list [data-report-reply]').click();
  await expect(pageA.locator('#reply-state')).toContainText('Reporte enviado', { timeout: 20000 });

  // --- Moderator reviews both reports and hides the reported reply. ---
  // The local database can hold pending reports from earlier runs, so the
  // cards are scoped to this run's post id (the report target).
  const found = await rest('oneup_community_posts', {
    query: `?text=eq.${encodeURIComponent(postText)}&select=id`,
  });
  const postId = found.json[0]?.id;
  expect(postId).toBeTruthy();
  await pageM.goto('/moderacion.html');
  await expect(pageM.locator('#admin-dashboard')).toBeVisible({ timeout: 20000 });
  const postReport = pageM.locator('#mod-reports .mod-card', { hasText: 'communityPost' })
    .filter({ hasText: postId });
  await expect(postReport).toBeVisible({ timeout: 20000 });
  await postReport.locator('button[data-report-value="resolved"]').click();
  await expect(postReport).toBeHidden({ timeout: 20000 });
  const replyReport = pageM.locator('#mod-reports .mod-card', { hasText: 'communityComment' })
    .filter({ hasText: postId });
  await expect(replyReport).toBeVisible({ timeout: 20000 });
  await replyReport.locator('button[data-remove-target]').click();
  await expect(replyReport).toBeHidden({ timeout: 20000 });

  // --- The hidden reply disappears from public reads; the post stays. ---
  await pageB.reload();
  const cardB3 = pageB.locator('.c-feed-card', { hasText: postText });
  await expect(cardB3).toBeVisible({ timeout: 20000 });
  await cardB3.locator('[data-reply]').click();
  await expect(pageB.locator('#reply-list')).not.toContainText(replyText, { timeout: 20000 });
  await expect(pageB.locator('#reply-list')).toContainText('Nadie ha comentado', { timeout: 20000 });

  await ctxA.close(); await ctxB.close(); await ctxM.close(); await ctxAnon.close();
});

test('phase5: media limits — wrong type and >5 MB rejected, GIF quarantined', async ({ browser }) => {
  test.skip(!stackIsUp, 'Local Supabase stack is not running (supabase start)');
  test.setTimeout(180000);
  // Self-sufficient user (created via the real Auth API, signed in via UI):
  const s = stamp();
  const userC = { username: ('fanc' + s).slice(0, 20), email: `fanc_${s}@ejemplo.com` };
  const made = await fetch(`${API}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: ANON, 'content-type': 'application/json' },
    body: JSON.stringify({ email: userC.email, password: PASSWORD, data: { username: userC.username } }),
  });
  expect((await made.json()).user?.id).toBeTruthy();
  const tokenB = await signInToken(userC.email);
  expect(tokenB).toBeTruthy();

  const ctxB = await newCommunityContext(browser);
  const pageB = await ctxB.newPage();
  await loginViaUi(pageB, userC.email);

  // Client layer the code controls (social-backend uploadCommunityFile):
  const client = await pageB.evaluate(async () => {
    const out = {};
    const backend = window.OneUpSocialBackend;
    const big = new File([new Uint8Array(6 * 1024 * 1024)], 'grande.png', { type: 'image/png' });
    try { await backend.uploadCommunityFile(big, 'draft-grande-1'); out.big = 'NO-RECHAZADO'; }
    catch (e) { out.big = e.message; }
    const bmp = new File([new Uint8Array(64)], 'foto.bmp', { type: 'image/bmp' });
    try { await backend.uploadCommunityFile(bmp, 'draft-bmp-0001'); out.bmp = 'NO-RECHAZADO'; }
    catch (e) { out.bmp = e.message; }
    const txt = new File(['texto plano'], 'nota.txt', { type: 'text/plain' });
    try { await backend.uploadCommunityFile(txt, 'draft-txt-0001'); out.txt = 'NO-RECHAZADO'; }
    catch (e) { out.txt = e.message; }
    return out;
  });
  expect(client.big).toMatch(/excede el límite de 5 MB/);
  expect(client.bmp).toMatch(/Solo se admiten/);
  expect(client.txt).toMatch(/Solo se admiten/);

  // Composer preview blocker for a wrong-type file:
  await pageB.locator('#c-compose').click();
  await pageB.locator('#post-media').setInputFiles({
    name: 'foto.bmp', mimeType: 'image/bmp', buffer: Buffer.from('BM-falso'),
  });
  await expect(pageB.locator('#post-media-preview')).toContainText('bloqueada');
  await expect(pageB.locator('#post-media')).toHaveAttribute('data-blocked', '1');

  // Server layer (Storage bucket policy), bypassing the browser client:
  const uid = (await rest('profiles', {
    token: tokenB, query: `?username=eq.${userC.username}&select=id`,
  })).json[0]?.id;
  expect(uid).toBeTruthy();
  const upBmp = await fetch(`${API}/storage/v1/object/post-uploads/postUploads/${uid}/srv-direct-1/media.bmp`, {
    method: 'POST',
    headers: { apikey: ANON, Authorization: `Bearer ${tokenB}`, 'content-type': 'image/bmp' },
    body: Buffer.from('BM-falso'),
  });
  expect(upBmp.status).toBeGreaterThanOrEqual(400);
  const upBig = await fetch(`${API}/storage/v1/object/post-uploads/postUploads/${uid}/srv-direct-2/media.png`, {
    method: 'POST',
    headers: { apikey: ANON, Authorization: `Bearer ${tokenB}`, 'content-type': 'image/png' },
    body: Buffer.alloc(26 * 1024 * 1024, 1),
  });
  expect(upBig.status).toBeGreaterThanOrEqual(400); // 25 MB bucket ceiling

  // A small GIF is accepted by every layer and its post stays quarantined:
  const gif = await pageB.evaluate(async (gifB64) => {
    const bytes = Uint8Array.from(atob(gifB64), (c) => c.charCodeAt(0));
    const backend = window.OneUpSocialBackend;
    const file = new File([bytes], 'sintetico.gif', { type: 'image/gif' });
    const mediaPath = await backend.uploadCommunityFile(file, 'draft-gif-fase5');
    const made = await backend.publishPost({
      text: 'GIF sintetico fase5 ' + Date.now().toString(36), kind: 'fanart', mediaPath,
    });
    return { mediaPath, id: made.id };
  }, GIF_1PX.toString('base64'));
  expect(gif.mediaPath).toMatch(/media\.gif$/);
  const own = await rest('oneup_community_posts', { token: tokenB, query: `?id=eq.${gif.id}&select=status` });
  expect(own.json[0]?.status).toBe('pending');
  const anon = await rest('oneup_community_posts', { query: `?id=eq.${gif.id}&select=id` });
  expect(anon.json).toEqual([]);

  await ctxB.close();
});
