const { test, expect } = require('@playwright/test');

for (const viewport of [{ width: 1920, height: 1080 }, { width: 390, height: 844 }]) {
  test(`profundidad y tarjetas: ${viewport.width}x${viewport.height}`, async ({ browser }) => {
    const context = await browser.newContext({ viewport, reducedMotion: 'no-preference' });
    const page = await context.newPage();
    const errors = [];
    page.on('console', message => {
      if (message.type() === 'error') errors.push(`console: ${message.text()}`);
    });
    page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));

    try {
      await page.addInitScript(() => localStorage.removeItem('oneup-depth-mode'));
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      const toggle = page.locator('#depth-toggle');
      await expect(page.locator('.header-right #depth-toggle')).toHaveCount(0);
      await page.locator('#km-open').click();
      await expect(toggle).toBeVisible();
      await expect(page.locator('#km-drawer .oneup-theme-drawer')).toBeVisible();
      await expect(toggle).toHaveText('3D');
      await expect(toggle).toHaveAttribute('aria-pressed', 'false');
      expect(await page.evaluate(() => localStorage.getItem('oneup-depth-mode'))).toBeNull();
      await expect(page.locator('body')).toHaveClass(/depth-off/);
      await toggle.click();
      await expect(toggle).toHaveClass(/active/);
      await expect(toggle).toHaveAttribute('aria-pressed', 'true');
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.locator('#km-open').click();
      await expect(toggle).toHaveClass(/active/);
      await expect(page.locator('body')).not.toHaveClass(/depth-off/);
      await expect(page.locator('body')).not.toHaveClass(/depth-off/);

      const card = page.locator('.anime-card:has([data-depth])').first();
      await expect(card).toBeVisible({ timeout: 30000 });
      await card.scrollIntoViewIfNeeded();
      const bounds = await card.boundingBox();
      expect(bounds).not.toBeNull();
      await page.mouse.move(bounds.x + bounds.width * 0.7, bounds.y + bounds.height * 0.35);
      await page.waitForTimeout(300);
      const transformed = await card.locator('[data-depth]').evaluateAll(elements =>
        elements.some(el => {
          const value = el.style.transform;
          return Boolean(value && value !== 'none');
        })
      );
      expect(transformed, 'CardDepthEngine should move at least one card layer').toBe(true);

      await toggle.click();
      await expect(page.locator('body')).toHaveClass(/depth-off/);
      await expect(toggle).not.toHaveClass(/active/);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.locator('#km-open').click();
      await expect(toggle).toHaveAttribute('aria-pressed', 'false');
      await expect(page.locator('body')).toHaveClass(/depth-off/);
      await page.waitForTimeout(150);
      const offTransforms = await page.locator('[data-depth]').evaluateAll(elements =>
        elements.map(el => ({ transform: el.style.transform, card: Boolean(el.closest('.anime-card')) }))
      );
      expect(offTransforms.length).toBeGreaterThan(0);
      expect(offTransforms.every(({ transform }) => !transform || transform === 'none')).toBe(true);
      expect(errors, 'Unexpected browser console/page errors').toEqual([]);
    } finally {
      await context.close();
    }
  });
}
