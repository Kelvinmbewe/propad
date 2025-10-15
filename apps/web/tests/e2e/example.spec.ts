import { test, expect } from '@playwright/test';

test('homepage has hero text', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /zero-fee property/i })).toBeVisible();
});
