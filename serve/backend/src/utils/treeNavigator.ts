// Tree navigation utilities for questionnaire flow
import { ObliqueTreeNode, ProductVector } from './decisionTree';
import { Question, Answer, NavigationStep } from '../../../shared/types/questionnaire.types';

/**
 * Navigate the decision tree based on user answers
 */
export function navigateTree(
  currentNode: ObliqueTreeNode,
  answer: 'left' | 'right'
): ObliqueTreeNode {
  if (currentNode.type === 'leaf') {
    throw new Error('Cannot navigate from a leaf node');
  }

  return answer === 'left' ? currentNode.left : currentNode.right;
}

/**
 * Get the current question from a tree node
 * Returns null if the node is a leaf (end of questionnaire)
 */
export function getCurrentQuestion(node: ObliqueTreeNode): Question | null {
  if (node.type === 'leaf') {
    return null; // Leaf node means we've reached recommendations
  }

  // Generate question from hyperplane split
  return {
    id: `node_${node.threshold}_${Date.now()}`,
    text: '', // Will be filled by questionGenerator
    type: 'hyperplane',
    weights: node.weights,
    featureNames: node.featureNames,
    threshold: node.threshold,
  };
}

/**
 * Check if we've reached a leaf node (end of questionnaire)
 */
export function isLeafNode(node: ObliqueTreeNode): boolean {
  return node.type === 'leaf';
}

/**
 * Get products from a leaf node
 */
export function getProductsFromLeaf(node: ObliqueTreeNode): ProductVector[] {
  if (node.type !== 'leaf') {
    throw new Error('Node is not a leaf');
  }
  return node.products;
}

/**
 * Calculate projection of a product onto a hyperplane
 */
export function calculateProjection(
  product: ProductVector,
  weights: number[]
): number {
  if (product.values.length !== weights.length) {
    throw new Error('Product values and weights length mismatch');
  }
  
  return weights.reduce((sum, weight, idx) => sum + weight * product.values[idx], 0);
}

/**
 * Determine which side of a hyperplane a product falls on
 */
export function getProductSide(
  product: ProductVector,
  weights: number[],
  threshold: number
): 'left' | 'right' {
  const projection = calculateProjection(product, weights);
  return projection <= threshold ? 'left' : 'right';
}

