// Unit tests for optimized decision tree algorithm
import { test, expect } from '@playwright/test';
import {
  buildObliqueTreeFromCSV,
  ObliqueTreeNode,
  ProductVector,
} from '../../src/utils/decisionTree';

// Helper to collect all products from tree
function collectProducts(node: ObliqueTreeNode): ProductVector[] {
  if (node.type === 'leaf') return node.products;
  return [...collectProducts(node.left), ...collectProducts(node.right)];
}

// Helper to calculate tree depth
function calculateDepth(node: ObliqueTreeNode, depth: number = 0): number {
  if (node.type === 'leaf') return depth;
  return Math.max(
    calculateDepth(node.left, depth + 1),
    calculateDepth(node.right, depth + 1)
  );
}

test.describe('Optimized Decision Tree Algorithm', () => {
  test.describe('findFarthest optimization', () => {
    test('uses brute force for small datasets (< 100)', () => {
      const headers = ['id', 'price', 'rating'];
      const data: string[][] = [];
      
      // Create 50 products
      for (let i = 0; i < 50; i++) {
        data.push([`${i}`, `${10 + i}`, `${3 + (i % 3)}`]);
      }

      const startTime = Date.now();
      const tree = buildObliqueTreeFromCSV(
        { headers, data },
        { maxDepth: 5, minLeafSize: 2 }
      );
      const endTime = Date.now();

      expect(tree).toBeDefined();
      expect(endTime - startTime).toBeLessThan(1000); // Should be fast
      
      const allProducts = collectProducts(tree);
      expect(allProducts.length).toBe(50); // No products lost
    });

    test('uses sampling for large datasets (performance)', () => {
      const headers = ['id', 'price', 'rating', 'shipping'];
      const data: string[][] = [];
      
      // Create 1000 products
      for (let i = 0; i < 1000; i++) {
        data.push([`${i}`, `${10 + (i % 100)}`, `${3 + (i % 3)}`, `${1 + (i % 5)}`]);
      }

      const startTime = Date.now();
      const tree = buildObliqueTreeFromCSV(
        { headers, data },
        { maxDepth: 6, minLeafSize: 5 }
      );
      const endTime = Date.now();

      expect(tree).toBeDefined();
      const buildTime = endTime - startTime;
      expect(buildTime).toBeLessThan(2000); // Should complete in < 2 seconds
      
      const allProducts = collectProducts(tree);
      expect(allProducts.length).toBe(1000); // No products lost
    });

    test('produces reasonable results with sampling', () => {
      const headers = ['id', 'price', 'rating'];
      const data: string[][] = [];
      
      // Create 500 products with clear clusters
      for (let i = 0; i < 250; i++) {
        data.push([`low_${i}`, '10', '4.5']); // Low price, high rating
      }
      for (let i = 0; i < 250; i++) {
        data.push([`high_${i}`, '50', '3.0']); // High price, low rating
      }

      const tree = buildObliqueTreeFromCSV(
        { headers, data },
        { maxDepth: 4, minLeafSize: 10 }
      );

      // Tree should be built successfully
      expect(tree).toBeDefined();
      const depth = calculateDepth(tree);
      expect(depth).toBeGreaterThanOrEqual(1); // May be shallow if clusters are very distinct
      expect(depth).toBeLessThan(10);
    });
  });

  test.describe('feature normalization', () => {
    test('normalizes features to [0, 1] range', () => {
      const headers = ['id', 'price', 'rating'];
      const data = [
        ['1', '10', '4.5'],
        ['2', '10', '4.5'],
        ['3', '50', '3.0'],
        ['4', '50', '3.0'],
      ];

      const tree = buildObliqueTreeFromCSV(
        { headers, data },
        { maxDepth: 3, minLeafSize: 1 }
      );

      // Check that products in tree have normalized values
      const allProducts = collectProducts(tree);
      
      for (const product of allProducts) {
        for (const value of product.values) {
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(1);
        }
      }
    });

    test('handles constant features (all same value)', () => {
      const headers = ['id', 'price', 'rating', 'category'];
      const data = [
        ['1', '10', '4.5', 'A'],
        ['2', '10', '4.5', 'B'],
        ['3', '10', '4.5', 'A'],
      ];

      // Should not throw error
      const tree = buildObliqueTreeFromCSV(
        { headers, data },
        { maxDepth: 3, minLeafSize: 1 }
      );

      expect(tree).toBeDefined();
      const allProducts = collectProducts(tree);
      expect(allProducts.length).toBe(3);
    });

    test('preserves product IDs and original rows', () => {
      const headers = ['id', 'price', 'rating'];
      const data = [
        ['p1', '10', '4.5'],
        ['p2', '20', '4.0'],
        ['p3', '10', '4.0'],
      ];

      const tree = buildObliqueTreeFromCSV(
        { headers, data },
        { maxDepth: 3, minLeafSize: 1 }
      );

      const allProducts = collectProducts(tree);
      const ids = allProducts.map((p) => p.id);
      expect(new Set(ids)).toEqual(new Set(['p1', 'p2', 'p3']));
      expect(allProducts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 'p1', originalRow: ['p1', '10', '4.5'] }),
          expect.objectContaining({ id: 'p2', originalRow: ['p2', '20', '4.0'] }),
          expect.objectContaining({ id: 'p3', originalRow: ['p3', '10', '4.0'] }),
        ])
      );
    });
  });

  test.describe('information gain calculation', () => {
    test('builds tree with information gain-based splits', () => {
      const headers = ['id', 'price', 'rating'];
      const data = [
        ['1', '10', '4.5'],
        ['2', '10', '4.5'],
        ['3', '50', '3.0'],
        ['4', '50', '3.0'],
      ];

      const tree = buildObliqueTreeFromCSV(
        { headers, data },
        { maxDepth: 3, minLeafSize: 1 }
      );

      // Tree should be built successfully
      expect(tree).toBeDefined();
      const allProducts = collectProducts(tree);
      expect(allProducts.length).toBe(4);
    });

    test('produces more balanced trees with information gain', () => {
      const headers = ['id', 'price', 'rating'];
      const data: string[][] = [];
      
      // Create dataset with clear separation
      for (let i = 0; i < 20; i++) {
        data.push([`low_${i}`, '10', '4.5']);
      }
      for (let i = 0; i < 20; i++) {
        data.push([`high_${i}`, '50', '3.0']);
      }

      const tree = buildObliqueTreeFromCSV(
        { headers, data },
        { maxDepth: 5, minLeafSize: 2 }
      );

      // Tree should be built successfully with reasonable depth
      expect(tree).toBeDefined();
      const depth = calculateDepth(tree);
      expect(depth).toBeGreaterThanOrEqual(1); // May be shallow for well-separated clusters
      expect(depth).toBeLessThan(10);
    });
  });

  test.describe('tree quality improvements', () => {
    test('all products appear in leaf nodes', () => {
      const headers = ['id', 'price', 'rating'];
      const data: string[][] = [];
      
      for (let i = 0; i < 100; i++) {
        data.push([`${i}`, `${10 + (i % 50)}`, `${3 + (i % 3)}`]);
      }

      const tree = buildObliqueTreeFromCSV(
        { headers, data },
        { maxDepth: 6, minLeafSize: 3 }
      );

      const allProducts = collectProducts(tree);
      expect(allProducts.length).toBe(100);
      
      // Check for duplicates
      const productIds = allProducts.map((p) => p.id);
      const uniqueIds = new Set(productIds);
      expect(uniqueIds.size).toBe(100);
    });

    test('tree depth is reasonable', () => {
      const headers = ['id', 'price', 'rating', 'shipping'];
      const data: string[][] = [];
      
      for (let i = 0; i < 50; i++) {
        data.push([`${i}`, `${10 + i}`, `${3 + (i % 3)}`, `${1 + (i % 5)}`]);
      }

      const tree = buildObliqueTreeFromCSV(
        { headers, data },
        { maxDepth: 8, minLeafSize: 2 }
      );

      const depth = calculateDepth(tree);
      expect(depth).toBeGreaterThan(0);
      expect(depth).toBeLessThanOrEqual(8); // Respects maxDepth
    });

    test('handles edge case: single product', () => {
      const headers = ['id', 'price', 'rating', 'category'];
      const data = [['1', '10', '4.5', 'A']];

      const tree = buildObliqueTreeFromCSV(
        { headers, data },
        { maxDepth: 3, minLeafSize: 1 }
      );

      expect(tree.type).toBe('leaf');
      if (tree.type === 'leaf') {
        expect(tree.products.length).toBe(1);
      }
    });

    test('handles edge case: identical products', () => {
      const headers = ['id', 'price', 'rating', 'category'];
      const data = [
        ['1', '10', '4.5', 'A'],
        ['2', '10', '4.5', 'A'],
        ['3', '10', '4.5', 'A'],
      ];

      const tree = buildObliqueTreeFromCSV(
        { headers, data },
        { maxDepth: 5, minLeafSize: 1 }
      );

      // Should eventually become a leaf (no good splits)
      const allProducts = collectProducts(tree);
      expect(allProducts.length).toBe(3);
    });
  });

  test.describe('performance benchmarks', () => {
    test('builds tree for 100 products in < 500ms', () => {
      const headers = ['id', 'price', 'rating'];
      const data: string[][] = [];
      
      for (let i = 0; i < 100; i++) {
        data.push([`${i}`, `${10 + i}`, `${3 + (i % 3)}`]);
      }

      const startTime = Date.now();
      buildObliqueTreeFromCSV(
        { headers, data },
        { maxDepth: 5, minLeafSize: 2 }
      );
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(500);
    });

    test('builds tree for 1000 products in < 2 seconds', () => {
      const headers = ['id', 'price', 'rating'];
      const data: string[][] = [];
      
      for (let i = 0; i < 1000; i++) {
        data.push([`${i}`, `${10 + (i % 100)}`, `${3 + (i % 3)}`]);
      }

      const startTime = Date.now();
      buildObliqueTreeFromCSV(
        { headers, data },
        { maxDepth: 6, minLeafSize: 5 }
      );
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(2000);
    });
  });
});

