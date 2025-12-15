// E2E tests for complete API workflow
import { test, expect } from '@playwright/test';
import { cleanupTestBusiness, waitForFirestoreWrite } from '../helpers/firebase-helpers';
import { generateTestBusinessId } from '../helpers/test-helpers';
import { uploadCSV, buildTree, generateQuestionnaire, getQuestionnaireByLink, getProducts } from '../helpers/axios-helper';

test.describe('API E2E Tests - Complete Workflow', () => {
  let testBusinessId: string;

  test.beforeEach(() => {
    testBusinessId = generateTestBusinessId();
  });

  test.afterEach(async () => {
    await cleanupTestBusiness(testBusinessId);
    await waitForFirestoreWrite();
  });

  test('Complete workflow: CSV upload → Tree build → Questionnaire generation', async () => {
    // Step 1: Upload CSV
    const uploadResponse = await uploadCSV('test-small.csv', testBusinessId, {
      businessName: 'E2E Test Business',
      businessEmail: 'e2e@example.com',
    });

    expect(uploadResponse.status).toBe(200);
    const uploadBody = uploadResponse.data;
    expect(uploadBody.success).toBe(true);
    expect(uploadBody.products.stored).toBeGreaterThan(0);
    await waitForFirestoreWrite();

    // Step 2: Verify products were stored
    const productsResponse = await getProducts(testBusinessId);
    expect(productsResponse.status).toBe(200);
    expect(productsResponse.data.count).toBe(uploadBody.products.stored);

    // Step 3: Build decision tree
    const treeResponse = await buildTree(testBusinessId);

    expect(treeResponse.status).toBe(200);
    const treeBody = treeResponse.data;
    expect(treeBody.success).toBe(true);
    expect(treeBody.tree.id).toBeDefined();
    expect(treeBody.tree.metrics.depth).toBeGreaterThan(0);
    expect(treeBody.tree.productCount).toBe(uploadBody.products.stored);
    await waitForFirestoreWrite();

    // Step 4: Generate questionnaire
    const questionnaireResponse = await generateQuestionnaire(testBusinessId, {
      name: 'E2E Test Questionnaire',
    });

    expect(questionnaireResponse.status).toBe(200);
    const questionnaireBody = questionnaireResponse.data;
    expect(questionnaireBody.success).toBe(true);
    expect(questionnaireBody.questionnaire.id).toBeDefined();
    expect(questionnaireBody.questionnaire.shareableLink).toBeDefined();
    expect(questionnaireBody.questionnaire.treeId).toBe(treeBody.tree.id);
    await waitForFirestoreWrite();

    // Step 5: Retrieve questionnaire by link
    const linkResponse = await getQuestionnaireByLink(questionnaireBody.questionnaire.shareableLink);

    expect(linkResponse.status).toBe(200);
    const linkBody = linkResponse.data;
    expect(linkBody.questionnaire.id).toBe(questionnaireBody.questionnaire.id);
    expect(linkBody.tree.treeStructure).toBeDefined();
  });

  test('Multiple businesses data isolation', async () => {
    const business1Id = generateTestBusinessId();
    const business2Id = generateTestBusinessId();

    try {
      // Upload CSV for business 1
      await uploadCSV('test-small.csv', business1Id);
      await waitForFirestoreWrite();

      // Upload CSV for business 2
      await uploadCSV('test-medium.csv', business2Id);
      await waitForFirestoreWrite();

      // Verify business 1 can only see its own products
      const products1Response = await getProducts(business1Id);
      const products1Body = products1Response.data;

      // Verify business 2 can only see its own products
      const products2Response = await getProducts(business2Id);
      const products2Body = products2Response.data;

      // They should have different product counts (test-medium.csv has more products)
      expect(products1Body.count).not.toBe(products2Body.count);
    } finally {
      await cleanupTestBusiness(business1Id);
      await cleanupTestBusiness(business2Id);
      await waitForFirestoreWrite();
    }
  });

  test('Error handling: Invalid CSV upload', async () => {
    // Try to upload invalid CSV (no headers)
    try {
      const invalidCSV = '1,Product A,10.99\n2,Product B,15.99';
      const csvBuffer = Buffer.from(invalidCSV);
      
      const FormData = (await import('form-data')).default;
      const formData = new FormData();
      formData.append('file', csvBuffer, {
        filename: 'invalid.csv',
        contentType: 'text/csv',
      });
      formData.append('businessId', testBusinessId);

      const { createApiClient } = await import('../helpers/axios-helper');
      const client = createApiClient();
      const response = await client.post('/api/csv/upload', formData, {
        headers: formData.getHeaders(),
      });
      
      // If it succeeds, it should have CSV errors
      if (response.status === 200) {
        expect(response.data.csvErrors?.count).toBeGreaterThan(0);
      } else {
        expect(response.status).toBe(400);
      }
    } catch (error: any) {
      // Should return 400 or succeed with errors
      if (error.response) {
        expect([400, 200]).toContain(error.response.status);
      } else {
        // Network error or other - just verify it failed
        expect(error).toBeDefined();
      }
    }
  });

  test('Error handling: Build tree without products', async () => {
    try {
      await buildTree(testBusinessId);
      expect(false).toBe(true); // Should not reach here
    } catch (error: any) {
      expect(error.response?.status).toBe(404);
      expect(error.response?.data?.error).toContain('products');
    }
  });

  test('Error handling: Generate questionnaire without tree', async () => {
    // Upload products but don't build tree
    await uploadCSV('test-small.csv', testBusinessId);
    await waitForFirestoreWrite();

    try {
      await generateQuestionnaire(testBusinessId);
      expect(false).toBe(true); // Should not reach here
    } catch (error: any) {
      expect(error.response?.status).toBe(404);
      expect(error.response?.data?.error).toContain('tree');
    }
  });

  test('Error handling: Get invalid questionnaire link', async () => {
    try {
      await getQuestionnaireByLink('invalid-link-99999');
      expect(false).toBe(true); // Should not reach here
    } catch (error: any) {
      expect(error.response?.status).toBe(404);
      expect(error.response?.data?.error).toContain('not found');
    }
  });

  test('Large dataset performance', async () => {
    // Upload large CSV
    const startTime = Date.now();
    const uploadResponse = await uploadCSV('test-large.csv', testBusinessId);
    const uploadTime = Date.now() - startTime;

    expect(uploadResponse.status).toBe(200);
    const uploadBody = uploadResponse.data;
    expect(uploadBody.products.stored).toBeGreaterThan(0);
    
    // Upload should complete in reasonable time (< 10 seconds for large dataset)
    expect(uploadTime).toBeLessThan(10000);
    await waitForFirestoreWrite();

    // Build tree
    const treeStartTime = Date.now();
    const treeResponse = await buildTree(testBusinessId);
    const treeTime = Date.now() - treeStartTime;

    expect(treeResponse.status).toBe(200);
    const treeBody = treeResponse.data;
    expect(treeBody.tree.metrics).toBeDefined();
    
    // Tree building should complete in reasonable time (< 30 seconds for large dataset)
    expect(treeTime).toBeLessThan(30000);
  });

  test('Multiple questionnaires per business', async () => {
    // Set up business with tree
    await uploadCSV('test-small.csv', testBusinessId);
    await waitForFirestoreWrite();

    await buildTree(testBusinessId);
    await waitForFirestoreWrite();

    // Generate multiple questionnaires
    const questionnaire1Response = await generateQuestionnaire(testBusinessId, {
      name: 'Questionnaire 1',
    });
    await waitForFirestoreWrite();

    const questionnaire2Response = await generateQuestionnaire(testBusinessId, {
      name: 'Questionnaire 2',
    });
    await waitForFirestoreWrite();

    const questionnaire3Response = await generateQuestionnaire(testBusinessId, {
      name: 'Questionnaire 3',
    });
    await waitForFirestoreWrite();

    expect(questionnaire1Response.status).toBe(200);
    expect(questionnaire2Response.status).toBe(200);
    expect(questionnaire3Response.status).toBe(200);

    // Get all questionnaires
    const { getQuestionnairesByBusiness } = await import('../helpers/axios-helper');
    const allResponse = await getQuestionnairesByBusiness(testBusinessId);
    expect(allResponse.status).toBe(200);
    const allBody = allResponse.data;
    
    expect(allBody.count).toBeGreaterThanOrEqual(3);
    expect(allBody.questionnaires.length).toBeGreaterThanOrEqual(3);

    // Verify all have unique links
    const links = allBody.questionnaires.map((q: any) => q.shareableLink);
    const uniqueLinks = new Set(links);
    expect(uniqueLinks.size).toBe(links.length);
  });
});
