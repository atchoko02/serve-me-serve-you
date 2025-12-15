// Unit tests for Phase 2: Enhanced Question Generation
// Tests value range-aware questions, attribute-specific templates, and tradeoff representation
import { test, expect } from '@playwright/test';
import { generateQuestionFromSplit } from '../../src/utils/questionGenerator';
import type { ObliqueTreeNode } from '../../src/utils/decisionTree';
import type { AttributeProfile } from '../../../shared/types/attributeProfile.types';

function createTestNode(
  featureNames: string[],
  weights: number[],
  threshold: number = 0.5
): ObliqueTreeNode {
  return {
    type: 'internal',
    featureNames,
    weights,
    threshold,
    sampleCount: 10,
    left: {
      type: 'leaf',
      featureNames,
      products: [],
    },
    right: {
      type: 'leaf',
      featureNames,
      products: [],
    },
  };
}

function createPriceProfile(name: string = 'price'): AttributeProfile {
  return {
    name,
    type: 'price',
    isPreferenceRelevant: true,
    valueRange: {
      min: 10,
      max: 100,
      mean: 50,
      median: 45,
      stdDev: 20,
      q25: 25,
      q75: 75,
    },
    scale: 'medium',
    direction: 'lower_better',
    description: 'affordability',
    unit: 'dollars',
    categorical: false,
    uniqueValues: 50,
    uniqueValueRatio: 0.5,
  };
}

function createRatingProfile(name: string = 'rating'): AttributeProfile {
  return {
    name,
    type: 'rating',
    isPreferenceRelevant: true,
    valueRange: {
      min: 1,
      max: 5,
      mean: 4,
      median: 4.2,
      stdDev: 0.8,
      q25: 3.5,
      q75: 4.5,
    },
    scale: 'small',
    direction: 'higher_better',
    description: 'customer ratings',
    categorical: false,
    uniqueValues: 20,
    uniqueValueRatio: 0.2,
  };
}

function createDurationProfile(name: string = 'shipping_days'): AttributeProfile {
  return {
    name,
    type: 'duration',
    isPreferenceRelevant: true,
    valueRange: {
      min: 1,
      max: 7,
      mean: 3,
      median: 3,
      stdDev: 1.5,
      q25: 2,
      q75: 4,
    },
    scale: 'small',
    direction: 'lower_better',
    description: 'shipping speed',
    unit: 'days',
    categorical: false,
    uniqueValues: 7,
    uniqueValueRatio: 0.1,
  };
}

