import { test, expect } from '@playwright/test';

// NOTE: written against the demo UI but not yet run in CI. Run `npx playwright install` then `npm run test:e2e`.
test.describe('Precedent demo', () => {
  test('map renders contracts and copilot links precedents to the map', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('img', { name: /World map of contract awards/ })).toBeVisible();
    await page.getByRole('button', { name: 'How long will this tender take?' }).click();
    await expect(page.getByText(/Grounding check: \d+ of \d+ claims anchored/)).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: /precedents on the map/ }).click();
    await expect(page.locator('path.arc').first()).toBeVisible();
  });

  test('guardrail withholds an unsupported claim', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Ask the copilot').fill('Will standard documents guarantee no re-tender?');
    await page.getByRole('button', { name: 'Ask', exact: true }).click();
    await expect(page.getByText(/Withheld: No supporting passage/)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/1 withheld/)).toBeVisible();
  });

  test('citation chip opens the source passage', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Review the specification for gaps' }).click();
    await page.locator('.chip', { hasText: /^ICR SP/ }).first().click({ timeout: 10_000 });
    await expect(page.getByRole('dialog', { name: 'Source passage' })).toBeVisible();
  });

  test('learning loop raises the draft risk after new reports', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Trust and learning' }).click();
    await page.getByRole('tab', { name: 'Learning loop' }).click();
    await page.getByRole('button', { name: 'Ingest new reports' }).click();
    await expect(page.getByRole('button', { name: 'Run again' })).toBeVisible({ timeout: 15_000 });
  });

  test('changing the country keeps the current view', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Risk lab' }).click();
    await page.getByLabel('Country').selectOption('KEN');
    await expect(page.getByRole('heading', { name: 'Time to award' })).toBeVisible();
  });
});
