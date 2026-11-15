import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 15_000,
  workers: 1,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:48327', ...devices['Desktop Chrome'] },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 48327 --strictPort',
    url: 'http://127.0.0.1:48327',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    env: { VITE_SUPABASE_URL: 'https://security-test.supabase.co', VITE_SUPABASE_ANON_KEY: 'e2e-public-test-key' },
  },
});
