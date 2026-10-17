import { test, expect } from '@playwright/test';

for (const width of [1280, 390]) {
  test(`email confirmation focus and corrected validation at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.route('**/api/**', route => route.abort());
    await page.goto('/ops/comms/templates');
    await page.getByLabel('Template name', { exact: true }).fill('Authored update');
    await page.getByLabel('Subject', { exact: true }).fill('Update');
    await page.getByLabel('Message', { exact: true }).fill('Hello {{recipient_name}}');
    const newBlank = page.getByRole('button', { name: 'New blank template', exact: true });
    await newBlank.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Replace the current draft?' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Keep editing' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(newBlank).toBeFocused();
    await expect(page.getByLabel('Template name', { exact: true })).toHaveValue('Authored update');
    await page.getByLabel('Recipient email', { exact: true }).fill('invalid');
    await page.getByLabel('Recipient name', { exact: true }).fill('Recipient');
    await page.getByRole('button', { name: 'Download email draft', exact: true }).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await page.getByLabel('Recipient email', { exact: true }).fill('review@example.com');
    await expect(page.getByRole('alert')).toHaveCount(0);
    await page.getByLabel('Recipient name', { exact: true }).fill('\u007f');
    await page.getByRole('button', { name: 'Download email draft', exact: true }).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await page.getByLabel('Recipient name', { exact: true }).fill('Corrected recipient');
    await expect(page.getByRole('alert')).toHaveCount(0);
    const fileInput = page.getByLabel('Open template file');
    await fileInput.focus();
    await fileInput.setInputFiles({ name: 'template.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ formatVersion: 1, name: 'Imported update', subject: 'Imported', body: 'Authored wording' })) });
    await expect(dialog.getByRole('button', { name: 'Keep editing' })).toBeFocused();
    await dialog.getByRole('button', { name: 'Keep editing' }).click();
    await expect(fileInput).toBeFocused();
    await newBlank.click();
    await dialog.getByRole('button', { name: 'Replace current draft', exact: true }).click();
    await expect(page.getByLabel('Template name', { exact: true })).toBeFocused();
    await expect(page.getByLabel('Template name', { exact: true })).toHaveValue('');
  });
}
