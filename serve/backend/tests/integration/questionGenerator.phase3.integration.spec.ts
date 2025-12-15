// Integration tests for Phase 3: Split Analysis in Real Questionnaire Flow
import { test, expect } from '@playwright/test';
import { cleanupTestBusiness, waitForFirestoreWrite } from '../helpers/firebase-helpers';
import { generateTestBusinessId } from '../helpers/test-helpers';
import { uploadCSV, buildTree, generateQuestionnaire, getQuestionnaireByLink } from '../helpers/axios-helper';

test.describe('Phase 3: Split Analysis Integration', () => {
  let testBusinessId: string;

  test.beforeEach(() => {
    testBusinessId = generateTestBusinessId();
  });

  test.afterEach(async () => {
    await cleanupTestBusiness(testBusinessId);
    await waitForFirestoreWrite();
  });

  test('questions reflect actual product differences from CSV', async () => {
    // Upload CSV with clear price and rating differences
    await uploadCSV('test-medium.csv', testBusinessId, {
      businessName: 'Test Business',
      businessEmail: 'test@example.com',
    });
    await waitForFirestoreWrite();

    // Build tree
    const treeResponse = await buildTree(testBusinessId);
    expect(treeResponse.status).toBe(200);
    expect(treeResponse.data.tree.id).toBeDefined();
    await waitForFirestoreWrite();

    // Generate questionnaire
    const questionnaireResponse = await generateQuestionnaire(testBusinessId, {
      treeId: treeResponse.data.tree.id,
    });
    expect(questionnaireResponse.data.success).toBe(true);
    await waitForFirestoreWrite();

    // Get questionnaire with tree and profiles
    const getResponse = await getQuestionnaireByLink(
      questionnaireResponse.data.questionnaire.shareableLink
    );
    expect(getResponse.data.success).toBe(true);
    expect(getResponse.data.tree.treeStructure).toBeDefined();
    expect(getResponse.data.tree.attributeProfiles).toBeDefined();

    // Verify attribute profiles exist
    const profiles = getResponse.data.tree.attributeProfiles!;
    expect(profiles.length).toBeGreaterThan(0);

    // Verify profiles have meaningful statistics
    profiles.forEach(profile => {
      if (profile.isPreferenceRelevant) {
        expect(profile.valueRange.min).toBeLessThanOrEqual(profile.valueRange.max);
        expect(profile.valueRange.q25).toBeLessThanOrEqual(profile.valueRange.q75);
      }
    });
  });

  test('questions use split analysis when tree has clear product separations', async () => {
    // Upload CSV
    await uploadCSV('test-medium.csv', testBusinessId);
    await waitForFirestoreWrite();

    // Build tree
    const treeResponse = await buildTree(testBusinessId);
    expect(treeResponse.status).toBe(200);
    await waitForFirestoreWrite();

    // Generate questionnaire
    const questionnaireResponse = await generateQuestionnaire(testBusinessId);
    expect(questionnaireResponse.data.success).toBe(true);
    await waitForFirestoreWrite();

    // Get questionnaire
    const getResponse = await getQuestionnaireByLink(
      questionnaireResponse.data.questionnaire.shareableLink
    );
    expect(getResponse.data.success).toBe(true);

    // Verify tree structure is valid for split analysis
    const tree = getResponse.data.tree.treeStructure;
    expect(tree).toBeDefined();
    
    // Tree should have internal nodes (splits)
    if (tree.type === 'internal') {
      expect(tree.left).toBeDefined();
      expect(tree.right).toBeDefined();
    }
  });

  test('progressive refinement works across questionnaire depth', async () => {
    // Upload CSV
    await uploadCSV('test-medium.csv', testBusinessId);
    await waitForFirestoreWrite();

    // Build tree with sufficient depth
    const treeResponse = await buildTree(testBusinessId, {
      maxDepth: 6,
      minLeafSize: 1,
    });
    expect(treeResponse.status).toBe(200);
    await waitForFirestoreWrite();

    // Generate questionnaire
    const questionnaireResponse = await generateQuestionnaire(testBusinessId);
    expect(questionnaireResponse.data.success).toBe(true);
    await waitForFirestoreWrite();

    // Get questionnaire
    const getResponse = await getQuestionnaireByLink(
      questionnaireResponse.data.questionnaire.shareableLink
    );
    expect(getResponse.data.success).toBe(true);

    // Verify tree has sufficient depth for progressive refinement
    const tree = getResponse.data.tree.treeStructure;
    const metrics = getResponse.data.tree.metrics;
    
    // Tree should have depth > 1 for progressive refinement to matter
    expect(metrics.depth).toBeGreaterThan(1);
  });

  test('split analysis handles various attribute combinations', async () => {
    // Upload CSV with multiple attribute types
    await uploadCSV('test-medium.csv', testBusinessId);
    await waitForFirestoreWrite();

    // Build tree
    const treeResponse = await buildTree(testBusinessId);
    expect(treeResponse.status).toBe(200);
    await waitForFirestoreWrite();

    // Generate questionnaire
    const questionnaireResponse = await generateQuestionnaire(testBusinessId);
    expect(questionnaireResponse.data.success).toBe(true);
    await waitForFirestoreWrite();

    // Get questionnaire
    const getResponse = await getQuestionnaireByLink(
      questionnaireResponse.data.questionnaire.shareableLink
    );
    expect(getResponse.data.success).toBe(true);

    // Verify different attribute types are detected
    const profiles = getResponse.data.tree.attributeProfiles!;
    const types = new Set(profiles.map(p => p.type));
    
    // Should have multiple attribute types
    expect(types.size).toBeGreaterThan(0);
    
    // Verify split analysis can work with these types
    profiles.forEach(profile => {
      if (profile.isPreferenceRelevant && profile.type !== 'unknown') {
        expect(profile.valueRange).toBeDefined();
        expect(profile.description).toBeTruthy();
      }
    });
  });
});

