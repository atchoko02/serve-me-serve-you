// Decision Tree API service
import apiClient from './client';
import type { QuestionTreeNode, FeatureMetadata } from '../../types/questionTree.types';

export interface DecisionTree {
  id: string;
  businessId: string;
  treeStructure?: any; // ObliqueTreeNode (optional for list view)
  questionTree?: QuestionTreeNode;
  featureMetadata?: FeatureMetadata[];
  headers?: string[];
  metrics: {
    depth: number;
    leafCount: number;
    averageLeafSize: number;
    maxLeafSize: number;
    minLeafSize: number;
    buildTimeMs: number;
  };
  productCount: number;
  createdAt: string;
  updatedAt?: string;
}

export interface BuildTreeResponse {
  success: boolean;
  tree: DecisionTree;
}

export interface DecisionTreeResponse {
  success: boolean;
  tree: DecisionTree;
}

export interface DecisionTreesResponse {
  success: boolean;
  trees: DecisionTree[];
}

/**
 * Build a decision tree from stored products
 */
export async function buildTree(
  businessId: string,
  options?: {
    maxDepth?: number;
    minLeafSize?: number;
  }
): Promise<BuildTreeResponse> {
  const response = await apiClient.post<BuildTreeResponse>(
    '/api/csv/build-tree',
    {
      businessId,
      ...options,
    }
  );
  return response.data;
}

/**
 * Get a specific decision tree by ID
 */
export async function getTree(businessId: string, treeId: string): Promise<DecisionTreeResponse> {
  const response = await apiClient.get<DecisionTreeResponse>(
    `/api/csv/trees/${businessId}/${treeId}`
  );
  return response.data;
}

/**
 * Get all decision trees for a business
 */
export async function getDecisionTreesByBusiness(businessId: string): Promise<DecisionTreesResponse> {
  const response = await apiClient.get<DecisionTreesResponse>(
    `/api/csv/trees/${businessId}`
  );
  return response.data;
}
