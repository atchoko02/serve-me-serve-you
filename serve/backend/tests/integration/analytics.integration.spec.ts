// Integration tests for Analytics API
import { test, expect } from '@playwright/test';
import { cleanupTestBusiness, waitForFirestoreWrite } from '../helpers/firebase-helpers';
import { generateTestBusinessId } from '../helpers/test-helpers';
import { uploadCSV, buildTree, generateQuestionnaire, getQuestionnaireByLink } from '../helpers/axios-helper';
import { createApiClient } from '../helpers/axios-helper';

test.describe('Analytics Integration Tests', () => {
  let testBusinessId: string;
  let questionnaireId: string;
  let shareableLink: string;

  test.beforeEach(async () => {
    testBusinessId = generateTestBusinessId();
  });

  test.afterEach(async () => {
    await cleanupTestBusiness(testBusinessId);
    await waitForFirestoreWrite();
  });

  test('stores response when questionnaire is completed', async () => {
    // Upload CSV and build tree
    await uploadCSV('test-medium.csv', testBusinessId);
    await waitForFirestoreWrite();

    const treeResponse = await buildTree(testBusinessId);
    expect(treeResponse.status).toBe(200);
    await waitForFirestoreWrite();

    // Generate questionnaire
    const questionnaireResponse = await generateQuestionnaire(testBusinessId);
    expect(questionnaireResponse.data.success).toBe(true);
    questionnaireId = questionnaireResponse.data.questionnaire.id;
    shareableLink = questionnaireResponse.data.questionnaire.shareableLink;
    await waitForFirestoreWrite();

    // Store a response
    const apiClient = createApiClient();
    const responseData = {
      businessId: testBusinessId,
      questionnaireId,
      navigationPath: [
        {
          nodeId: 'node_1',
          question: {
            id: 'q1',
            text: 'Test question?',
            type: 'hyperplane' as const,
            weights: [0.5, 0.5],
            featureNames: ['price', 'rating'],
            threshold: 0.5,
          },
          answer: {
            questionId: 'q1',
            choice: 'left' as const,
            timestamp: Date.now(),
          },
          timestamp: Date.now(),
        },
      ],
      recommendedProductIds: ['product1', 'product2'],
      duration: 5000,
      sessionId: 'test-session-1',
    };

    const storeResponse = await apiClient.post('/api/responses', responseData);
    expect(storeResponse.status).toBe(200);
    expect(storeResponse.data.success).toBe(true);
    expect(storeResponse.data.response.sessionId).toBe('test-session-1');
    await waitForFirestoreWrite();
  });

  test('calculates and retrieves questionnaire analytics', async () => {
    // Upload CSV and build tree
    await uploadCSV('test-medium.csv', testBusinessId);
    await waitForFirestoreWrite();

    const treeResponse = await buildTree(testBusinessId);
    expect(treeResponse.status).toBe(200);
    await waitForFirestoreWrite();

    // Generate questionnaire
    const questionnaireResponse = await generateQuestionnaire(testBusinessId);
    expect(questionnaireResponse.data.success).toBe(true);
    questionnaireId = questionnaireResponse.data.questionnaire.id;
    await waitForFirestoreWrite();

    // Store multiple responses
    const apiClient = createApiClient();
    const responseData = {
      businessId: testBusinessId,
      questionnaireId,
      navigationPath: [
        {
          nodeId: 'node_1',
          question: {
            id: 'q1',
            text: 'Test question?',
            type: 'hyperplane' as const,
            weights: [0.5, 0.5],
            featureNames: ['price', 'rating'],
            threshold: 0.5,
          },
          answer: {
            questionId: 'q1',
            choice: 'left' as const,
            timestamp: Date.now(),
          },
          timestamp: Date.now(),
        },
      ],
      recommendedProductIds: ['product1'],
      duration: 5000,
      sessionId: 'test-session-1',
    };

    // Store 3 responses
    await apiClient.post('/api/responses', { ...responseData, sessionId: 'session-1' });
    await apiClient.post('/api/responses', { ...responseData, sessionId: 'session-2' });
    await apiClient.post('/api/responses', { ...responseData, sessionId: 'session-3' });
    await waitForFirestoreWrite();

    // Get analytics
    const analyticsResponse = await apiClient.get(
      `/api/analytics/questionnaire/${questionnaireId}?businessId=${encodeURIComponent(testBusinessId)}`
    );
    expect(analyticsResponse.status).toBe(200);
    expect(analyticsResponse.data.success).toBe(true);
    expect(analyticsResponse.data.analytics).toBeDefined();
    expect(analyticsResponse.data.analytics.totalResponses).toBe(3);
    expect(analyticsResponse.data.analytics.completedResponses).toBe(3);
    expect(analyticsResponse.data.analytics.completionRate).toBe(1.0);
  });

  test('calculates and retrieves business analytics', async () => {
    // Upload CSV and build tree
    await uploadCSV('test-medium.csv', testBusinessId);
    await waitForFirestoreWrite();

    const treeResponse = await buildTree(testBusinessId);
    expect(treeResponse.status).toBe(200);
    await waitForFirestoreWrite();

    // Generate questionnaire
    const questionnaireResponse = await generateQuestionnaire(testBusinessId);
    expect(questionnaireResponse.data.success).toBe(true);
    questionnaireId = questionnaireResponse.data.questionnaire.id;
    await waitForFirestoreWrite();

    // Store a response
    const apiClient = createApiClient();
    const responseData = {
      businessId: testBusinessId,
      questionnaireId,
      navigationPath: [
        {
          nodeId: 'node_1',
          question: {
            id: 'q1',
            text: 'Test question?',
            type: 'hyperplane' as const,
            weights: [0.5, 0.5],
            featureNames: ['price', 'rating'],
            threshold: 0.5,
          },
          answer: {
            questionId: 'q1',
            choice: 'left' as const,
            timestamp: Date.now(),
          },
          timestamp: Date.now(),
        },
      ],
      recommendedProductIds: ['product1'],
      duration: 5000,
      sessionId: 'test-session-1',
    };

    await apiClient.post('/api/responses', responseData);
    await waitForFirestoreWrite();

    // Get business analytics
    const analyticsResponse = await apiClient.get(`/api/analytics/business/${testBusinessId}`);
    expect(analyticsResponse.status).toBe(200);
    expect(analyticsResponse.data.success).toBe(true);
    expect(analyticsResponse.data.analytics).toBeDefined();
    expect(analyticsResponse.data.analytics.businessId).toBe(testBusinessId);
    expect(analyticsResponse.data.analytics.totalResponses).toBeGreaterThanOrEqual(1);
  });

  test('recalculates analytics on demand', async () => {
    // Upload CSV and build tree
    await uploadCSV('test-medium.csv', testBusinessId);
    await waitForFirestoreWrite();

    const treeResponse = await buildTree(testBusinessId);
    expect(treeResponse.status).toBe(200);
    await waitForFirestoreWrite();

    // Generate questionnaire
    const questionnaireResponse = await generateQuestionnaire(testBusinessId);
    expect(questionnaireResponse.data.success).toBe(true);
    questionnaireId = questionnaireResponse.data.questionnaire.id;
    await waitForFirestoreWrite();

    // Store a response
    const apiClient = createApiClient();
    const responseData = {
      businessId: testBusinessId,
      questionnaireId,
      navigationPath: [
        {
          nodeId: 'node_1',
          question: {
            id: 'q1',
            text: 'Test question?',
            type: 'hyperplane' as const,
            weights: [0.5, 0.5],
            featureNames: ['price', 'rating'],
            threshold: 0.5,
          },
          answer: {
            questionId: 'q1',
            choice: 'left' as const,
            timestamp: Date.now(),
          },
          timestamp: Date.now(),
        },
      ],
      recommendedProductIds: ['product1'],
      duration: 5000,
      sessionId: 'test-session-1',
    };

    await apiClient.post('/api/responses', responseData);
    await waitForFirestoreWrite();

    // Recalculate analytics
    const recalcResponse = await apiClient.post(
      `/api/analytics/questionnaire/${questionnaireId}/recalculate`,
      { businessId: testBusinessId }
    );
    expect(recalcResponse.status).toBe(200);
    expect(recalcResponse.data.success).toBe(true);
    expect(recalcResponse.data.analytics).toBeDefined();
  });
});

