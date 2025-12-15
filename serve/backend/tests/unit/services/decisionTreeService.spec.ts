// Unit tests for decisionTreeService
import { test, expect } from '@playwright/test';
import * as decisionTreeService from '../../../src/services/decisionTreeService';
import * as productService from '../../../src/services/productService';
import * as firebaseModule from '../../../src/config/firebase';
import type { ObliqueTreeNode } from '../../../src/utils/decisionTree';
import type { DecisionTreeData } from '../../../src/models/DecisionTree';

/**
 * In-memory Firestore mock
 */
type StoredDoc = DecisionTreeData & { id: string };

const memoryStore: Map<string, Map<string, StoredDoc>> = new Map(); // businessId -> docs
let idCounter = 0;

function getBusinessStore(businessId: string): Map<string, StoredDoc> {
  if (!memoryStore.has(businessId)) {
    memoryStore.set(businessId, new Map());
  }
  return memoryStore.get(businessId)!;
}

class FakeDoc {
  constructor(public id: string, private stored: StoredDoc | undefined) {}
  get exists() {
    return !!this.stored;
  }
  data() {
    return this.stored;
  }
}

class FakeCollection {
  constructor(private businessId: string) {}

  add = async (data: DecisionTreeData) => {
    const id = `doc_${++idCounter}`;
    const stored: StoredDoc = {
      ...data,
      id,
      createdAt: data.createdAt ?? new Date(),
      updatedAt: data.updatedAt ?? new Date(),
    };
    getBusinessStore(this.businessId).set(id, stored);
    return {
      id,
      get: async () => new FakeDoc(id, stored),
    };
  };

  doc = (id: string) => {
    return {
      get: async () => {
        const stored = getBusinessStore(this.businessId).get(id);
        return new FakeDoc(id, stored);
      },
    };
  };

  orderBy = (_field: string, _dir: 'asc' | 'desc') => this;

  limit = (_n: number) => this;

  get = async () => {
    const docs = Array.from(getBusinessStore(this.businessId).values())
      .sort((a, b) => {
        const ta = (a.createdAt as Date).getTime();
        const tb = (b.createdAt as Date).getTime();
        return tb - ta; // desc
      })
      .map((d) => new FakeDoc(d.id, d));
    return {
      empty: docs.length === 0,
      docs,
    };
  };
}

// Patch firebase collection getter to use in-memory store via service hook
decisionTreeService.__setDecisionTreeCollectionFactory((businessId: string) =>
  new FakeCollection(businessId),
);


