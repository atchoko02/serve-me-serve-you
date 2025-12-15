// Integration tests for Phase 2: Enhanced Question Generation
// Tests the full flow from CSV upload to question generation with value ranges
import { test, expect } from '@playwright/test';
import { cleanupTestBusiness, waitForFirestoreWrite } from '../helpers/firebase-helpers';
import { generateTestBusinessId } from '../helpers/test-helpers';
import { uploadCSV, buildTree, generateQuestionnaire, getQuestionnaireByLink } from '../helpers/axios-helper';

test.describe('Phase 2: Enhanced Question Generation Integration', () => {
  let testBusinessId: string;

  test.beforeEach(() => {
    testBusinessId = generateTestBusinessId();
  });

  test.afterEach(async () => {
    await cleanupTestBusiness(testBusinessId);
    await waitForFirestoreWrite();
  });

  test('generates value range-aware questions from real CSV data', async () => {
    // Upload CSV with price and rating
    await uploadCSV('test-small.csv', testBusinessId, {
      businessName: 'Test Business',
      businessEmail: 'test@example.com',
    });
    await waitForFirestoreWrite();

    // Build tree (this generates attribute profiles)
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
    expect(getResponse.data.tree.attributeProfiles!.length).toBeGreaterThan(0);

    // Verify attribute profiles contain value ranges
    const profiles = getResponse.data.tree.attributeProfiles!;
    const priceProfile = profiles.find(p => p.name.toLowerCase().includes('price'));
    const ratingProfile = profiles.find(p => p.name.toLowerCase().includes('rating'));

    if (priceProfile) {
      expect(priceProfile.valueRange).toBeDefined();
      expect(priceProfile.valueRange.min).toBeDefined();
      expect(priceProfile.valueRange.max).toBeDefined();
      expect(priceProfile.valueRange.q25).toBeDefined();
      expect(priceProfile.valueRange.q75).toBeDefined();
    }

    if (ratingProfile) {
      expect(ratingProfile.valueRange).toBeDefined();
      expect(ratingProfile.valueRange.min).toBeDefined();
      expect(ratingProfile.valueRange.max).toBeDefined();
    }
  });

  test('questions reference actual value ranges from CSV', async () => {
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
    expect(getResponse.data.tree.attributeProfiles).toBeDefined();

    // Verify profiles have meaningful value ranges
    const profiles = getResponse.data.tree.attributeProfiles!;
    profiles.forEach(profile => {
      if (profile.isPreferenceRelevant) {
        expect(profile.valueRange.min).toBeLessThanOrEqual(profile.valueRange.max);
        expect(profile.valueRange.q25).toBeLessThanOrEqual(profile.valueRange.q75);
        expect(profile.valueRange.median).toBeGreaterThanOrEqual(profile.valueRange.q25);
        expect(profile.valueRange.median).toBeLessThanOrEqual(profile.valueRange.q75);
      }
    });
  });

  test('handles different attribute types correctly', async () => {
    // Upload CSV with various attribute types
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
    
    // Should have at least one meaningful attribute type
    expect(types.size).toBeGreaterThan(0);
    
    // Verify type-specific properties
    profiles.forEach(profile => {
      if (profile.type === 'price') {
        expect(profile.direction).toBe('lower_better');
        expect(profile.unit).toBe('dollars');
      } else if (profile.type === 'rating') {
        expect(profile.direction).toBe('higher_better');
      } else if (profile.type === 'duration') {
        expect(profile.direction).toBe('lower_better');
        expect(profile.unit).toBeDefined();
      }
    });
  });
});

