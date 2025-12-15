// src/tests/controller.pipeline.unit.spec.ts
import { test, expect } from '@playwright/test';
import { buildObliqueTreeFromCSV } from '../../src/utils/decisionTree';

test.describe('Controller pipeline (CSV → tree)', () => {
  test('success path builds a valid tree', () => {
    const csv = {
      headers: ['product_id', 'price', 'rating'],
      data: [
        ['p1', '10', '4.5'],
        ['p2', '12', '4.0'],
        ['p3', '12', '4.2'],
        ['p4', '10', '4.5'],
      ],
    };

    const tree = buildObliqueTreeFromCSV(csv, { maxDepth: 4, minLeafSize: 1 });

    expect(tree.featureNames.length).toBeGreaterThan(0);
    expect(tree.type === 'leaf' || tree.type === 'internal').toBeTruthy();
  });
});
