// E2E tests for questionnaire tree navigation
import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// From frontend/tests/e2e/ to root test-data: ../../../test-data
const testDataDir = path.resolve(__dirname, '../../../test-data');

test.describe('Questionnaire Tree Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('complete questionnaire flow with tree navigation', async ({ page }) => {
    // Upload CSV
    const csvPath = path.join(testDataDir, 'test-small.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-small.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    });

    // Wait for parsing
    await expect(page.getByText(/Successfully Parsed Rows/i)).toBeVisible({ timeout: 10000 });

    // Process CSV - button text is dynamic like "Process CSV (5 valid rows)"
    const processButton = page.getByRole('button', { name: /Process CSV/i });
    await expect(processButton).toBeEnabled({ timeout: 5000 });
    await processButton.click();

    // Wait for questionnaire to appear - use data-testid for reliable detection
    await expect(page.getByTestId('questionnaire-container')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('back-to-setup-button')).toBeVisible({ timeout: 5000 });

    // Verify we're in questionnaire view
    await expect(page.getByTestId('question-card')).toBeVisible();
    await expect(page.getByTestId('question-text')).toBeVisible();

    // Answer questions by selecting left/right options
    const optionLeft = page.getByTestId('option-left');
    const optionRight = page.getByTestId('option-right');
    
    await expect(optionLeft).toBeVisible();
    await expect(optionRight).toBeVisible();

    // Click first option (left)
    await optionLeft.click();

    // Verify selection is highlighted - wait for the class to update
    await expect(optionLeft).toHaveClass(/border-blue-600|bg-blue-50/, { timeout: 1000 });

    // Click Next button
    const nextButton = page.getByTestId('next-button');
    await expect(nextButton).toBeEnabled();
    await nextButton.click();

    // Continue answering until we reach recommendations
    let questionCount = 0;
    const maxQuestions = 10; // Safety limit

    while (questionCount < maxQuestions) {
      // Wait a bit for state update
      await page.waitForTimeout(300);

      // Check if we've reached the results page
      const resultsCard = page.getByTestId('results-card');
      const isComplete = await resultsCard.isVisible().catch(() => false);

      if (isComplete) {
        break;
      }

      // Check if we're still on a question
      const questionCard = page.getByTestId('question-card');
      const hasQuestion = await questionCard.isVisible().catch(() => false);

      if (!hasQuestion) {
        break;
      }

      // Answer next question
      const currentOptionLeft = page.getByTestId('option-left');
      const currentOptionRight = page.getByTestId('option-right');
      
      const leftVisible = await currentOptionLeft.isVisible().catch(() => false);
      const rightVisible = await currentOptionRight.isVisible().catch(() => false);

      if (leftVisible && rightVisible) {
        await currentOptionLeft.click();
        await page.waitForTimeout(200); // Wait for selection state
        
        const currentNextButton = page.getByTestId('next-button');
        await expect(currentNextButton).toBeEnabled();
        await currentNextButton.click();
        questionCount++;
      } else {
        break;
      }
    }

    // Verify we reached recommendations
    await expect(page.getByTestId('results-card')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('completion-message')).toBeVisible();
    await expect(page.getByText(/Questionnaire Complete/i)).toBeVisible();

    // Verify recommendations are displayed
    const recommendedProducts = page.getByTestId('recommended-products');
    await expect(recommendedProducts).toBeVisible();

    // Verify "How we got here" section shows navigation path
    const navigationPath = page.getByText(/How we got here/i);
    await expect(navigationPath).toBeVisible();
  });

  test('questions are generated from tree structure (not tournament-style)', async ({ page }) => {
    const csvPath = path.join(testDataDir, 'test-small.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-small.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    });

    await expect(page.getByText(/Successfully Parsed Rows/i)).toBeVisible({ timeout: 10000 });

    const processButton = page.getByRole('button', { name: /Process CSV/i });
    await processButton.click();

    // Wait for questionnaire to load
    await expect(page.getByTestId('questionnaire-container')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('question-card')).toBeVisible({ timeout: 5000 });

    // Verify question text is natural language (not just attribute names)
    const questionText = await page.getByTestId('question-text').textContent();
    
    expect(questionText).toBeTruthy();
    // Question should be a full sentence, not just "price vs rating"
    expect(questionText!.length).toBeGreaterThan(20);
    expect(questionText).toMatch(/Would you prefer|What matters more|If you had to choose/i);
  });

  test('progress indicator updates correctly', async ({ page }) => {
    const csvPath = path.join(testDataDir, 'test-small.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-small.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    });

    await expect(page.getByText(/Successfully Parsed Rows/i)).toBeVisible({ timeout: 10000 });

    const processButton = page.getByRole('button', { name: /Process CSV/i });
    await processButton.click();

    // Wait for questionnaire
    await expect(page.getByTestId('questionnaire-container')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('question-card')).toBeVisible({ timeout: 5000 });

    // Check initial progress - get the actual progress value
    const progressBar = page.getByTestId('progress-bar');
    await expect(progressBar).toBeVisible();
    
    // Get initial progress percentage text
    const initialProgressText = await page.getByTestId('progress-percentage').textContent();
    const initialProgress = parseInt(initialProgressText?.replace('% Complete', '') || '0');
    
    // Answer a question
    await page.getByTestId('option-left').click();
    await page.waitForTimeout(200); // Wait for selection state
    
    const nextButton = page.getByTestId('next-button');
    await expect(nextButton).toBeEnabled();
    await nextButton.click();
    
    // Wait for next question to appear
    await page.waitForTimeout(500);
    
    // Check if we're still on a question (not at results yet)
    const questionCard = page.getByTestId('question-card');
    const stillOnQuestion = await questionCard.isVisible().catch(() => false);
    
    if (stillOnQuestion) {
      // Progress should have increased
      const newProgressText = await page.getByTestId('progress-percentage').textContent();
      const newProgress = parseInt(newProgressText?.replace('% Complete', '') || '0');
      
      // Progress should have increased (or at least not decreased)
      expect(newProgress).toBeGreaterThanOrEqual(initialProgress);
    }
  });

  test('restart functionality works', async ({ page }) => {
    const csvPath = path.join(testDataDir, 'test-small.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-small.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    });

    await expect(page.getByText(/Successfully Parsed Rows/i)).toBeVisible({ timeout: 10000 });

    const processButton = page.getByRole('button', { name: /Process CSV/i });
    await processButton.click();

    // Wait for questionnaire
    await expect(page.getByTestId('questionnaire-container')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('question-card')).toBeVisible({ timeout: 5000 });

    // Get initial question number (should be "Question 1")
    const initialQuestionNumber = await page.getByTestId('question-number').textContent();
    expect(initialQuestionNumber).toContain('Question 1');

    // Answer a question
    await page.getByTestId('option-left').click();
    await page.waitForTimeout(200);
    
    const nextButton = page.getByTestId('next-button');
    await expect(nextButton).toBeEnabled();
    await nextButton.click();
    
    // Wait for next question
    await page.waitForTimeout(500);

    // Verify we moved to question 2
    const questionNumberAfterAnswer = await page.getByTestId('question-number').textContent();
    expect(questionNumberAfterAnswer).toContain('Question 2');

    // Click restart
    const restartButton = page.getByTestId('start-over-button');
    await expect(restartButton).toBeVisible();
    await restartButton.click();

    // Should be back at first question - wait for question card to reappear
    await expect(page.getByTestId('question-card')).toBeVisible({ timeout: 2000 });
    
    // Verify we're back at question 1 (question text may vary due to template randomization)
    const newQuestionNumber = await page.getByTestId('question-number').textContent();
    expect(newQuestionNumber).toContain('Question 1');
    
    // Verify question text exists (even if different template)
    const newQuestionText = await page.getByTestId('question-text').textContent();
    expect(newQuestionText).toBeTruthy();
    expect(newQuestionText!.length).toBeGreaterThan(20);
  });

  test('recommendations come from leaf node products', async ({ page }) => {
    const csvPath = path.join(testDataDir, 'test-small.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-small.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    });

    await expect(page.getByText(/Successfully Parsed Rows/i)).toBeVisible({ timeout: 10000 });

    const processButton = page.getByRole('button', { name: /Process CSV/i });
    await processButton.click();

    // Wait for questionnaire
    await expect(page.getByTestId('questionnaire-container')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('question-card')).toBeVisible({ timeout: 5000 });

    // Answer all questions until completion
    let questionCount = 0;
    const maxQuestions = 10;

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

    // Verify recommendations are shown
    await expect(page.getByTestId('results-card')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('recommended-products')).toBeVisible();

    // Verify product names are displayed (from CSV)
    const productNames = page.locator('text=/Product [A-E]/i');
    const productCount = await productNames.count();
    expect(productCount).toBeGreaterThan(0);
  });
});
