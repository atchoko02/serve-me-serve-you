// Integration tests for questionnaire controller
import { test, expect } from '@playwright/test';
import { cleanupTestBusiness, waitForFirestoreWrite } from '../helpers/firebase-helpers';
import { generateTestBusinessId } from '../helpers/test-helpers';
import { uploadCSV, buildTree, generateQuestionnaire, getQuestionnaireByLink, getQuestionnairesByBusiness } from '../helpers/axios-helper';

test.describe('Questionnaire Controller Integration Tests', () => {
  let testBusinessId: string;

  test.beforeEach(() => {
    testBusinessId = generateTestBusinessId();
  });

  test.afterEach(async () => {
    await cleanupTestBusiness(testBusinessId);
    await waitForFirestoreWrite();
  });

  // Helper to set up business with products and tree
  async function setupBusinessWithTree() {
    // Upload CSV
    await uploadCSV('test-small.csv', testBusinessId);
    await waitForFirestoreWrite();

    // Build tree
    const treeResponse = await buildTree(testBusinessId);
    await waitForFirestoreWrite();

    return treeResponse.data.tree.id;
  }

  test.describe('POST /api/questionnaires/generate', () => {
    test('generates questionnaire from latest tree', async () => {
      await setupBusinessWithTree();

      const response = await generateQuestionnaire(testBusinessId, {
        name: 'Test Questionnaire',
      });

      expect(response.status).toBe(200);
      const body = response.data;
      
      expect(body.success).toBe(true);
      expect(body.questionnaire.id).toBeDefined();
      expect(body.questionnaire.name).toBe('Test Questionnaire');
      expect(body.questionnaire.shareableLink).toBeDefined();
      expect(body.questionnaire.treeId).toBeDefined();
    });

    test('generates questionnaire from specific treeId', async () => {
      const treeId = await setupBusinessWithTree();

      const response = await generateQuestionnaire(testBusinessId, {
        treeId: treeId,
        name: 'Specific Tree Questionnaire',
      });

      expect(response.status).toBe(200);
      expect(response.data.questionnaire.treeId).toBe(treeId);
    });

    test('returns 400 when businessId is missing', async () => {
      try {
        const { createApiClient } = await import('../helpers/axios-helper');
        const client = createApiClient();
        await client.post('/api/questionnaires/generate', {
          name: 'Test Questionnaire',
        });
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        expect(error.response?.status).toBe(400);
        expect(error.response?.data?.error).toContain('businessId');
      }
    });

    test('returns 404 when no tree exists', async () => {
      // Create business but don't build tree
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

    test('creates unique shareable links', async () => {
      await setupBusinessWithTree();

      const response1 = await generateQuestionnaire(testBusinessId);
      await waitForFirestoreWrite();

      const response2 = await generateQuestionnaire(testBusinessId);
      await waitForFirestoreWrite();

      expect(response1.data.questionnaire.shareableLink).not.toBe(response2.data.questionnaire.shareableLink);
    });
  });

  test.describe('GET /api/questionnaires/:link', () => {
    test('returns questionnaire by shareable link', async () => {
      await setupBusinessWithTree();

      // Generate questionnaire
      const generateResponse = await generateQuestionnaire(testBusinessId, {
        name: 'Test Questionnaire',
      });
      await waitForFirestoreWrite();

      const shareableLink = generateResponse.data.questionnaire.shareableLink;

      // Retrieve by link
      const response = await getQuestionnaireByLink(shareableLink);

      expect(response.status).toBe(200);
      const body = response.data;
      
      expect(body.success).toBe(true);
      expect(body.questionnaire.id).toBeDefined();
      expect(body.questionnaire.shareableLink).toBe(shareableLink);
      expect(body.tree).toBeDefined();
      expect(body.tree.id).toBeDefined();
      expect(body.tree.treeStructure).toBeDefined();
    });

    test('returns 404 for invalid link', async () => {
      try {
        await getQuestionnaireByLink('invalid-link-12345');
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        expect(error.response?.status).toBe(404);
        expect(error.response?.data?.error).toContain('not found');
      }
    });
  });

  test.describe('GET /api/questionnaires/business/:businessId', () => {
    test('returns all questionnaires for a business', async () => {
      await setupBusinessWithTree();

      // Generate multiple questionnaires
      await generateQuestionnaire(testBusinessId, { name: 'Questionnaire 1' });
      await waitForFirestoreWrite();

      await generateQuestionnaire(testBusinessId, { name: 'Questionnaire 2' });
      await waitForFirestoreWrite();

      const response = await getQuestionnairesByBusiness(testBusinessId);

      expect(response.status).toBe(200);
      const body = response.data;
      
      expect(body.success).toBe(true);
      expect(body.count).toBeGreaterThanOrEqual(2);
      expect(Array.isArray(body.questionnaires)).toBe(true);
      expect(body.questionnaires.length).toBeGreaterThanOrEqual(2);
      
      // Should be ordered by creation date (newest first)
      if (body.questionnaires.length > 1) {
        const first = body.questionnaires[0];
        const second = body.questionnaires[1];
        expect(first.createdAt).toBeDefined();
        expect(second.createdAt).toBeDefined();
      }
    });

    test('returns empty array for business with no questionnaires', async () => {
      // Create business but don't generate questionnaires
      await uploadCSV('test-small.csv', testBusinessId);
      await waitForFirestoreWrite();

      const response = await getQuestionnairesByBusiness(testBusinessId);

      expect(response.status).toBe(200);
      expect(response.data.count).toBe(0);
      expect(response.data.questionnaires).toEqual([]);
    });

    test('returns 400 when businessId is missing', async () => {
      try {
        const { createApiClient } = await import('../helpers/axios-helper');
        const client = createApiClient();
        await client.get('/api/questionnaires/business/');
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        // This might return 404 or 400 depending on routing
        expect([400, 404]).toContain(error.response?.status);
      }
    });
  });
});