test.describe('DecisionTreeService (mocked Firestore)', () => {
  const testBusinessId = `test-tree-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  test.afterEach(async () => {
    memoryStore.clear();
    idCounter = 0;
  });

  test.describe('calculateTreeMetrics', () => {
    test('calculates metrics for a simple tree', () => {
      const tree: ObliqueTreeNode = {
        type: 'internal',
        featureNames: ['price', 'rating'],
        weights: [0.5, 0.5],
        threshold: 10,
        sampleCount: 10,
        left: {
          type: 'leaf',
          featureNames: ['price', 'rating'],
          products: [
            { id: '1', values: [5, 4], originalRow: ['1', '5', '4'] },
            { id: '2', values: [6, 3], originalRow: ['2', '6', '3'] },
          ],
        },
        right: {
          type: 'leaf',
          featureNames: ['price', 'rating'],
          products: [
            { id: '3', values: [15, 5], originalRow: ['3', '15', '5'] },
            { id: '4', values: [20, 4], originalRow: ['4', '20', '4'] },
            { id: '5', values: [18, 5], originalRow: ['5', '18', '5'] },
          ],
        },
      };

      const metrics = decisionTreeService.calculateTreeMetrics(tree, 100);

      expect(metrics.depth).toBe(2);
      expect(metrics.leafCount).toBe(2);
      expect(metrics.averageLeafSize).toBe(2.5); // (2 + 3) / 2
      expect(metrics.maxLeafSize).toBe(3);
      expect(metrics.minLeafSize).toBe(2);
      expect(metrics.buildTimeMs).toBe(100);
    });

    test('calculates metrics for a single leaf tree', () => {
      const tree: ObliqueTreeNode = {
        type: 'leaf',
        featureNames: ['price'],
        products: [
          { id: '1', values: [10], originalRow: ['1', '10'] },
          { id: '2', values: [20], originalRow: ['2', '20'] },
        ],
      };

      const metrics = decisionTreeService.calculateTreeMetrics(tree, 50);

      expect(metrics.depth).toBe(1);
      expect(metrics.leafCount).toBe(1);
      expect(metrics.averageLeafSize).toBe(2);
      expect(metrics.maxLeafSize).toBe(2);
      expect(metrics.minLeafSize).toBe(2);
    });
  });

  test.describe('storeDecisionTree', () => {
    test('stores decision tree successfully', async () => {
      const tree: ObliqueTreeNode = {
        type: 'leaf',
        featureNames: ['price', 'rating'],
        products: [
          { id: '1', values: [10, 4.5], originalRow: ['1', '10', '4.5'] },
        ],
      };

      const metrics = decisionTreeService.calculateTreeMetrics(tree, 100);

      const storedTree = await decisionTreeService.storeDecisionTree(
        testBusinessId,
        tree,
        metrics,
        1
      );

      expect(storedTree.id).toBeDefined();
      expect(storedTree.businessId).toBe(testBusinessId);
      expect(storedTree.productCount).toBe(1);
      expect(storedTree.metrics.depth).toBe(1);
      expect(storedTree.treeStructure).toBeDefined();
    });
  });

  test.describe('getLatestDecisionTree', () => {
    test('returns latest decision tree', async () => {
      // Store first tree
      const tree1: ObliqueTreeNode = {
        type: 'leaf',
        featureNames: ['price'],
        products: [{ id: '1', values: [10], originalRow: ['1', '10'] }],
      };
      const metrics1 = decisionTreeService.calculateTreeMetrics(tree1, 100);
      await decisionTreeService.storeDecisionTree(testBusinessId, tree1, metrics1, 1);
      // ensure distinct timestamps
      await new Promise((r) => setTimeout(r, 10));

      // Store second tree
      const tree2: ObliqueTreeNode = {
        type: 'leaf',
        featureNames: ['price'],
        products: [{ id: '2', values: [20], originalRow: ['2', '20'] }],
      };
      const metrics2 = decisionTreeService.calculateTreeMetrics(tree2, 100);
      await decisionTreeService.storeDecisionTree(testBusinessId, tree2, metrics2, 1);

      // Get latest
      const latest = await decisionTreeService.getLatestDecisionTree(testBusinessId);

      expect(latest).not.toBeNull();
      expect(latest!.treeStructure.type).toBe('leaf');
    });

    test('returns null when no trees exist', async () => {
      const emptyBusinessId = `empty-${Date.now()}`;

      const tree = await decisionTreeService.getLatestDecisionTree(emptyBusinessId);

      expect(tree).toBeNull();

    });
  });

  test.describe('getDecisionTreesByBusiness', () => {
    test('returns all trees ordered by creation date', async () => {
      // Store multiple trees
      for (let i = 0; i < 3; i++) {
        const tree: ObliqueTreeNode = {
          type: 'leaf',
          featureNames: ['price'],
          products: [{ id: String(i), values: [10 + i], originalRow: [String(i), String(10 + i)] }],
        };
        const metrics = decisionTreeService.calculateTreeMetrics(tree, 100);
        await decisionTreeService.storeDecisionTree(testBusinessId, tree, metrics, 1);
        await new Promise((r) => setTimeout(r, 5)); // ensure different timestamps
      }

      const trees = await decisionTreeService.getDecisionTreesByBusiness(testBusinessId);

      expect(trees.length).toBeGreaterThanOrEqual(3);
      // Should be ordered by createdAt desc (newest first)
      for (let i = 0; i < trees.length - 1; i++) {
        const current = trees[i].createdAt;
        const next = trees[i + 1].createdAt;
        if (current && next) {
          const currentTime = current instanceof Date ? current.getTime() : current.toMillis();
          const nextTime = next instanceof Date ? next.getTime() : next.toMillis();
          expect(currentTime).toBeGreaterThanOrEqual(nextTime);
        }
      }
    });
  });

  test.describe('getDecisionTree', () => {
    test('returns specific tree by ID', async () => {
      const tree: ObliqueTreeNode = {
        type: 'leaf',
        featureNames: ['price'],
        products: [{ id: '1', values: [10], originalRow: ['1', '10'] }],
      };
      const metrics = decisionTreeService.calculateTreeMetrics(tree, 100);
      const stored = await decisionTreeService.storeDecisionTree(testBusinessId, tree, metrics, 1);

      const retrieved = await decisionTreeService.getDecisionTree(testBusinessId, stored.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(stored.id);
    });

    test('returns null for non-existent tree', async () => {
      const tree = await decisionTreeService.getDecisionTree(testBusinessId, 'non-existent-id');

      expect(tree).toBeNull();
    });
  });
});

