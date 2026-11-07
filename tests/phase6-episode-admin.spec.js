/* 1UP Anime — Phase 6: licensed-episode admin E2E against the REAL local
 * Supabase stack (`supabase start`). If the stack is not running, every
 * test is skipped (not faked), exactly like Phase 5.
 *
 * Config seam (same as Phase 5): supabase-config.js stays `null` in the
 * repo; this spec intercepts that request in the test browser and answers
 * with the LOCAL stack config behind an HTTPS reverse proxy started here
 * (https://127.0.0.1:54431 -> http://127.0.0.1:54321), because the site
 * code only accepts https Supabase URLs.
 *
 * Flow under test: the owner signs in on admin-episodios.html, creates a
 * FILE-mode entry for the test anime mal-999006 pointing at the Phase 4
 * synthetic WebM fixture (own media, served by route interception under
 * fixtures.example.com — never catalog content, Rule 12), then opens the
 * anime detail page and the episode plays the fixture with NO deploy and
 * NO manual step in between. A non-admin account sees the admin page as
 * not-authorized. The detail page is served by a tiny GitHub-Pages-like
 * static server (unknown paths -> 404.html), like Phase 2's spec.
 */
const { test, expect } = require('@playwright/test');
const http = require('node:http');
const https = require('node:https');
const net = require('node:net');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const FIXTURES = path.join(ROOT, 'tests', 'fixtures');
const PORT = 8776;
const ORIGIN = 'http://127.0.0.1:' + PORT;
const API = 'http://127.0.0.1:54321';
const ANON = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';
const PROXY_PORT = 54431;
const PASSWORD = 'abc12345';
const ANIME_ID = 'mal-999006';
const FIXTURE_HOST = 'https://fixtures.example.com';
const MIMES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.webmanifest': 'application/manifest+json',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.vtt': 'text/vtt; charset=utf-8',
  '.woff2': 'font/woff2',
};
const stamp = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

let stackIsUp = false;
let proxy = null;
let server = null;
const users = {};

async function stackUp() {
  try {
    const res = await fetch(`${API}/auth/v1/health`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch { return false; }
}

function startProxy() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oneup-p6-'));
  const key = path.join(dir, 'key.pem');
  const crt = path.join(dir, 'crt.pem');
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes',
    '-keyout', key, '-out', crt, '-days', '2', '-subj', '/CN=127.0.0.1',
    '-addext', 'subjectAltName=IP:127.0.0.1'], { stdio: 'ignore' });
  const srv = https.createServer(
    { key: fs.readFileSync(key), cert: fs.readFileSync(crt) },
    (req, res) => {
      const headers = { ...req.headers, host: '127.0.0.1:54321' };
      // Same local-stack quirk as Phase 5: drop the publishable key sent
      // as Bearer so PostgREST treats the request as the anon role.
      if (headers.authorization === `Bearer ${ANON}`) delete headers.authorization;
      const up = http.request({
        host: '127.0.0.1', port: 54321, path: req.url, method: req.method, headers,
      }, (upRes) => { res.writeHead(upRes.statusCode, upRes.headers); upRes.pipe(res); });
      up.on('error', () => { res.writeHead(502); res.end(); });
      req.pipe(up);
    });
  srv.on('upgrade', (req, socket, head) => {
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
  return new Promise((resolve) => srv.listen(PROXY_PORT, '127.0.0.1', () => resolve(srv)));
}

function startSiteServer() {
  const srv = http.createServer((req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, ORIGIN).pathname);
      const file = path.resolve(ROOT, '.' + (pathname === '/' ? '/index.html' : pathname));
      if (file !== ROOT && !file.startsWith(ROOT + path.sep)) { res.writeHead(403).end(); return; }
      if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
        res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
        res.end(fs.readFileSync(path.join(ROOT, '404.html')));
        return;
      }
      res.writeHead(200, { 'content-type': MIMES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(fs.readFileSync(file));
    } catch { res.writeHead(500).end(); }
  });
  return new Promise((resolve) => srv.listen(PORT, '127.0.0.1', () => resolve(srv)));
}

