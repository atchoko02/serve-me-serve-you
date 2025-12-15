// Phase 4: Edge Case Tests
// Tests for various CSV types, attribute combinations, and edge cases
import { test, expect } from '@playwright/test';
import { cleanupTestBusiness, waitForFirestoreWrite } from '../helpers/firebase-helpers';
import { generateTestBusinessId, getTestDataPath } from '../helpers/test-helpers';
import { uploadCSV, buildTree, generateQuestionnaire, getQuestionnaireByLink } from '../helpers/axios-helper';
import * as fs from 'fs';

test.describe('Phase 4: Edge Cases & Diverse CSV Types', () => {
  let testBusinessId: string;

  test.beforeEach(() => {
    testBusinessId = generateTestBusinessId();
  });

  test.afterEach(async () => {
    await cleanupTestBusiness(testBusinessId);
    await waitForFirestoreWrite();
  });

  test('handles CSV with only numeric attributes', async () => {
    // Create a minimal CSV with just numeric data
    const csvContent = `price,rating,quantity
10,4.5,100
20,4.0,200
30,4.8,150`;

    const csvPath = getTestDataPath('edge-numeric-only.csv');
    fs.writeFileSync(csvPath, csvContent);

    await uploadCSV('edge-numeric-only.csv', testBusinessId);
    await waitForFirestoreWrite();

    const treeResponse = await buildTree(testBusinessId);
    expect(treeResponse.status).toBe(200);
    expect(treeResponse.data.tree.id).toBeDefined();

    const questionnaireResponse = await generateQuestionnaire(testBusinessId);
    expect(questionnaireResponse.data.success).toBe(true);

    const getResponse = await getQuestionnaireByLink(
      questionnaireResponse.data.questionnaire.shareableLink
    );
    expect(getResponse.data.success).toBe(true);
    expect(getResponse.data.tree.treeStructure).toBeDefined();
  });

  test('handles CSV with mixed attribute types', async () => {
    // Create CSV with price, rating, duration, count
    const csvContent = `name,price,rating,duration_minutes,review_count
Product A,15.99,4.5,30,150
Product B,25.50,4.2,45,200
Product C,10.00,4.8,15,100`;

    const csvPath = getTestDataPath('edge-mixed-types.csv');
    fs.writeFileSync(csvPath, csvContent);

    await uploadCSV('edge-mixed-types.csv', testBusinessId);
    await waitForFirestoreWrite();

    const treeResponse = await buildTree(testBusinessId);
    expect(treeResponse.status).toBe(200);

    const questionnaireResponse = await generateQuestionnaire(testBusinessId);
    expect(questionnaireResponse.data.success).toBe(true);

    const getResponse = await getQuestionnaireByLink(
      questionnaireResponse.data.questionnaire.shareableLink
    );
    expect(getResponse.data.success).toBe(true);
    
    // Verify attribute profiles were created for different types
    const profiles = getResponse.data.tree.attributeProfiles;
    expect(profiles).toBeDefined();
    expect(profiles.length).toBeGreaterThan(0);
    
    // Should have detected different attribute types
    const types = new Set(profiles.map((p: any) => p.type));
    expect(types.size).toBeGreaterThan(0);
  });

  test('handles CSV with unusual attribute names', async () => {
    // CSV with non-standard attribute names
    const csvContent = `item_id,cost_usd,stars,time_sec,num_reviews
1,19.99,4.5,1800,50
2,29.99,4.0,2400,75
3,14.99,4.8,1200,30`;

    const csvPath = getTestDataPath('edge-unusual-names.csv');
    fs.writeFileSync(csvPath, csvContent);

    await uploadCSV('edge-unusual-names.csv', testBusinessId);
    await waitForFirestoreWrite();

    const treeResponse = await buildTree(testBusinessId);
    expect(treeResponse.status).toBe(200);

    const questionnaireResponse = await generateQuestionnaire(testBusinessId);
    expect(questionnaireResponse.data.success).toBe(true);

    // Should still generate meaningful questions despite unusual names
    const getResponse = await getQuestionnaireByLink(
      questionnaireResponse.data.questionnaire.shareableLink
    );
    expect(getResponse.data.success).toBe(true);
  });

  test('handles CSV with very small value ranges', async () => {
    // CSV where values are very close together
    const csvContent = `price,rating
10.01,4.0
10.02,4.1
10.03,4.0`;

    const csvPath = getTestDataPath('edge-small-range.csv');
    fs.writeFileSync(csvPath, csvContent);

    await uploadCSV('edge-small-range.csv', testBusinessId);
    await waitForFirestoreWrite();

    const treeResponse = await buildTree(testBusinessId);
    expect(treeResponse.status).toBe(200);

    const questionnaireResponse = await generateQuestionnaire(testBusinessId);
    expect(questionnaireResponse.data.success).toBe(true);
  });

  test('handles CSV with very large value ranges', async () => {
    // CSV with wide value ranges
    const csvContent = `price,rating
1,1.0
1000,5.0
500,3.0`;

    const csvPath = getTestDataPath('edge-large-range.csv');
    fs.writeFileSync(csvPath, csvContent);

    await uploadCSV('edge-large-range.csv', testBusinessId);
    await waitForFirestoreWrite();

    const treeResponse = await buildTree(testBusinessId);
    expect(treeResponse.status).toBe(200);

    const questionnaireResponse = await generateQuestionnaire(testBusinessId);
    expect(questionnaireResponse.data.success).toBe(true);
  });

  test('handles CSV with many attributes', async () => {
    // CSV with 10+ attributes
    const csvContent = `attr1,attr2,attr3,attr4,attr5,attr6,attr7,attr8,attr9,attr10
10,20,30,40,50,60,70,80,90,100
15,25,35,45,55,65,75,85,95,105
12,22,32,42,52,62,72,82,92,102`;

    const csvPath = getTestDataPath('edge-many-attributes.csv');
    fs.writeFileSync(csvPath, csvContent);

    await uploadCSV('edge-many-attributes.csv', testBusinessId);
    await waitForFirestoreWrite();

    const treeResponse = await buildTree(testBusinessId);
    expect(treeResponse.status).toBe(200);

    const questionnaireResponse = await generateQuestionnaire(testBusinessId);
    expect(questionnaireResponse.data.success).toBe(true);
  });

  test('handles CSV with few products', async () => {
    // CSV with only 2 products (minimum for tree)
    const csvContent = `price,rating
10,4.0
20,4.5`;

    const csvPath = getTestDataPath('edge-few-products.csv');
    fs.writeFileSync(csvPath, csvContent);

    await uploadCSV('edge-few-products.csv', testBusinessId);
    await waitForFirestoreWrite();

    const treeResponse = await buildTree(testBusinessId);
    expect(treeResponse.status).toBe(200);

    const questionnaireResponse = await generateQuestionnaire(testBusinessId);
    expect(questionnaireResponse.data.success).toBe(true);
  });

  test('handles CSV with many products', async () => {
    // Generate CSV with 100+ products
    const rows = ['price,rating'];
    for (let i = 0; i < 100; i++) {
      rows.push(`${10 + i * 0.5},${3.5 + (i % 10) * 0.1}`);
    }

    const csvPath = getTestDataPath('edge-many-products.csv');
    fs.writeFileSync(csvPath, rows.join('\n'));

    await uploadCSV('edge-many-products.csv', testBusinessId);
    await waitForFirestoreWrite();

    const treeResponse = await buildTree(testBusinessId);
    expect(treeResponse.status).toBe(200);
    expect(treeResponse.data.tree.metrics.depth).toBeGreaterThan(1);

    const questionnaireResponse = await generateQuestionnaire(testBusinessId);
    expect(questionnaireResponse.data.success).toBe(true);
  });

  test('handles CSV with zero values', async () => {
    // CSV containing zero values
    const csvContent = `price,rating,count
0,4.0,0
10,4.5,5
5,3.5,10`;

    const csvPath = getTestDataPath('edge-zero-values.csv');
    fs.writeFileSync(csvPath, csvContent);

    await uploadCSV('edge-zero-values.csv', testBusinessId);
    await waitForFirestoreWrite();

    const treeResponse = await buildTree(testBusinessId);
    expect(treeResponse.status).toBe(200);

    const questionnaireResponse = await generateQuestionnaire(testBusinessId);
    expect(questionnaireResponse.data.success).toBe(true);
  });

  test('handles CSV with negative values', async () => {
    // CSV with negative values (e.g., temperature, profit/loss)
    const csvContent = `temperature,profit,rating
-10,100,4.0
0,200,4.5
10,150,4.2`;

    const csvPath = getTestDataPath('edge-negative-values.csv');
    fs.writeFileSync(csvPath, csvContent);

    await uploadCSV('edge-negative-values.csv', testBusinessId);
    await waitForFirestoreWrite();

    const treeResponse = await buildTree(testBusinessId);
    expect(treeResponse.status).toBe(200);

    const questionnaireResponse = await generateQuestionnaire(testBusinessId);
    expect(questionnaireResponse.data.success).toBe(true);
  });
});

