// src/tests/dashboard.csv.e2e.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Business Dashboard CSV handling', () => {
  test('uploading a valid CSV shows headers and preview', async ({ page }) => {
    await page.goto('/');

    const fileInput = page.locator('input[type="file"]'); // hidden input :contentReference[oaicite:3]{index=3}
    const content = 'id,price,rating\n1,10,4.5\n2,20,4.0\n';

    await fileInput.setInputFiles({
      name: 'products.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(content),
    });

    await expect(page.getByText('Detected Headers (3)')).toBeVisible();
    await expect(page.getByText('Successfully Parsed Rows')).toBeVisible();
  });



  test('large CSV file is processed without crashing UI', async ({ page }) => {
    await page.goto('/');

    const fileInput = page.locator('input[type="file"]');

    const rows: string[] = ['id,price,rating'];
    for (let i = 0; i < 2000; i++) {
      rows.push(`${i},${10 + i},${3 + (i % 3)}`);
    }
    const content = rows.join('\n');

    await fileInput.setInputFiles({
      name: 'large.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(content),
    });

    // Eventually we should see preview and/or header display
    await expect(page.getByText(/Successfully Parsed Rows/)).toBeVisible();
  });

  test('dashboard buttons/inputs are keyboard-navigable', async ({ page }) => {
    await page.goto('/dashboard');
  
    // Press Tab until we reach the Add Row button
    // (UI requires ~7 tabs based on the screenshot)
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
  
      // If Add Row gets focus, stop
      if (await page.getByRole('button', { name: /add row/i }).evaluate((el) => el === document.activeElement)) {
        break;
      }
    }
  
    // Validate we actually reached the button
    const addRowBtn = page.getByRole('button', { name: /add row/i });
    await expect(addRowBtn).toBeFocused();
  
    // Press Enter to activate Add Row
    await page.keyboard.press('Enter');
  
    // Verify a row appears
    await expect(page.locator('table tbody tr')).toHaveCount(1);
  });
  
});
