import { test, expect } from '@playwright/test';
import { encode } from 'next-auth/jwt';

const DASHBOARD_ROUTES = [
  '/dashboard',
  '/dashboard/interests',
  '/dashboard/reward-pool',
  '/dashboard/verifications',
  '/dashboard/site-visits',
  '/dashboard/listings',
  '/dashboard/admin/users',
  '/dashboard/admin/agencies',
  '/dashboard/admin/trust',
  '/dashboard/admin/pricing',
  '/dashboard/admin/payouts',
  '/dashboard/admin/geo',
  '/dashboard/admin/payment-providers',
  '/dashboard/advertiser/billing'
];

async function buildSessionToken() {
  const secret = process.env.NEXTAUTH_SECRET ?? 'propad-dev-secret-do-not-use-in-prod';
  return encode({
    secret,
    token: {
      sub: 'test-user',
      role: 'ADMIN',
      apiAccessToken: 'test-access-token',
      name: 'Test Admin',
      email: 'admin@example.com'
    }
  });
}

test.describe('dashboard smoke routes', () => {
  test.beforeEach(async ({ context }) => {
    const token = await buildSessionToken();
    await context.addCookies([
      {
        name: 'next-auth.session-token',
        value: token,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax'
      }
    ]);
  });

  for (const route of DASHBOARD_ROUTES) {
    test(`loads ${route} without server error`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'domcontentloaded' });

      await expect(page.getByText('Aurora Command')).toBeVisible();
      await expect(page.getByText('We hit a snag')).toHaveCount(0);
      await expect(page.getByText('500 Internal Server Error')).toHaveCount(0);
      await expect(page.getByText('Preparing')).toHaveCount(0);
    });
  }
});
