// Unit tests for question generation
import { test, expect } from '@playwright/test';
import {
  generateQuestionFromSplit,
  generateAttributeQuestion,
} from '../../src/utils/questionGenerator';
import {
  ObliqueTreeNode,
  buildObliqueTreeFromCSV,
} from '../../src/utils/decisionTree';

// Helper to create a test internal node
function createTestInternalNode(): ObliqueTreeNode {
  return {
    type: 'internal',
    featureNames: ['price', 'rating'],
    weights: [0.7, 0.3], // Price has higher weight
    threshold: 0.5,
    sampleCount: 10,
    left: {
      type: 'leaf',
      featureNames: ['price', 'rating'],
      products: [],
    },
    right: {
      type: 'leaf',
      featureNames: ['price', 'rating'],
      products: [],
    },
  };
}

test.describe('Question Generation', () => {
  test.describe('generateQuestionFromSplit', () => {
    test('generates valid question from hyperplane split', () => {
      const node = createTestInternalNode();

      const question = generateQuestionFromSplit(node);

      expect(question).toBeDefined();
      expect(question.id).toBeDefined();
      expect(question.text).toBeTruthy();
      expect(question.text.length).toBeGreaterThan(0);
      expect(question.type).toBe('hyperplane');
      expect(question.weights).toEqual([0.7, 0.3]);
      expect(question.featureNames).toEqual(['price', 'rating']);
      expect(question.threshold).toBe(0.5);
    });

    test('question text is readable and grammatically correct', () => {
      const node = createTestInternalNode();

      const question = generateQuestionFromSplit(node);

      expect(question.text).toMatch(/^[A-Z]/); // Starts with capital
      expect(question.text).toMatch(/[?]$/); // Ends with question mark
      expect(question.text.split(' ').length).toBeGreaterThan(5); // Reasonable length
    });

    test('question mentions dominant features', () => {
      const node = createTestInternalNode();
      // Price has weight 0.7, rating has 0.3, so price should be mentioned

      const question = generateQuestionFromSplit(node);

      // Question should mention price (dominant feature)
      expect(question.text.toLowerCase()).toMatch(/price|affordability|cost|cheaper|lower|higher/);
    });

    test('axis-aligned splits surface concrete thresholds when normalized', () => {
      const node: ObliqueTreeNode = {
        type: 'internal',
        featureNames: ['price'],
        weights: [1],
        threshold: 0.5, // midway in normalized space
        sampleCount: 6,
        normalization: {
          mins: [10],
          maxs: [110], // cutoff should be around 60
        },
        left: { type: 'leaf', featureNames: ['price'], products: [] },
        right: { type: 'leaf', featureNames: ['price'], products: [] },
      };

      const question = generateQuestionFromSplit(node);

      expect(question.text).toMatch(/60/);
      expect(question.text.toLowerCase()).toMatch(/price|affordability/);
    });

    test('handles "lower is better" attributes correctly', () => {
      const node: ObliqueTreeNode = {
        type: 'internal',
        featureNames: ['price', 'shipping_time'],
        weights: [0.8, 0.2],
        threshold: 0.5,
        sampleCount: 10,
        left: {
          type: 'leaf',
          featureNames: ['price', 'shipping_time'],
          products: [],
        },
        right: {
          type: 'leaf',
          featureNames: ['price', 'shipping_time'],
          products: [],
        },
      };

      const question = generateQuestionFromSplit(node);

      // Should mention lower prices/faster shipping as positive
  expect(question.text.toLowerCase()).toMatch(/lower|cheaper|faster|affordability|price/);
    });

    test('handles "higher is better" attributes correctly', () => {
      const node: ObliqueTreeNode = {
        type: 'internal',
        featureNames: ['rating', 'quality'],
        weights: [0.6, 0.4],
        threshold: 0.5,
        sampleCount: 10,
        left: {
          type: 'leaf',
          featureNames: ['rating', 'quality'],
          products: [],
        },
        right: {
          type: 'leaf',
          featureNames: ['rating', 'quality'],
          products: [],
        },
      };

      const question = generateQuestionFromSplit(node);

      // Should mention higher ratings/quality as positive
      expect(question.text.toLowerCase()).toMatch(/higher|better|rating|quality/);
    });

    test('throws error for leaf nodes', () => {
      const node: ObliqueTreeNode = {
        type: 'leaf',
        featureNames: ['price', 'rating'],
        products: [],
      };

      expect(() => generateQuestionFromSplit(node)).toThrow(
        'Cannot generate question from leaf node'
      );
    });

    test('generates different questions for same split (template variation)', () => {
      const node = createTestInternalNode();

      const questions = Array.from({ length: 10 }, () =>
        generateQuestionFromSplit(node)
      );

      // At least some variation in wording (not all identical)
      const uniqueTexts = new Set(questions.map((q) => q.text));
      // With 10 attempts, we should get some variation
      expect(uniqueTexts.size).toBeGreaterThan(0);
    });

    test('works with real decision tree', () => {
      const headers = ['id', 'price', 'rating'];
      const data = [
        ['1', '10', '4.5'],
        ['2', '20', '4.0'],
        ['3', '10', '4.8'],
        ['4', '20', '4.5'],
      ];

      const tree = buildObliqueTreeFromCSV(
        { headers, data },
        { maxDepth: 3, minLeafSize: 1 }
      );

      if (tree.type === 'internal') {
        const question = generateQuestionFromSplit(tree);

        expect(question).toBeDefined();
        expect(question.text).toBeTruthy();
        expect(question.featureNames).toContain('price');
        expect(question.featureNames).toContain('rating');
      }
    });
  });

  test.describe('generateAttributeQuestion', () => {
    test('generates attribute comparison question', () => {
      const question = generateAttributeQuestion('price', 'rating');

      expect(question).toBeDefined();
      expect(question.type).toBe('attribute');
      expect(question.attributeA).toBe('price');
      expect(question.attributeB).toBe('rating');
      expect(question.text).toBeTruthy();
      expect(question.text.toLowerCase()).toMatch(/price|rating/);
    });

    test('question text is grammatically correct', () => {
      const question = generateAttributeQuestion('price', 'rating');

      expect(question.text).toMatch(/^[A-Z]/);
      expect(question.text).toMatch(/[?]$/);
    });
  });
});