test.describe('Phase 2: Enhanced Question Generation', () => {
  test.describe('Value Range-Aware Questions', () => {
    test('generates price questions with value ranges', () => {
      const node = createTestNode(['price'], [0.8], 0.5);
      const profiles = [createPriceProfile()];

      const question = generateQuestionFromSplit(node, profiles);

      expect(question.text).toContain('budget-friendly');
      expect(question.text).toContain('premium');
      expect(question.text).toMatch(/\$\d+\.?\d*/); // Contains dollar amounts
    });

    test('generates rating questions with value ranges', () => {
      const node = createTestNode(['rating'], [0.7], 0.5);
      const profiles = [createRatingProfile()];

      const question = generateQuestionFromSplit(node, profiles);

      expect(question.text).toMatch(/ratings?/i);
      expect(question.text).toMatch(/\d+\.?\d*/); // Contains numeric values
    });

    test('generates duration questions with value ranges', () => {
      const node = createTestNode(['shipping_days'], [0.6], 0.5);
      const profiles = [createDurationProfile()];

      const question = generateQuestionFromSplit(node, profiles);

      expect(question.text).toMatch(/faster|slower|days?/i);
      expect(question.text).toMatch(/\d+/); // Contains numeric values
    });
  });

  test.describe('Attribute-Specific Templates', () => {
    test('uses price-specific template', () => {
      const node = createTestNode(['price'], [0.8], 0.5);
      const profiles = [createPriceProfile()];

      const question = generateQuestionFromSplit(node, profiles);

      // Price template: "Would you prefer X or Y?"
      expect(question.text).toMatch(/Would you prefer/i);
      expect(question.text).toContain('or');
    });

    test('uses rating-specific template', () => {
      const node = createTestNode(['rating'], [0.7], 0.5);
      const profiles = [createRatingProfile()];

      const question = generateQuestionFromSplit(node, profiles);

      // Rating template: "Do you prioritize X or are you open to Y?"
      expect(question.text).toMatch(/prioritize|open to/i);
    });

    test('uses duration-specific template', () => {
      const node = createTestNode(['shipping_days'], [0.6], 0.5);
      const profiles = [createDurationProfile()];

      const question = generateQuestionFromSplit(node, profiles);

      // Duration template: "Do you value X or are you willing to accept Y?"
      expect(question.text).toMatch(/value|willing|accept/i);
    });
  });

  test.describe('Multi-Attribute Tradeoff Representation', () => {
    test('shows tradeoff when multiple attributes are balanced', () => {
      const node = createTestNode(
        ['price', 'rating'],
        [0.5, 0.5], // Balanced weights
        0.5
      );
      const profiles = [createPriceProfile(), createRatingProfile()];

      const question = generateQuestionFromSplit(node, profiles);

      // When attributes are balanced, should show both attributes clearly
      // The question should reference both price and rating
      expect(question.text).toMatch(/budget-friendly|premium|affordability/i);
      expect(question.text).toMatch(/ratings?/i);
      expect(question.text).toContain('and'); // Shows both attributes
    });

    test('uses simple question when one attribute dominates', () => {
      const node = createTestNode(
        ['price', 'rating'],
        [0.9, 0.1], // Price dominates
        0.5
      );
      const profiles = [createPriceProfile(), createRatingProfile()];

      const question = generateQuestionFromSplit(node, profiles);

      // Should use simpler question when one attribute dominates
      expect(question.text).toMatch(/Would you prefer|What matters more/i);
    });

    test('handles three attributes correctly', () => {
      const node = createTestNode(
        ['price', 'rating', 'shipping_days'],
        [0.4, 0.4, 0.2],
        0.5
      );
      const profiles = [
        createPriceProfile(),
        createRatingProfile(),
        createDurationProfile(),
      ];

      const question = generateQuestionFromSplit(node, profiles);

      expect(question.text).toBeTruthy();
      expect(question.text.length).toBeGreaterThan(0);
    });
  });

  test.describe('Fallback Behavior', () => {
    test('falls back to generic templates when profiles are missing', () => {
      const node = createTestNode(['price'], [0.8], 0.5);

      const question = generateQuestionFromSplit(node, undefined);

      expect(question.text).toBeTruthy();
      expect(question.text).toMatch(/Would you prefer|What matters more|Which do you value/i);
    });

    test('falls back to generic descriptions when profile type is unknown', () => {
      const unknownProfile: AttributeProfile = {
        name: 'custom_attr',
        type: 'unknown',
        isPreferenceRelevant: true,
        valueRange: {
          min: 0,
          max: 100,
          mean: 50,
          median: 50,
          stdDev: 20,
          q25: 25,
          q75: 75,
        },
        scale: 'medium',
        direction: 'neutral',
        description: 'custom attribute',
      };

      const node = createTestNode(['custom_attr'], [0.8], 0.5);
      const question = generateQuestionFromSplit(node, [unknownProfile]);

      expect(question.text).toBeTruthy();
      expect(question.text).toContain('custom attribute');
    });
  });

  test.describe('Edge Cases', () => {
    test('handles very small value ranges', () => {
      const smallRangeProfile: AttributeProfile = {
        name: 'price',
        type: 'price',
        isPreferenceRelevant: true,
        valueRange: {
          min: 10,
          max: 12,
          mean: 11,
          median: 11,
          stdDev: 0.5,
          q25: 10.5,
          q75: 11.5,
        },
        scale: 'small',
        direction: 'lower_better',
        description: 'affordability',
        unit: 'dollars',
      };

      const node = createTestNode(['price'], [0.8], 0.5);
      const question = generateQuestionFromSplit(node, [smallRangeProfile]);

      expect(question.text).toBeTruthy();
    });

    test('handles very large value ranges', () => {
      const largeRangeProfile: AttributeProfile = {
        name: 'price',
        type: 'price',
        isPreferenceRelevant: true,
        valueRange: {
          min: 1,
          max: 10000,
          mean: 5000,
          median: 4500,
          stdDev: 2000,
          q25: 2500,
          q75: 7500,
        },
        scale: 'large',
        direction: 'lower_better',
        description: 'affordability',
        unit: 'dollars',
      };

      const node = createTestNode(['price'], [0.8], 0.5);
      const question = generateQuestionFromSplit(node, [largeRangeProfile]);

      expect(question.text).toBeTruthy();
      expect(question.text).toContain('budget-friendly');
      expect(question.text).toContain('premium');
    });

    test('handles negative weights correctly', () => {
      const node = createTestNode(['price'], [-0.8], 0.5);
      const profiles = [createPriceProfile()];

      const question = generateQuestionFromSplit(node, profiles);

      expect(question.text).toBeTruthy();
      // With negative weight, the direction should be reversed
      expect(question.text).toContain('or');
    });
  });

  test.describe('Question Quality', () => {
    test('generates questions that are easy to understand', () => {
      const node = createTestNode(['price', 'rating'], [0.6, 0.4], 0.5);
      const profiles = [createPriceProfile(), createRatingProfile()];

      const question = generateQuestionFromSplit(node, profiles);

      // Questions should be readable
      expect(question.text.length).toBeGreaterThan(20);
      expect(question.text.length).toBeLessThan(200);
      expect(question.text).toMatch(/[?]$/); // Ends with question mark
    });

    test('questions reference actual data values', () => {
      const node = createTestNode(['price'], [0.8], 0.5);
      const profiles = [createPriceProfile()];

      const question = generateQuestionFromSplit(node, profiles);

      // Should contain numeric values from the profile
      expect(question.text).toMatch(/\d+/);
    });

    test('questions avoid technical jargon', () => {
      const node = createTestNode(['price'], [0.8], 0.5);
      const profiles = [createPriceProfile()];

      const question = generateQuestionFromSplit(node, profiles);

      // Should not contain technical terms
      expect(question.text).not.toMatch(/hyperplane|weight|threshold|vector/i);
      expect(question.text).not.toMatch(/q25|q75|percentile/i);
    });
  });
});

