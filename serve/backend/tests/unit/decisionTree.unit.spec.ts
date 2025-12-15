// src/tests/decisionTree.unit.spec.ts
import { test, expect } from '@playwright/test';
import {
  buildObliqueTreeFromCSV,
  ObliqueTreeNode,
  ProductVector,
} from '../../src/utils/decisionTree';

// ---------- Helpers ----------

// Extract only leaf nodes
type LeafNode = Extract<ObliqueTreeNode, { type: 'leaf' }>;

function collectLeaves(node: ObliqueTreeNode): LeafNode[] {
  if (node.type === 'leaf') return [node];
  return [...collectLeaves(node.left), ...collectLeaves(node.right)];
}

function collectProducts(node: ObliqueTreeNode): ProductVector[] {
  if (node.type === 'leaf') return node.products;
  return [...collectProducts(node.left), ...collectProducts(node.right)];
}

// ---------- Tests ----------

test.describe('Oblique Decision Tree Trainer', () => {
  test('builds a stable tree for a small fixed dataset', () => {
    const headers = ['product_id', 'price', 'rating'];
    const data = [
      ['p1', '10', '4.5'],
      ['p2', '12', '4.0'],
      ['p3', '30', '3.5'],
      ['p4', '28', '4.2'],
      ['p5', '12', '4.0'],
    ];

    const tree = buildObliqueTreeFromCSV(
      { headers, data },
      { maxDepth: 3, minLeafSize: 1 }
    );

    expect(tree.type).toBe('internal');
    expect(tree.featureNames).toContain('price');
    expect(tree.featureNames).toContain('rating');

    const leaves = collectLeaves(tree);
    const allProducts = collectProducts(tree);

  expect(allProducts.length).toBe(5);
    expect(leaves.length).toBeGreaterThan(1);
  });

  test('leaf nodes always contain at least one product', () => {
    const headers = ['product_id', 'price', 'rating'];
    const data = [
      ['p1', '10', '4.5'],
      ['p2', '12', '4.0'],
      ['p3', '12', '4.0'],
      ['p4', '28', '4.2'],
      ['p5', '10', '4.8'],
    ];

    const tree = buildObliqueTreeFromCSV(
      { headers, data },
      { maxDepth: 4, minLeafSize: 1 }
    );

    const leaves = collectLeaves(tree);
    expect(leaves.length).toBeGreaterThan(0);

    for (const leaf of leaves) {
      expect(leaf.products.length).toBeGreaterThan(0);
    }
  });

  test('identical products collapse into a single leaf', () => {
    const headers = ['product_id', 'price', 'rating', 'Category'];
    const data = [
      ['p1', '10', '4.5', 'Coffee'],
      ['p2', '10', '4.5', 'Coffee'],
      ['p3', '10', '4.5', 'Coffee'],
      ['p4', '10', '4.5', 'Coffee'],
    ];

    const tree = buildObliqueTreeFromCSV(
      { headers, data },
      { maxDepth: 6, minLeafSize: 1 }
    );

    // Explicit guard so TS knows `.products` exists
    expect(tree.type).toBe('leaf');
    if (tree.type !== 'leaf') {
      throw new Error('Expected identical product dataset to yield a leaf node.');
    }

    expect(tree.products.length).toBe(4);
  });

  test('categorical attributes are one-hot encoded and usable', () => {
    const headers = ['product_id', 'Category', 'UseCase'];
    const data = [
      ['p1', 'Coffee', 'Home'],
      ['p2', 'Coffee', 'Office'],
      ['p3,', 'Tea', 'Home'],
      ['p4', 'Tea', 'Office'],
    ];

    const tree = buildObliqueTreeFromCSV(
      { headers, data },
      { maxDepth: 3, minLeafSize: 1 }
    );

    expect(tree.featureNames.some((f) => f.startsWith('Category='))).toBeTruthy();
    expect(tree.featureNames.some((f) => f.startsWith('UseCase='))).toBeTruthy();
  });

  test('identifier-like numeric columns are excluded from features', () => {
    const headers = ['product_id', 'price', 'rating'];
    const data = [
      ['1', '10', '4.5'],
      ['2', '12', '4.0'],
      ['3', '10', '4.0'],
    ];

    const tree = buildObliqueTreeFromCSV(
      { headers, data },
      { maxDepth: 2, minLeafSize: 1 }
    );

    expect(tree.featureNames).not.toContain('product_id');
    expect(tree.featureNames).toContain('price');
    expect(tree.featureNames).toContain('rating');
  });
});
