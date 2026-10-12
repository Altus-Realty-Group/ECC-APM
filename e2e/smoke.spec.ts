import { test, expect } from '@playwright/test';

test('root page renders without errors', async ({ page }) => {
  const errors: string[] = [];

  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console error: ${msg.text()}`);
  });

  await page.goto('/');

  // Ensure the #root element exists
  await expect(page.locator('#root')).toHaveCount(1);

  // Ensure something mounted inside #root
  const childCount = await page.evaluate(
    () => document.getElementById('root')?.childElementCount ?? 0
  );
  expect(childCount).toBeGreaterThan(0);

  // No runtime errors captured
  expect(errors, errors.join('\n')).toHaveLength(0);
});