async function newAdminContext(browser) {
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  await context.addInitScript(() => {
    try {
      sessionStorage.setItem('oneup-v3-opening-seen-v1', 'yes');
      sessionStorage.setItem('oneup_intro_seen', 'v5');
    } catch {}
  });
  await context.route('**/*', async (route) => {
    const url = route.request().url();
    if (url.includes('/supabase-config.js')) {
      return route.fulfill({
        contentType: 'application/javascript',
        body: `window.ONEUP_SUPABASE_CONFIG={url:'https://127.0.0.1:${PROXY_PORT}',publishableKey:'${ANON}'};`,
      });
    }
    if (url.startsWith(FIXTURE_HOST + '/')) {
      const rel = decodeURIComponent(new URL(url).pathname).replace(/^\//, '');
      const file = path.join(FIXTURES, rel);
      if (!file.startsWith(FIXTURES) || !fs.existsSync(file)) return route.fulfill({ status: 404, body: 'no fixture' });
      const bodyBuf = fs.readFileSync(file);
      const cors = { 'access-control-allow-origin': '*', 'access-control-expose-headers': 'Content-Length, Content-Range, Accept-Ranges' };
      const range = route.request().headers()['range'];
      const rm = range ? /bytes=(\d*)-(\d*)/.exec(range) : null;
      if (rm) {
        const start = rm[1] ? Number(rm[1]) : 0;
        const end = rm[2] ? Math.min(Number(rm[2]), bodyBuf.length - 1) : bodyBuf.length - 1;
        return route.fulfill({
          status: 206, body: bodyBuf.subarray(start, end + 1),
          headers: {
            'content-type': MIMES[path.extname(file)] || 'application/octet-stream',
            'content-range': 'bytes ' + start + '-' + end + '/' + bodyBuf.length,
            'accept-ranges': 'bytes', 'content-length': String(end - start + 1), ...cors,
          },
        });
      }
      return route.fulfill({
        status: 200, body: bodyBuf,
        headers: {
          'content-type': MIMES[path.extname(file)] || 'application/octet-stream',
          'accept-ranges': 'bytes', 'content-length': String(bodyBuf.length), ...cors,
        },
      });
    }
    if (url.startsWith(ORIGIN + '/')) return route.continue();
    // The local Supabase proxy itself must pass through untouched (the
    // catch-all below would otherwise abort the site's own API calls).
    if (url.startsWith(`https://127.0.0.1:${PROXY_PORT}/`)) return route.continue();
    if (url.includes('cdn.jsdelivr.net') || url.includes('fonts.g')) return route.continue();
    if (url.includes('graphql.anilist.co')) {
      const body = route.request().postData() || '';
      if (body.includes('OneUpDetail')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { Media: null } }) });
      }
      return route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ data: { Page: { pageInfo: { hasNextPage: false, currentPage: 1 }, media: [] }, Media: null } }),
      });
    }
    return route.abort();
  });
  return context;
}

