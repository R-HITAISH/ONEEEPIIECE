import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const mockSupabase = async (page: import('@playwright/test').Page) => {
  await page.route('https://security-test.supabase.co/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith('/auth/v1/')) return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ message: 'No session' }) });
    const rows = url.pathname.endsWith('/items') ? [{
      id: '00000000-0000-4000-8000-000000000001', name: 'Test piece', category: 'Shirts', size: 'M', condition: 'good condition',
      price_inr: 1000, description: 'A test piece', story: null, photos: [], status: 'available', brand: null,
      measurements: null, created_at: new Date().toISOString(), slug: 'test-piece', colour: 'As pictured', stock: 1, view_count: 0,
    }] : [];
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rows), headers: { 'content-range': `0-${Math.max(0, rows.length - 1)}/${rows.length}` } });
  });
};

test.beforeEach(async ({ page }) => { await mockSupabase(page); });
const visit = (page: import('@playwright/test').Page, path: string) => page.goto(path, { waitUntil: 'domcontentloaded' });

test('storefront routes render without browser console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  for (const [path, heading] of [['/', 'Every piece has a story.'], ['/shop', 'Shop'], ['/item/00000000-0000-4000-8000-000000000001', 'Test piece'], ['/bag', 'Bag'], ['/auth', 'Sign in']] as const) {
    await visit(page, path);
    await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test('unsafe returnTo values fall back to account after sign-in', async ({ page }) => {
  await page.route('https://security-test.supabase.co/auth/v1/token?grant_type=password', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ access_token: 'test-access-token', token_type: 'bearer', expires_in: 3600, refresh_token: 'test-refresh-token', user: { id: '00000000-0000-4000-8000-000000000002', aud: 'authenticated', role: 'authenticated', email: 'e2e@example.test', app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: {}, created_at: new Date().toISOString() } }),
  }));
  for (const value of ['https://evil.example', '//evil.example']) {
    await visit(page, `/auth?returnTo=${encodeURIComponent(value)}`);
    await page.getByRole('tab', { name: 'Email' }).click();
    await page.getByLabel('Email').fill('e2e@example.test');
    await page.getByLabel('Password').fill('correct-horse-battery');
    await page.getByRole('button', { name: 'Sign in with email' }).click();
    await expect(page).toHaveURL(/\/account$/);
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  }
});

test('production ignores data=worst fixture flag', async ({ page }) => {
  await visit(page, '/?data=worst');
  await expect(page.getByText('Sold Piece Example With A Reasonably Long Name')).toHaveCount(0);
  await expect(page.getByText('Flat 4B, Sai Krupa Apartments')).toHaveCount(0);
});

test('filled contact honeypot shows success without contacting Supabase', async ({ page }) => {
  let supabaseWrites = 0;
  page.on('request', (request) => { if (request.url().includes('supabase.co/rest/v1/contact_messages')) supabaseWrites += 1; });
  await visit(page, '/contact');
  await page.getByLabel('Name').fill('Test Shopper');
  await page.getByLabel('Email').fill('shopper@example.test');
  await page.getByLabel('Subject').fill('Question');
  await page.getByLabel('Message').fill('A sufficiently long message for the test.');
  await page.locator('input[name="website"]').evaluate((input: HTMLInputElement) => { input.value = 'bot'; });
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByRole('heading', { name: 'Message received' })).toBeVisible();
  expect(supabaseWrites).toBe(0);
});

for (const path of ['/', '/item/00000000-0000-4000-8000-000000000001']) {
  test(`axe accessibility scan: ${path}`, async ({ page }) => {
    await visit(page, path);
    if (path.startsWith('/item/')) await expect(page.getByRole('heading', { name: 'Test piece' })).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, JSON.stringify(results.violations.map(({ id, impact, nodes }) => ({ id, impact, count: nodes.length })))).toEqual([]);
  });
}
