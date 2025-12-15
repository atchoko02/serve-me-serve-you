// Decision Tree document interface for Firestore
// Stored as subcollection: businesses/{businessId}/decisionTrees/{treeId}
import type { ObliqueTreeNode } from '../utils/decisionTree';
import type { AttributeProfile } from '../../../shared/types/attributeProfile.types';
import type { QuestionTreeNode, FeatureMetadata } from '../../../shared/types/questionTree.types';

export interface DecisionTree {
  id: string;
  businessId: string;
  treeStructure: ObliqueTreeNode; // Stored as JSON
  metrics: TreeMetrics;
  productCount: number;
  questionTree?: QuestionTreeNode;
  featureMetadata?: FeatureMetadata[];
  headers?: string[];
  attributeProfiles?: AttributeProfile[]; // Attribute profiles for adaptive question generation
  createdAt: Date | FirebaseFirestore.Timestamp;
  updatedAt?: Date | FirebaseFirestore.Timestamp;
}

export interface TreeMetrics {
  depth: number;
  leafCount: number;
  averageLeafSize: number;
  maxLeafSize: number;
  minLeafSize: number;
  buildTimeMs: number;
  questionTreeDepth?: number;
  questionTreeLeafCount?: number;
  questionTreeAverageLeafSize?: number;
  informationGain?: number; // Average information gain across splits
}

// Decision Tree document data (without id, for creating)
export interface DecisionTreeData {
  businessId: string;
  treeStructure: ObliqueTreeNode;
  metrics: TreeMetrics;
  productCount: number;
  questionTree?: QuestionTreeNode;
  featureMetadata?: FeatureMetadata[];
  headers?: string[];
  attributeProfiles?: AttributeProfile[];
  createdAt?: Date | FirebaseFirestore.Timestamp;
  updatedAt?: Date | FirebaseFirestore.Timestamp;
}

// Helper function to convert Firestore document to DecisionTree
export function decisionTreeFromFirestore(
  doc: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>,
  businessId: string
): DecisionTree {
  const data = doc.data();
  if (!data) {
    throw new Error('DecisionTree document has no data');
  }
  return {
    id: doc.id,
    businessId,
    treeStructure: data.treeStructure as ObliqueTreeNode,
    metrics: data.metrics as TreeMetrics,
    productCount: data.productCount || 0,
    questionTree: data.questionTree as QuestionTreeNode | undefined,
    featureMetadata: data.featureMetadata as FeatureMetadata[] | undefined,
    headers: data.headers as string[] | undefined,
    attributeProfiles: data.attributeProfiles as AttributeProfile[] | undefined,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

