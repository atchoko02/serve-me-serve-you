// Unit tests for Phase 3: Split Analyzer
import { test, expect } from '@playwright/test';
import { analyzeSplit, describeLeftBranch, describeRightBranch } from '../../src/utils/splitAnalyzer';
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

test.describe('Phase 3: Split Analyzer', () => {
  test.describe('analyzeSplit', () => {
    test('analyzes split with price differences', () => {
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

      const analysis = analyzeSplit(node);

      expect(analysis).not.toBeNull();
      expect(analysis!.leftStats.productCount).toBe(3);
      expect(analysis!.rightStats.productCount).toBe(3);
      expect(analysis!.distinguishingAttributes.length).toBeGreaterThan(0);
      
      // Price should be a distinguishing attribute
      const priceAttr = analysis!.distinguishingAttributes.find(a => a.attributeName === 'price');
      expect(priceAttr).toBeDefined();
      expect(priceAttr!.leftValue).toBeLessThan(priceAttr!.rightValue);
    });

    test('returns null for leaf nodes', () => {
      const leafNode: ObliqueTreeNode = {
        type: 'leaf',
        featureNames: ['price'],
        products: [],
      };

      const analysis = analyzeSplit(leafNode);
      expect(analysis).toBeNull();
    });

    test('identifies distinguishing attributes correctly', () => {
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

      const analysis = analyzeSplit(node);

      expect(analysis).not.toBeNull();
      expect(analysis!.distinguishingAttributes.length).toBeGreaterThan(0);
      
      // Both price and rating should be distinguishing
      const priceAttr = analysis!.distinguishingAttributes.find(a => a.attributeName === 'price');
      const ratingAttr = analysis!.distinguishingAttributes.find(a => a.attributeName === 'rating');
      
      expect(priceAttr).toBeDefined();
      expect(ratingAttr).toBeDefined();
      expect(priceAttr!.differencePercent).toBeGreaterThan(5);
      expect(ratingAttr!.differencePercent).toBeGreaterThan(5);
    });

    test('denormalizes values using node normalization metadata', () => {
      const leftProducts: ProductVector[] = [
        { id: '1', values: [0.0], originalRow: [] }, // normalized
        { id: '2', values: [0.1], originalRow: [] },
      ];
      const rightProducts: ProductVector[] = [
        { id: '3', values: [0.9], originalRow: [] },
        { id: '4', values: [1.0], originalRow: [] },
      ];

      const node: ObliqueTreeNode = {
        type: 'internal',
        featureNames: ['price'],
        weights: [1],
        threshold: 0.5,
        sampleCount: 4,
        normalization: { mins: [10], maxs: [110] },
        left: { type: 'leaf', featureNames: ['price'], products: leftProducts },
        right: { type: 'leaf', featureNames: ['price'], products: rightProducts },
      };

      const analysis = analyzeSplit(node);

      expect(analysis).not.toBeNull();
      const leftAvg = analysis!.leftStats.attributeAverages.get('price');
      const rightAvg = analysis!.rightStats.attributeAverages.get('price');

      expect(leftAvg).toBeCloseTo(15, 1); // 10 and 20 avg to ~15
      expect(rightAvg).toBeCloseTo(105, 1); // 100 and 110 avg to ~105
    });

    test('handles splits with no meaningful differences', () => {
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

      const analysis = analyzeSplit(node);

      // Should still return analysis, but with fewer or no distinguishing attributes
      expect(analysis).not.toBeNull();
      // Small differences might not meet the 5% threshold
    });
  });

  test.describe('describeLeftBranch and describeRightBranch', () => {
    test('describes branches with price profiles', () => {
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
      const analysis = analyzeSplit(node, profiles);

      expect(analysis).not.toBeNull();

      const leftDesc = describeLeftBranch(analysis!, profiles);
      const rightDesc = describeRightBranch(analysis!, profiles);

      expect(leftDesc).toContain('budget-friendly');
      expect(rightDesc).toContain('premium');
      expect(leftDesc).toMatch(/\$/); // Contains dollar sign
      expect(rightDesc).toMatch(/\$/); // Contains dollar sign
    });

    test('describes branches with rating profiles', () => {
      const leftProducts: ProductVector[] = [
        { id: '1', values: [3.5], originalRow: [] },
        { id: '2', values: [3.8], originalRow: [] },
      ];
      const rightProducts: ProductVector[] = [
        { id: '3', values: [4.5], originalRow: [] },
        { id: '4', values: [4.8], originalRow: [] },
      ];

      const node = createTestNode(
        ['rating'],
        [0.7],
        0.5,
        leftProducts,
        rightProducts
      );

      const profiles = [createRatingProfile()];
      const analysis = analyzeSplit(node, profiles);

      expect(analysis).not.toBeNull();

      const leftDesc = describeLeftBranch(analysis!, profiles);
      const rightDesc = describeRightBranch(analysis!, profiles);

      expect(leftDesc).toMatch(/ratings?/i);
      expect(rightDesc).toMatch(/ratings?/i);
      expect(leftDesc).toMatch(/\d+\.?\d*/); // Contains numeric value
      expect(rightDesc).toMatch(/\d+\.?\d*/); // Contains numeric value
    });

    test('handles multiple attributes in branch descriptions', () => {
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
        [0.6, 0.4],
        0.5,
        leftProducts,
        rightProducts
      );

      const profiles = [createPriceProfile(), createRatingProfile()];
      const analysis = analyzeSplit(node, profiles);

      expect(analysis).not.toBeNull();

      const leftDesc = describeLeftBranch(analysis!, profiles);
      const rightDesc = describeRightBranch(analysis!, profiles);

      // Should contain both price and rating information
      expect(leftDesc).toMatch(/budget-friendly|premium|ratings?/i);
      expect(rightDesc).toMatch(/budget-friendly|premium|ratings?/i);
    });
  });
});

