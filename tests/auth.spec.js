/* 1UP Anime — native account UI tests (email + password, no Google sign-in).
 * Runs against the local static server (see playwright.config.js).
 * No Supabase project is configured in this repo, so the live flows must
 * explain the missing setup instead of faking a sign-in.
 */
const { test, expect } = require('@playwright/test');

test.setTimeout(85000);
async function skipIntro(page) {
  await page.addInitScript(() => { try { sessionStorage.setItem('oneup-v3-opening-seen-v1', 'yes'); } catch {} });
}

test('native account dialog: login/signup/reset forms, no Google button', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await skipIntro(page);
  try {
    await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
    await page.locator('#auth-open').click({ timeout: 14000 });
    await expect(page.locator('#auth-dialog')).toBeVisible();
    await expect(page.locator('#auth-login-form')).toBeVisible();
    await expect(page.locator('#auth-signup-form')).toBeHidden();
    await expect(page.locator('#auth-reset-form')).toBeHidden();
    await expect(page.locator('#google-login')).toHaveCount(0);
    await expect(page.locator('#guest-login')).toBeEnabled();
    // Switch to sign-up.
    await page.locator('#auth-tab-signup').click();
    await expect(page.locator('#auth-signup-form')).toBeVisible();
    await expect(page.locator('#auth-login-form')).toBeHidden();
    // Invalid username -> client-side validation (works without Supabase).
    await page.locator('#auth-signup-username').fill('admin');
    await page.locator('#auth-signup-email').fill('asta@ejemplo.com');
    await page.locator('#auth-signup-password').fill('abc12345');
    await page.locator('#auth-signup-password2').fill('abc12345');
    await page.locator('#auth-signup-form button[type=submit]').click();
    await expect(page.locator('#auth-message')).toContainText('reservado');
    // Valid data but no Supabase project -> setup message, no fake success.
    await page.locator('#auth-signup-username').fill('asta_fan');
    await page.locator('#auth-signup-email').fill('asta@ejemplo.com');
    await page.locator('#auth-signup-password').fill('abc12345');
    await page.locator('#auth-signup-password2').fill('abc12345');
    await page.locator('#auth-signup-form button[type=submit]').click();
    await expect(page.locator('#auth-message')).toContainText('propietario debe crear el proyecto Supabase');
    // Password reset flow.
    await page.locator('#auth-tab-login').click();
    await page.locator('#auth-forgot').click();
    await expect(page.locator('#auth-reset-form')).toBeVisible();
    await page.locator('#auth-reset-email').fill('asta@ejemplo.com');
    await page.locator('#auth-reset-form button[type=submit]').click();
    await expect(page.locator('#auth-message')).toContainText('propietario debe crear el proyecto Supabase');
    expect(errors).toEqual([]);
  } finally { await context.close(); }
});

test('guest favorite requires a 1UP account', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await skipIntro(page);
  try {
    await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
    const save = page.locator('[data-save]').first();
    await save.waitFor({ state: 'visible', timeout: 60000 });
    await save.click({ timeout: 10000 });
    await expect(page.locator('#auth-dialog')).toBeVisible();
    await expect(page.locator('#auth-message')).toContainText('Inicia sesión para guardar este anime en Mi lista');
    expect(errors).toEqual([]);
  } finally { await context.close(); }
});

test('community login dialog offers native email/password access', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await skipIntro(page);
  try {
    await page.goto('/comunidad.html', { waitUntil: 'domcontentloaded' });
    await page.locator('#c-login').click({ timeout: 14000 });
    await expect(page.locator('#c-auth-dialog')).toBeVisible();
    await expect(page.locator('#c-login-form')).toBeVisible();
    await expect(page.locator('#c-signup-form')).toBeHidden();
    await expect(page.locator('#c-google')).toHaveCount(0);
    await page.locator('#c-toggle-signup').click();
    await expect(page.locator('#c-signup-form')).toBeVisible();
    await expect(page.locator('#c-signup-username')).toBeVisible();
    expect(errors).toEqual([]);
  } finally { await context.close(); }
});
