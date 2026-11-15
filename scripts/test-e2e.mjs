import { spawnSync } from 'node:child_process';

const env = { ...process.env, VITE_SUPABASE_URL: 'https://security-test.supabase.co', VITE_SUPABASE_ANON_KEY: 'e2e-public-test-key' };
for (const args of [['scripts/generate-sitemap.mjs'], ['node_modules/vite/bin/vite.js', 'build'], ['node_modules/@playwright/test/cli.js', 'test']]) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit', env });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
