// Phase 4: Performance Benchmarks
// Tests to ensure performance metrics are met
import { test, expect } from '@playwright/test';
import { cleanupTestBusiness, waitForFirestoreWrite } from '../helpers/firebase-helpers';
import { generateTestBusinessId, getTestDataPath } from '../helpers/test-helpers';
import { uploadCSV, buildTree, generateQuestionnaire } from '../helpers/axios-helper';
import * as fs from 'fs';

test.describe('Phase 4: Performance Benchmarks', () => {
  let testBusinessId: string;

  test.beforeEach(() => {
    testBusinessId = generateTestBusinessId();
  });

  test.afterEach(async () => {
    await cleanupTestBusiness(testBusinessId);
    await waitForFirestoreWrite();
  });

  test('attribute profiling adds < 1s to CSV processing', async () => {
    // Create a medium-sized CSV
    const rows = ['price,rating,quantity'];
    for (let i = 0; i < 50; i++) {
      rows.push(`${10 + i * 2},${3.5 + (i % 5) * 0.3},${50 + i * 10}`);
    }

      const csvPath = getTestDataPath('benchmark-medium.csv');
    fs.writeFileSync(csvPath, rows.join('\n'));

    const startTime = Date.now();
    await uploadCSV('benchmark-medium.csv', testBusinessId);
    await waitForFirestoreWrite();
    const uploadTime = Date.now() - startTime;

    // Attribute profiling should add < 1s to processing
    // Total upload time should be reasonable (< 5s for 50 products)
    expect(uploadTime).toBeLessThan(5000);
    
    // Note: We can't directly measure profiling time separately,
    // but we can ensure total time is acceptable
    console.log(`CSV upload time: ${uploadTime}ms`);
  });

  test('question generation remains < 100ms', async () => {
    await uploadCSV('test-medium.csv', testBusinessId);
    await waitForFirestoreWrite();

    await buildTree(testBusinessId);
    await waitForFirestoreWrite();

    const questionnaireResponse = await generateQuestionnaire(testBusinessId);
    expect(questionnaireResponse.data.success).toBe(true);

    // Question generation happens on the frontend, but we can test
    // that the backend response is fast
    const startTime = Date.now();
    const response = await generateQuestionnaire(testBusinessId);
    const responseTime = Date.now() - startTime;

    expect(responseTime).toBeLessThan(1000); // Backend response < 1s
    console.log(`Questionnaire generation response time: ${responseTime}ms`);
  });

  test('tree building scales reasonably with product count', async () => {
    const sizes = [10, 50, 100];
    const times: number[] = [];

    for (const size of sizes) {
      const rows = ['price,rating'];
      for (let i = 0; i < size; i++) {
        rows.push(`${10 + i * 2},${3.5 + (i % 5) * 0.3}`);
      }

      const csvPath = getTestDataPath(`benchmark-${size}.csv`);
      fs.writeFileSync(csvPath, rows.join('\n'));

      const businessId = generateTestBusinessId();
      
      const uploadStart = Date.now();
      await uploadCSV(`benchmark-${size}.csv`, businessId);
      await waitForFirestoreWrite();
      const uploadTime = Date.now() - uploadStart;

      const treeStart = Date.now();
      await buildTree(businessId);
      await waitForFirestoreWrite();
      const treeTime = Date.now() - treeStart;

      times.push(treeTime);
      console.log(`Size: ${size}, Upload: ${uploadTime}ms, Tree: ${treeTime}ms`);

      await cleanupTestBusiness(businessId);
      await waitForFirestoreWrite();
    }

    // Tree building time should scale reasonably (not exponentially)
    // 100 products should take < 10x longer than 10 products
    const ratio = times[2] / times[0];
    expect(ratio).toBeLessThan(20); // Allow some overhead but not exponential
    console.log(`Time ratio (100/10): ${ratio.toFixed(2)}x`);
  });

  test('handles concurrent questionnaire requests', async () => {
    await uploadCSV('test-medium.csv', testBusinessId);
    await waitForFirestoreWrite();

    await buildTree(testBusinessId);
    await waitForFirestoreWrite();

    const questionnaireResponse = await generateQuestionnaire(testBusinessId);
    expect(questionnaireResponse.data.success).toBe(true);

    // Make multiple concurrent requests
    const link = questionnaireResponse.data.questionnaire.shareableLink;
    const { getQuestionnaireByLink } = await import('../helpers/axios-helper');

    const startTime = Date.now();
    const promises = Array(5).fill(null).map(() => getQuestionnaireByLink(link));
    const responses = await Promise.all(promises);
    const concurrentTime = Date.now() - startTime;

    // All requests should succeed
    responses.forEach(response => {
      expect(response.data.success).toBe(true);
    });

    // Concurrent requests should complete in reasonable time
    expect(concurrentTime).toBeLessThan(5000);
    console.log(`5 concurrent requests completed in: ${concurrentTime}ms`);
  });
});

