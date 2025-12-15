// Decision Tree service for Firestore operations
import { 
  getDecisionTreesCollection 
} from '../config/firebase';
import type { DecisionTree, DecisionTreeData, TreeMetrics } from '../models/DecisionTree';
import { decisionTreeFromFirestore } from '../models/DecisionTree';
import type { ObliqueTreeNode } from '../utils/decisionTree';
import type { QuestionTreeNode, FeatureMetadata } from '../../../shared/types/questionTree.types';

// Allow tests to override the collection getter without mutating ESM bindings
let decisionTreeCollectionFactory = getDecisionTreesCollection;

export function __setDecisionTreeCollectionFactory(
  factory: (businessId: string) => any,
) {
  decisionTreeCollectionFactory = factory as typeof getDecisionTreesCollection;
}

/**
 * Calculate tree metrics
 */
export function calculateTreeMetrics(
  tree: ObliqueTreeNode,
  buildTimeMs: number,
  questionTree?: QuestionTreeNode
): TreeMetrics {
  let depth = 0;
  let leafCount = 0;
  const leafSizes: number[] = [];

  function traverse(node: ObliqueTreeNode, currentDepth: number): void {
    depth = Math.max(depth, currentDepth);

    if (node.type === 'leaf') {
      leafCount++;
      leafSizes.push(node.products.length);
    } else {
      traverse(node.left, currentDepth + 1);
      traverse(node.right, currentDepth + 1);
    }
  }

  traverse(tree, 1);

  const totalProducts = leafSizes.reduce((sum, size) => sum + size, 0);
  const averageLeafSize = leafCount > 0 ? totalProducts / leafCount : 0;
  const maxLeafSize = leafSizes.length > 0 ? Math.max(...leafSizes) : 0;
  const minLeafSize = leafSizes.length > 0 ? Math.min(...leafSizes) : 0;

  const metrics: TreeMetrics = {
    depth,
    leafCount,
    averageLeafSize,
    maxLeafSize,
    minLeafSize,
    buildTimeMs,
  };

  if (questionTree) {
    const qtStats = calculateQuestionTreeStats(questionTree);
    metrics.questionTreeDepth = qtStats.depth;
    metrics.questionTreeLeafCount = qtStats.leafCount;
    metrics.questionTreeAverageLeafSize = qtStats.averageLeafSize;
  }

  return metrics;
}

/**
 * Store a decision tree in Firestore
 */
export async function storeDecisionTree(
  businessId: string,
  tree: ObliqueTreeNode,
  metrics: TreeMetrics,
  productCount: number,
  attributeProfiles?: import('../../../shared/types/attributeProfile.types').AttributeProfile[],
  questionTree?: QuestionTreeNode,
  featureMetadata?: FeatureMetadata[],
  headers?: string[]
): Promise<DecisionTree> {
  const treesRef = decisionTreeCollectionFactory(businessId);
  
  // Clean attribute profiles to remove undefined values (Firestore doesn't allow undefined)
  const cleanedProfiles = attributeProfiles?.map(profile => {
    const cleaned: any = { ...profile };
    // Remove undefined fields
    if (cleaned.unit === undefined) {
      delete cleaned.unit;
    }
    return cleaned;
  });
  
  const cleanedMetadata = featureMetadata?.map((meta) => {
    const cleaned: any = { ...meta };
    Object.keys(cleaned).forEach((key) => {
      if (cleaned[key] === undefined) {
        delete cleaned[key];
      }
    });
    return cleaned;
  });

  const treeData: DecisionTreeData = {
    businessId,
    treeStructure: tree,
    metrics,
    productCount,
    questionTree,
    featureMetadata: cleanedMetadata,
    headers,
    attributeProfiles: cleanedProfiles,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const docRef = await treesRef.add(treeData);
  const doc = await docRef.get();

  if (!doc.exists) {
    throw new Error('Failed to create decision tree document');
  }

  return decisionTreeFromFirestore(doc, businessId);
}

/**
 * Get the latest decision tree for a business
 */
export async function getLatestDecisionTree(businessId: string): Promise<DecisionTree | null> {
  const treesRef = decisionTreeCollectionFactory(businessId);
  const snapshot = await treesRef
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  return decisionTreeFromFirestore(snapshot.docs[0], businessId);
}

/**
 * Get all decision trees for a business
 */
export async function getDecisionTreesByBusiness(businessId: string): Promise<DecisionTree[]> {
  const treesRef = decisionTreeCollectionFactory(businessId);
  const snapshot = await treesRef.orderBy('createdAt', 'desc').limit(50).get(); // Limit to avoid quota

  if (snapshot.empty) {
    return [];
  }

  return snapshot.docs.map(doc => decisionTreeFromFirestore(doc, businessId));
}

/**
 * Get a specific decision tree by ID
 */
export async function getDecisionTree(businessId: string, treeId: string): Promise<DecisionTree | null> {
  const treeRef = decisionTreeCollectionFactory(businessId).doc(treeId);
  const doc = await treeRef.get();

  if (!doc.exists) {
    return null;
  }

  return decisionTreeFromFirestore(doc, businessId);
}

function calculateQuestionTreeStats(questionTree: QuestionTreeNode): {
  depth: number;
  leafCount: number;
  averageLeafSize: number;
} {
  let depth = 0;
  let leafCount = 0;
  const leafSizes: number[] = [];

  const walk = (node: QuestionTreeNode, currentDepth: number) => {
    depth = Math.max(depth, currentDepth);
    if (node.type === 'leaf') {
      leafCount += 1;
      leafSizes.push(node.sampleCount);
      return;
    }
    if (node.type === 'numeric') {
      walk(node.left, currentDepth + 1);
      walk(node.right, currentDepth + 1);
    } else if (node.type === 'categorical') {
      Object.values(node.children).forEach((child) => walk(child, currentDepth + 1));
    }
  };

  walk(questionTree, 1);

  const total = leafSizes.reduce((sum, size) => sum + size, 0);
  const averageLeafSize = leafCount > 0 ? total / leafCount : 0;

  return { depth, leafCount, averageLeafSize };
}