async function signUpApi(username, email, role) {
  const res = await fetch(`${API}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: ANON, 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD, data: { username } }),
  });
  const json = await res.json();
  if (!json.user?.id) throw new Error('signup failed: ' + JSON.stringify(json));
  if (role) {
    execFileSync('psql', ['-h', '127.0.0.1', '-p', '54322', '-U', 'postgres', '-d', 'postgres',
      '-v', 'ON_ERROR_STOP=1', '-c',
      `insert into public.oneup_admin_roles (user_id, role) values ('${json.user.id}', '${role}')
       on conflict (user_id) do update set role = excluded.role;`],
      { env: { ...process.env, PGPASSWORD: 'postgres' }, stdio: 'pipe' });
  }
  return { username, email, id: json.user.id };
}

async function loginOnAdminPage(page, email) {
  await page.goto(ORIGIN + '/admin-episodios.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#admin-email').fill(email);
  await page.locator('#admin-password').fill(PASSWORD);
  await page.locator('#admin-login-form button[type=submit]').click();
}

test.beforeAll(async () => {
  server = await startSiteServer();
  stackIsUp = await stackUp();
  if (!stackIsUp) return;
  proxy = await startProxy();
  const s = stamp();
  users.owner = await signUpApi(('dueno' + s).slice(0, 20), `dueno_${s}@ejemplo.com`, 'owner');
  users.fan = await signUpApi(('fanp6' + s).slice(0, 20), `fanp6_${s}@ejemplo.com`, null);
  // No leftovers from a previous run may leak into this one.
  execFileSync('psql', ['-h', '127.0.0.1', '-p', '54322', '-U', 'postgres', '-d', 'postgres',
    '-v', 'ON_ERROR_STOP=1', '-c',
    `delete from public.oneup_licensed_media where anime_id = '${ANIME_ID}';`],
    { env: { ...process.env, PGPASSWORD: 'postgres' }, stdio: 'pipe' });
});

test.afterAll(async () => {
  if (stackIsUp) {
    try {
      execFileSync('psql', ['-h', '127.0.0.1', '-p', '54322', '-U', 'postgres', '-d', 'postgres',
        '-v', 'ON_ERROR_STOP=1', '-c',
        `delete from public.oneup_licensed_media where anime_id = '${ANIME_ID}';`],
        { env: { ...process.env, PGPASSWORD: 'postgres' }, stdio: 'pipe' });
    } catch {}
  }
  if (proxy) {
    proxy.closeAllConnections?.();
    await Promise.race([
      new Promise((r) => proxy.close(r)),
      new Promise((r) => setTimeout(r, 3000)),
    ]);
  }
  if (server) await new Promise((resolve) => server.close(resolve));
});

test('phase6: owner creates a licensed entry in the admin and it plays in the anime detail', async ({ browser }) => {
  test.skip(!stackIsUp, 'Local Supabase stack is not running (supabase start)');
  test.setTimeout(240000);
  const ctx = await newAdminContext(browser);
  const page = await ctx.newPage();
  page.on('dialog', (d) => d.accept());

  // --- Owner signs in and the dashboard opens. ---
  await loginOnAdminPage(page, users.owner.email);
  await expect(page.locator('#admin-dashboard')).toBeVisible({ timeout: 30000 });
  await expect(page.locator('#admin-status')).toContainText('propietario');
  // The static manifest is listed read-only, labelled as such.
  await expect(page.locator('#lm-static-list')).toContainText('estático', { timeout: 20000 });
  await expect(page.locator('#lm-static-list')).toContainText('mal-27947');

  // --- Owner creates the file-mode test entry. ---
  await page.locator('#lm-anime-id').fill(ANIME_ID);
  await page.locator('#lm-episode-number').fill('1');
  await page.locator('#lm-episode-title').fill('Fixture WebM fase 6');
  await page.locator('#lm-provider').fill('Fixture propio 1UP');
  await page.locator('#lm-mode').selectOption('file');
  await expect(page.locator('#lm-source-wrap')).toBeVisible();
  await page.locator('#lm-source-url').fill(FIXTURE_HOST + '/player-fixture.webm');
  await page.locator('#lm-quality').fill('180p');
  await page.locator('#lm-rights-status').selectOption('authorized');
  await page.locator('#lm-rights-note').fill('Fixture WebM sintético propio, generado para pruebas; sin contenido de terceros.');
  await page.locator('#lm-active').check();
  await page.locator('#lm-form').evaluate((f) => f.requestSubmit());
  await expect(page.locator('#lm-form-status')).toContainText('Entrada creada', { timeout: 20000 });
  await expect(page.locator('#lm-list')).toContainText(ANIME_ID, { timeout: 20000 });
  await expect(page.locator('#lm-list')).toContainText('ACTIVA');

  // --- The entry appears BY ITSELF in the anime detail and plays. ---
  await page.goto(ORIGIN + '/anime/' + ANIME_ID, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#anime-detail')).toBeVisible({ timeout: 30000 });
  const player = page.locator('#oneup-player-section');
  await expect(player).toBeVisible({ timeout: 30000 });
  await expect(player.locator('#oneup-watch-episode')).toBeVisible({ timeout: 30000 });
  const video = player.locator('video');
  await expect(video).toHaveCount(1, { timeout: 30000 });
  const state = await video.evaluate(async (v) => {
    v.muted = true;
    await v.play();
    return { paused: v.paused, readyState: v.readyState, duration: v.duration };
  });
  expect(state.paused).toBe(false);
  expect(state.readyState).toBeGreaterThanOrEqual(3);
  expect(state.duration).toBeGreaterThan(0);
  await ctx.close();
});

test('phase6: a non-admin account and a guest see the admin page as not-authorized', async ({ browser }) => {
  test.skip(!stackIsUp, 'Local Supabase stack is not running (supabase start)');
  test.setTimeout(180000);
  // Guest: login form only, dashboard never appears.
  const ctxGuest = await newAdminContext(browser);
  const guest = await ctxGuest.newPage();
  await guest.goto(ORIGIN + '/admin-episodios.html', { waitUntil: 'domcontentloaded' });
  await expect(guest.locator('#admin-login-form')).toBeVisible({ timeout: 30000 });
  await expect(guest.locator('#admin-dashboard')).toBeHidden();
  await expect(guest.locator('#admin-status')).toContainText('Acceso restringido');
  await ctxGuest.close();
  // Signed-in fan without a role: explicit denial, dashboard stays hidden.
  const ctxFan = await newAdminContext(browser);
  const fan = await ctxFan.newPage();
  fan.on('dialog', (d) => d.accept());
  await loginOnAdminPage(fan, users.fan.email);
  await expect(fan.locator('#admin-status')).toContainText('Acceso denegado', { timeout: 30000 });
  await expect(fan.locator('#admin-dashboard')).toBeHidden();
  await expect(fan.locator('#lm-form')).toBeHidden();
  await ctxFan.close();
});
