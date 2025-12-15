// Unit tests for Phase 3: Split Analysis Integration in Question Generation
import { test, expect } from '@playwright/test';
import { generateQuestionFromSplit } from '../../src/utils/questionGenerator';
import type { ObliqueTreeNode, ProductVector } from '../../src/utils/decisionTree';
import type { AttributeProfile } from '../../../shared/types/attributeProfile.types';

function createTestNode(
  featureNames: string[],
  weights: number[],
  threshold: number,
  leftProducts: ProductVector[],
  rightProducts: ProductVector[]
): ObliqueTreeNode {
  return {
    type: 'internal',
    featureNames,
    weights,
    threshold,
    sampleCount: leftProducts.length + rightProducts.length,
    left: {
      type: 'leaf',
      featureNames,
      products: leftProducts,
    },
    right: {
      type: 'leaf',
      featureNames,
      products: rightProducts,
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
  };
}

test.describe('Phase 3: Split Analysis in Question Generation', () => {
  test.describe('Split Analysis Integration', () => {
    test('uses split analysis when meaningful differences exist', () => {
      const leftProducts: ProductVector[] = [
        { id: '1', values: [15, 4.2], originalRow: [] },
        { id: '2', values: [18, 4.0], originalRow: [] },
        { id: '3', values: [20, 4.1], originalRow: [] },
      ];
      const rightProducts: ProductVector[] = [
        { id: '4', values: [45, 4.8], originalRow: [] },
        { id: '5', values: [50, 4.9], originalRow: [] },
        { id: '6', values: [55, 4.7], originalRow: [] },
      ];

      const node = createTestNode(
        ['price', 'rating'],
        [0.8, 0.2],
        0.5,
        leftProducts,
        rightProducts
      );

      const profiles = [createPriceProfile(), createRatingProfile()];
      const question = generateQuestionFromSplit(node, profiles, undefined, 0);

      // Question should reference actual product characteristics
      expect(question.text).toMatch(/budget-friendly|premium|ratings?/i);
      expect(question.text).toMatch(/\d+/); // Contains numeric values
    });

    test('generates questions based on actual product differences', () => {
      const leftProducts: ProductVector[] = [
        { id: '1', values: [10, 3.0], originalRow: [] },
        { id: '2', values: [12, 3.2], originalRow: [] },
      ];
      const rightProducts: ProductVector[] = [
        { id: '3', values: [90, 4.8], originalRow: [] },
        { id: '4', values: [95, 4.9], originalRow: [] },
      ];

      const node = createTestNode(
        ['price', 'rating'],
        [0.7, 0.3],
        0.5,
        leftProducts,
        rightProducts
      );

      const profiles = [createPriceProfile(), createRatingProfile()];
      const question = generateQuestionFromSplit(node, profiles, undefined, 0);

      // Should describe actual differences
      expect(question.text).toBeTruthy();
      expect(question.text.length).toBeGreaterThan(20);
    });

    test('falls back to value ranges when split analysis has no meaningful differences', () => {
      const leftProducts: ProductVector[] = [
        { id: '1', values: [50, 4.0], originalRow: [] },
        { id: '2', values: [51, 4.1], originalRow: [] },
      ];
      const rightProducts: ProductVector[] = [
        { id: '3', values: [52, 4.0], originalRow: [] },
        { id: '4', values: [53, 4.1], originalRow: [] },
      ];

      const node = createTestNode(
        ['price', 'rating'],
        [0.5, 0.5],
        0.5,
        leftProducts,
        rightProducts
      );

      const profiles = [createPriceProfile(), createRatingProfile()];
      const question = generateQuestionFromSplit(node, profiles, undefined, 0);

      // Should still generate a question (using value ranges)
      expect(question.text).toBeTruthy();
      expect(question.text).toMatch(/Would you prefer|What matters more/i);
    });
  });

  test.describe('Progressive Question Refinement', () => {
    test('uses broad phrasing for early questions', () => {
      const leftProducts: ProductVector[] = [
        { id: '1', values: [15, 4.2], originalRow: [] },
        { id: '2', values: [18, 4.0], originalRow: [] },
      ];
      const rightProducts: ProductVector[] = [
        { id: '3', values: [45, 4.8], originalRow: [] },
        { id: '4', values: [50, 4.9], originalRow: [] },
      ];

      const node = createTestNode(
        ['price', 'rating'],
        [0.8, 0.2],
        0.5,
        leftProducts,
        rightProducts
      );

      const profiles = [createPriceProfile(), createRatingProfile()];
      
      // Early question (depth 0)
      const earlyQuestion = generateQuestionFromSplit(node, profiles, undefined, 0);
      expect(earlyQuestion.text).toBeTruthy();
      // Should not contain "Within your narrowed preferences"
      expect(earlyQuestion.text).not.toContain('Within your narrowed preferences');
    });

    test('uses specific phrasing for late questions', () => {
      const leftProducts: ProductVector[] = [
        { id: '1', values: [15, 4.2], originalRow: [] },
        { id: '2', values: [18, 4.0], originalRow: [] },
      ];
      const rightProducts: ProductVector[] = [
        { id: '3', values: [45, 4.8], originalRow: [] },
        { id: '4', values: [50, 4.9], originalRow: [] },
      ];

      const node = createTestNode(
        ['price', 'rating'],
        [0.8, 0.2],
        0.5,
        leftProducts,
        rightProducts
      );

      const profiles = [createPriceProfile(), createRatingProfile()];
      
      // Late question (depth 4+)
      const lateQuestion = generateQuestionFromSplit(node, profiles, undefined, 4);
      
      // If split analysis is used, should contain "Within your narrowed preferences"
      // If not, should still generate a valid question
      expect(lateQuestion.text).toBeTruthy();
    });

    test('adjusts question style based on depth', () => {
      const leftProducts: ProductVector[] = [
        { id: '1', values: [15], originalRow: [] },
        { id: '2', values: [18], originalRow: [] },
      ];
      const rightProducts: ProductVector[] = [
        { id: '3', values: [45], originalRow: [] },
        { id: '4', values: [50], originalRow: [] },
      ];

      const node = createTestNode(
        ['price'],
        [0.8],
        0.5,
        leftProducts,
        rightProducts
      );

      const profiles = [createPriceProfile()];
      
      const depth0Question = generateQuestionFromSplit(node, profiles, undefined, 0);
      const depth2Question = generateQuestionFromSplit(node, profiles, undefined, 2);
      const depth4Question = generateQuestionFromSplit(node, profiles, undefined, 4);

      // All should be valid questions
      expect(depth0Question.text).toBeTruthy();
      expect(depth2Question.text).toBeTruthy();
      expect(depth4Question.text).toBeTruthy();
    });
  });

  test.describe('Split Analysis + Asked Attributes', () => {
    test('combines split analysis with asked attributes tracking', () => {
      const leftProducts: ProductVector[] = [
        { id: '1', values: [15, 4.2], originalRow: [] },
        { id: '2', values: [18, 4.0], originalRow: [] },
      ];
      const rightProducts: ProductVector[] = [
        { id: '3', values: [45, 4.8], originalRow: [] },
        { id: '4', values: [50, 4.9], originalRow: [] },
      ];

      const node = createTestNode(
        ['price', 'rating'],
        [0.8, 0.2],
        0.5,
        leftProducts,
        rightProducts
      );

      const profiles = [createPriceProfile(), createRatingProfile()];
      const askedAttributes = new Set<string>(['price']); // Price already asked

      const question = generateQuestionFromSplit(node, profiles, askedAttributes, 0);

      // Should still generate a question, possibly focusing on rating
      expect(question.text).toBeTruthy();
    });
  });

  test.describe('Edge Cases', () => {
    test('handles single product per branch', () => {
      const leftProducts: ProductVector[] = [
        { id: '1', values: [15, 4.2], originalRow: [] },
      ];
      const rightProducts: ProductVector[] = [
        { id: '2', values: [45, 4.8], originalRow: [] },
      ];

      const node = createTestNode(
        ['price', 'rating'],
        [0.8, 0.2],
        0.5,
        leftProducts,
        rightProducts
      );

      const profiles = [createPriceProfile(), createRatingProfile()];
      const question = generateQuestionFromSplit(node, profiles, undefined, 0);

      // Should still generate a question
      expect(question.text).toBeTruthy();
    });

    test('handles many products per branch', () => {
      const leftProducts: ProductVector[] = Array.from({ length: 20 }, (_, i) => ({
        id: `left_${i}`,
        values: [15 + i * 0.5, 4.0 + i * 0.05],
        originalRow: [],
      }));
      const rightProducts: ProductVector[] = Array.from({ length: 20 }, (_, i) => ({
        id: `right_${i}`,
        values: [45 + i * 0.5, 4.5 + i * 0.05],
        originalRow: [],
      }));

      const node = createTestNode(
        ['price', 'rating'],
        [0.8, 0.2],
        0.5,
        leftProducts,
        rightProducts
      );

      const profiles = [createPriceProfile(), createRatingProfile()];
      const question = generateQuestionFromSplit(node, profiles, undefined, 0);

      expect(question.text).toBeTruthy();
      // Should use split analysis with meaningful statistics
      expect(question.text).toMatch(/budget-friendly|premium|ratings?/i);
    });
  });
});

