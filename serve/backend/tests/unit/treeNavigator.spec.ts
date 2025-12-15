/// Unit tests for tree navigation utilities
import { test, expect } from '@playwright/test';
import {
  navigateTree,
  isLeafNode,
  getProductsFromLeaf,
  calculateProjection,
  getProductSide,
} from '../../src/utils/treeNavigator';
import {
  ObliqueTreeNode,
  ProductVector,
  buildObliqueTreeFromCSV,
} from '../../src/utils/decisionTree';

// Helper to create a simple test tree
function createTestTree(): ObliqueTreeNode {
  const products: ProductVector[] = [
    { id: '1', values: [0.2, 0.3], originalRow: ['1', '10', '4.5'] },
    { id: '2', values: [0.8, 0.7], originalRow: ['2', '20', '4.0'] },
  ];

  return {
    type: 'internal',
    featureNames: ['price', 'rating'],
    weights: [1, 0],
    threshold: 0.5,
    sampleCount: 2,
    left: {
      type: 'leaf',
      featureNames: ['price', 'rating'],
      products: [products[0]],
    },
    right: {
      type: 'leaf',
      featureNames: ['price', 'rating'],
      products: [products[1]],
    },
  };
}

test.describe('Tree Navigation Utilities', () => {
  test.describe('navigateTree', () => {
    test('navigates left from internal node', () => {
      const tree = createTestTree();
      if (tree.type !== 'internal') throw new Error('Expected internal node');

      const leftNode = navigateTree(tree, 'left');

      expect(leftNode.type).toBe('leaf');
      if (leftNode.type === 'leaf') {
        expect(leftNode.products).toHaveLength(1);
        expect(leftNode.products[0].id).toBe('1');
      }
    });

    test('navigates right from internal node', () => {
      const tree = createTestTree();
      if (tree.type !== 'internal') throw new Error('Expected internal node');

      const rightNode = navigateTree(tree, 'right');

      expect(rightNode.type).toBe('leaf');
      if (rightNode.type === 'leaf') {
        expect(rightNode.products).toHaveLength(1);
        expect(rightNode.products[0].id).toBe('2');
      }
    });

    test('throws error when navigating from leaf node', () => {
      const tree = createTestTree();
      if (tree.type !== 'internal') throw new Error('Expected internal node');
      const leafNode = tree.left;

      expect(() => navigateTree(leafNode, 'left')).toThrow(
        'Cannot navigate from a leaf node'
      );
    });
  });

  test.describe('isLeafNode', () => {
    test('returns true for leaf nodes', () => {
      const tree = createTestTree();
      if (tree.type !== 'internal') throw new Error('Expected internal node');

      expect(isLeafNode(tree.left)).toBe(true);
      expect(isLeafNode(tree.right)).toBe(true);
    });

    test('returns false for internal nodes', () => {
      const tree = createTestTree();

      expect(isLeafNode(tree)).toBe(false);
    });
  });

  test.describe('getProductsFromLeaf', () => {
    test('extracts products from leaf node', () => {
      const tree = createTestTree();
      if (tree.type !== 'internal') throw new Error('Expected internal node');
      const leafNode = tree.left;

      const products = getProductsFromLeaf(leafNode);

      expect(products).toHaveLength(1);
      expect(products[0].id).toBe('1');
    });

    test('throws error when called on internal node', () => {
      const tree = createTestTree();

      expect(() => getProductsFromLeaf(tree)).toThrow('Node is not a leaf');
    });
  });

  test.describe('calculateProjection', () => {
    test('calculates correct dot product', () => {
      const product: ProductVector = {
        id: '1',
        values: [0.5, 0.3],
        originalRow: [],
      };
      const weights = [1, 2];

      const projection = calculateProjection(product, weights);

      // 0.5 * 1 + 0.3 * 2 = 0.5 + 0.6 = 1.1
      expect(projection).toBeCloseTo(1.1);
    });

    test('handles zero weights', () => {
      const product: ProductVector = {
        id: '1',
        values: [0.5, 0.3],
        originalRow: [],
      };
      const weights = [0, 0];

      const projection = calculateProjection(product, weights);

      expect(projection).toBe(0);
    });

    test('throws error on dimension mismatch', () => {
      const product: ProductVector = {
        id: '1',
        values: [0.5, 0.3],
        originalRow: [],
      };
      const weights = [1, 2, 3]; // Different length

      expect(() => calculateProjection(product, weights)).toThrow(
        'Product values and weights length mismatch'
      );
    });
  });

  test.describe('getProductSide', () => {
    test('products below threshold go left', () => {
      const product: ProductVector = {
        id: '1',
        values: [0.3, 0.2],
        originalRow: [],
      };
      const weights = [1, 0];
      const threshold = 0.5;

      const side = getProductSide(product, weights, threshold);

      expect(side).toBe('left');
    });

    test('products above threshold go right', () => {
      const product: ProductVector = {
        id: '1',
        values: [0.7, 0.8],
        originalRow: [],
      };
      const weights = [1, 0];
      const threshold = 0.5;

      const side = getProductSide(product, weights, threshold);

      expect(side).toBe('right');
    });

    test('products exactly at threshold go left', () => {
      const product: ProductVector = {
        id: '1',
        values: [0.5, 0.0],
        originalRow: [],
      };
      const weights = [1, 0];
      const threshold = 0.5;

      const side = getProductSide(product, weights, threshold);

      expect(side).toBe('left'); // <= threshold goes left
    });
  });

  test.describe('Integration with real tree', () => {
    test('navigates through a real decision tree', () => {
      const headers = ['id', 'price', 'rating'];
      const data = [
        ['1', '10', '4.5'],
        ['2', '20', '4.0'],
        ['3', '10', '4.8'],
        ['4', '20', '3.5'],
        ['5', '10', '4.0'],
      ];

      const tree = buildObliqueTreeFromCSV(
        { headers, data },
        { maxDepth: 3, minLeafSize: 1 }
      );

      // Navigate through tree
      let currentNode = tree;
      let depth = 0;
      const maxDepth = 5;

      while (!isLeafNode(currentNode) && depth < maxDepth) {
        if (currentNode.type === 'internal') {
          // Navigate left
          currentNode = navigateTree(currentNode, 'left');
          depth++;
        }
      }

      // Should eventually reach a leaf
      expect(isLeafNode(currentNode)).toBe(true);
      if (currentNode.type === 'leaf') {
        expect(currentNode.products.length).toBeGreaterThan(0);
      }
    });
  });
});

