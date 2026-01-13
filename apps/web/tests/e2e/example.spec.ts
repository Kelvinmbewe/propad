import { test, expect } from '@playwright/test';

test.describe('PropAd acceptance journeys', () => {
  test('homepage highlights zero-fee marketplace and links to listings', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /zero-fee property/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /browse listings/i })).toBeVisible();

    await page.getByRole('link', { name: /browse listings/i }).click();
    await expect(page).toHaveURL(/\/listings/);
  });

  test('listings feed renders a real empty state when no verified listings exist', async ({ page }) => {
    await page.goto('/listings?suburb=Borrowdale');

    await expect(page.getByRole('heading', { name: /featured zimbabwe property listings/i })).toBeVisible();
    await expect(page.getByText(/no listings yet/i)).toBeVisible();
  });
});
