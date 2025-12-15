// Backend Playwright config for unit tests
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: /\.spec\.ts$/,
  use: {
    // No browser needed for unit tests
  },
  // Run tests in parallel
  workers: 4,
});

