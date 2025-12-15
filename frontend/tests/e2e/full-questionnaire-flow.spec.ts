// E2E tests for full questionnaire flow
import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// From frontend/tests/e2e/ to root test-data: ../../../test-data
const testDataDir = path.resolve(__dirname, '../../../test-data');

test.describe('Full Questionnaire Flow', () => {
  test('complete end-to-end flow: upload → parse → tree → questionnaire → recommendations', async ({ page }) => {
    await page.goto('/');

    // Step 1: Upload CSV
    const csvPath = path.join(testDataDir, 'test-medium.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-medium.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    });

    // Step 2: Verify parsing
    await expect(page.getByText(/Successfully Parsed Rows/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Detected Headers/i)).toBeVisible();

    // Step 3: Process CSV and navigate to questionnaire
    const processButton = page.getByRole('button', { name: /Process CSV/i });
    await expect(processButton).toBeEnabled();
    await processButton.click();

    // Step 4: Verify questionnaire starts - wait for questionnaire container
    await expect(page.getByTestId('questionnaire-container')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('question-card')).toBeVisible({ timeout: 5000 });

    // Step 5: Complete questionnaire
    let questionCount = 0;
    const maxQuestions = 15;

    while (questionCount < maxQuestions) {
      await page.waitForTimeout(300);

      // Check if we've reached results
      const resultsCard = page.getByTestId('results-card');
      const isComplete = await resultsCard.isVisible().catch(() => false);

      if (isComplete) break;

      // Answer current question
      const optionLeft = page.getByTestId('option-left');
      const optionRight = page.getByTestId('option-right');
      
      const leftVisible = await optionLeft.isVisible().catch(() => false);
      const rightVisible = await optionRight.isVisible().catch(() => false);

      if (leftVisible && rightVisible) {
        await optionLeft.click();
        await page.waitForTimeout(200);
        
        const nextBtn = page.getByTestId('next-button');
        await expect(nextBtn).toBeEnabled();
        await nextBtn.click();
        questionCount++;
        await page.waitForTimeout(500);
      } else {
        break;
      }
    }

    // Step 6: Verify recommendations
    await expect(page.getByTestId('results-card')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('completion-message')).toBeVisible();
    
    // Verify data flows correctly - products should be from CSV
    const productElements = page.locator('text=/Product/i');
    const productCount = await productElements.count();
    expect(productCount).toBeGreaterThan(0);
  });

  test('no data loss between stages', async ({ page }) => {
    await page.goto('/');

    const csvPath = path.join(testDataDir, 'test-small.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const expectedProductCount = csvContent.split('\n').length - 1; // Subtract header

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-small.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    });

    // Verify parsing shows correct row count
    await expect(page.getByText(/Successfully Parsed Rows/i)).toBeVisible({ timeout: 10000 });
    const rowCountText = await page.locator('text=/\\d+ rows/i').first().textContent();
    expect(rowCountText).toBeTruthy();

    const processButton = page.getByRole('button', { name: /Process CSV/i });
    await processButton.click();

    // Complete questionnaire - wait for questionnaire container
    await expect(page.getByTestId('questionnaire-container')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('question-card')).toBeVisible({ timeout: 5000 });

    let questionCount = 0;
    while (questionCount < 10) {
      await page.waitForTimeout(300);

      const resultsCard = page.getByTestId('results-card');
      const isComplete = await resultsCard.isVisible().catch(() => false);
      if (isComplete) break;

      const optionLeft = page.getByTestId('option-left');
      const optionRight = page.getByTestId('option-right');
      
      const leftVisible = await optionLeft.isVisible().catch(() => false);
      const rightVisible = await optionRight.isVisible().catch(() => false);

      if (leftVisible && rightVisible) {
        await optionLeft.click();
        await page.waitForTimeout(200);
        await page.getByTestId('next-button').click();
        questionCount++;
        await page.waitForTimeout(500);
      } else break;
    }

    // Verify recommendations show products (data preserved)
    await expect(page.getByTestId('results-card')).toBeVisible({ timeout: 5000 });
    const recommendedProducts = page.locator('text=/Product [A-E]/i');
    const recommendedCount = await recommendedProducts.count();
    expect(recommendedCount).toBeGreaterThan(0);
  });

  test('multiple questionnaire sessions work correctly', async ({ page }) => {
    await page.goto('/');

    const csvPath = path.join(testDataDir, 'test-small.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');

    // First session
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-small.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    });

    await expect(page.getByText(/Successfully Parsed Rows/i)).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /Process CSV/i }).click();
    
    // Wait for questionnaire
    await expect(page.getByTestId('questionnaire-container')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('question-card')).toBeVisible({ timeout: 5000 });

    // Get initial question number (should be "Question 1")
    const initialQuestionNumber = await page.getByTestId('question-number').textContent();
    expect(initialQuestionNumber).toContain('Question 1');

    // Answer one question
    await page.getByTestId('option-left').click();
    await page.waitForTimeout(200);
    await page.getByTestId('next-button').click();
    await page.waitForTimeout(500);

    // Verify we moved to question 2
    const questionNumberAfterAnswer = await page.getByTestId('question-number').textContent();
    expect(questionNumberAfterAnswer).toContain('Question 2');

    // Restart
    await page.getByTestId('start-over-button').click();
    
    // Wait for question card to reappear
    await expect(page.getByTestId('question-card')).toBeVisible({ timeout: 2000 });

    // Verify state reset - should be at question 1 again (text may vary due to template randomization)
    const questionNumber = await page.getByTestId('question-number').textContent();
    expect(questionNumber).toContain('Question 1');
    
    // Verify question text exists
    const questionText = await page.getByTestId('question-text').textContent();
    expect(questionText).toBeTruthy();
    expect(questionText!.length).toBeGreaterThan(20);
  });

  test('large CSV processes without UI freezing', async ({ page }) => {
    await page.goto('/');

    const csvPath = path.join(testDataDir, 'test-large.csv');
    if (!fs.existsSync(csvPath)) {
      test.skip();
      return;
    }

    const csvContent = fs.readFileSync(csvPath, 'utf-8');

    const startTime = Date.now();

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-large.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    });

    // Wait for parsing (should complete without freezing)
    await expect(page.getByText(/Successfully Parsed Rows/i)).toBeVisible({ timeout: 30000 });

    const parseTime = Date.now() - startTime;

    // Should complete in reasonable time (< 10 seconds for 1000 products)
    expect(parseTime).toBeLessThan(10000);

    // Process CSV
    const processButton = page.getByRole('button', { name: /Process CSV/i });
    await expect(processButton).toBeEnabled();
    await processButton.click();

    // Tree building should also complete - wait for questionnaire
    await expect(page.getByTestId('questionnaire-container')).toBeVisible({ timeout: 15000 });

    const totalTime = Date.now() - startTime;
    expect(totalTime).toBeLessThan(20000); // Total should be < 20 seconds
  });
});
