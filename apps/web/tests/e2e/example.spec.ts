import { test, expect } from '@playwright/test';

declare global {
  interface Window {
    __lastOpenedUrl?: string;
    __restoreOpen?: () => void;
  }
}

test.describe('PropAd acceptance journeys', () => {
  test('homepage highlights zero-fee marketplace and links to listings', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /zero-fee property/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /browse listings/i })).toBeVisible();

    await page.getByRole('link', { name: /browse listings/i }).click();
    await expect(page).toHaveURL(/\/listings/);
  });

  test('listings feed renders verified Harare properties from the mock API', async ({ page }) => {
    await page.goto('/listings?suburb=Borrowdale');

    await expect(page.getByRole('heading', { name: /featured zimbabwe property listings/i })).toBeVisible();
    await expect(page.locator('text=Borrowdale')).toBeVisible();
    await expect(page.locator('text=Verified').first()).toBeVisible();
    await expect(page.locator('text=US\$480')).toBeVisible();
    await expect(page.locator("text=You've reached the end of the listings.")).toBeVisible();
  });

  test('property detail page generates a trackable WhatsApp handoff', async ({ page }) => {
    await page.addInitScript(() => {
      window.__lastOpenedUrl = undefined;
      const originalOpen = window.open;
      window.open = ((url?: string | URL | undefined) => {
        window.__lastOpenedUrl = String(url ?? '');
        return null as unknown as Window;
      }) as typeof window.open;
      window.__restoreOpen = () => {
        window.open = originalOpen;
      };
    });

    await page.goto('/listings/prop-harare-002');

    await expect(page.getByRole('heading', { name: /townhouse/i })).toBeVisible();
    await expect(page.locator('text=US\$520')).toBeVisible();

    await page.getByRole('button', { name: /message on whatsapp/i }).click();

    await expect(page.locator('text=Sharing URL:')).toBeVisible();
    const openedUrl = await page.waitForFunction(() => window.__lastOpenedUrl);
    expect(await openedUrl.jsonValue()).toContain('https://wa.me/');

    await page.evaluate(() => {
      if (typeof window.__restoreOpen === 'function') {
        window.__restoreOpen();
      }
    });
  });
});

export {};
