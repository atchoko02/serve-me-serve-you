// Split analysis utility for Phase 3
// Analyzes what each tree split is actually separating
import type { ObliqueTreeNode, ProductVector } from './decisionTree';
import type { AttributeProfile } from '../../../shared/types/attributeProfile.types';
import { calculateProjection } from './treeNavigator';

export interface BranchStatistics {
  productCount: number;
  attributeAverages: Map<string, number>; // attribute name -> average value
  attributeMedians: Map<string, number>; // attribute name -> median value
  attributeRanges: Map<string, { min: number; max: number }>; // attribute name -> range
}

export interface SplitAnalysis {
  leftStats: BranchStatistics;
  rightStats: BranchStatistics;
  distinguishingAttributes: Array<{
    attributeName: string;
    leftValue: number;
    rightValue: number;
    difference: number;
    differencePercent: number;
  }>;
  productCountDifference: number;
}

/**
 * Extract all products from a tree node (recursively)
 */
function extractAllProducts(node: ObliqueTreeNode): ProductVector[] {
  if (!node) {
    return [];
  }
  
  if (node.type === 'leaf') {
    return node.products || [];
  }
  
  // For internal nodes, recursively extract from children
  if (!node.left || !node.right) {
    return [];
  }
  
  try {
    return [
      ...extractAllProducts(node.left),
      ...extractAllProducts(node.right),
    ];
  } catch (error) {
    console.warn('Error extracting products from tree node:', error);
    return [];
  }
}

/**
 * Calculate statistics for products in a branch
 */
function calculateBranchStatistics(
  products: ProductVector[],
  featureNames: string[],
  attributeProfiles?: AttributeProfile[]
): BranchStatistics {
  const attributeAverages = new Map<string, number>();
  const attributeMedians = new Map<string, number>();
  const attributeRanges = new Map<string, { min: number; max: number }>();

  if (products.length === 0) {
    return {
      productCount: 0,
      attributeAverages,
      attributeMedians,
      attributeRanges,
    };
  }

  // Calculate statistics for each attribute
  featureNames.forEach((attrName, idx) => {
    const values = products
      .map(p => p.values[idx])
      .filter(v => !isNaN(v) && isFinite(v))
      .sort((a, b) => a - b);

    if (values.length > 0) {
      // Average
      const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
      attributeAverages.set(attrName, avg);

      // Median
      const median = values.length % 2 === 0
        ? (values[values.length / 2 - 1] + values[values.length / 2]) / 2
        : values[Math.floor(values.length / 2)];
      attributeMedians.set(attrName, median);

      // Range
      attributeRanges.set(attrName, {
        min: values[0],
        max: values[values.length - 1],
      });
    }
  });

  return {
    productCount: products.length,
    attributeAverages,
    attributeMedians,
    attributeRanges,
  };
}

/**
 * Analyze a tree split to understand what it's separating
 */
export function analyzeSplit(
  node: ObliqueTreeNode,
  attributeProfiles?: AttributeProfile[]
): SplitAnalysis | null {
  if (node.type === 'leaf') {
    return null;
  }

  const { featureNames } = node;

  // Validate that left and right children exist
  if (!node.left || !node.right) {
    return null;
  }

  // Get products from left and right subtrees directly
  // This is more accurate than partitioning, as it uses the actual tree structure
  let leftProducts: ProductVector[] = [];
  let rightProducts: ProductVector[] = [];
  
  try {
    leftProducts = extractAllProducts(node.left);
    rightProducts = extractAllProducts(node.right);
  } catch (error) {
    // If extraction fails, return null to fall back to other methods
    console.warn('Failed to extract products for split analysis:', error);
    return null;
  }
  
  // If we don't have enough products on both sides, skip split analysis
  if (leftProducts.length === 0 || rightProducts.length === 0) {
    return null;
  }
  
  // Need at least 2 products total for meaningful analysis
  if (leftProducts.length + rightProducts.length < 2) {
    return null;
  }

  // Calculate statistics for each branch
  const leftStats = calculateBranchStatistics(leftProducts, featureNames, attributeProfiles);
  const rightStats = calculateBranchStatistics(rightProducts, featureNames, attributeProfiles);

  // Find distinguishing attributes (attributes with significant differences)
  const distinguishingAttributes: Array<{
    attributeName: string;
    leftValue: number;
    rightValue: number;
    difference: number;
    differencePercent: number;
  }> = [];

  featureNames.forEach(attrName => {
    const leftAvg = leftStats.attributeAverages.get(attrName);
    const rightAvg = rightStats.attributeAverages.get(attrName);

    if (leftAvg !== undefined && rightAvg !== undefined) {
      const difference = Math.abs(rightAvg - leftAvg);
      const avgValue = (leftAvg + rightAvg) / 2;
      const differencePercent = avgValue !== 0 ? (difference / Math.abs(avgValue)) * 100 : 0;

      // Only include attributes with meaningful differences (>5% difference)
      if (differencePercent > 5) {
        distinguishingAttributes.push({
          attributeName: attrName,
          leftValue: leftAvg,
          rightValue: rightAvg,
          difference,
          differencePercent,
        });
      }
    }
  });

  // Sort by difference percentage (most distinguishing first)
  distinguishingAttributes.sort((a, b) => b.differencePercent - a.differencePercent);

  return {
    leftStats,
    rightStats,
    distinguishingAttributes,
    productCountDifference: Math.abs(leftStats.productCount - rightStats.productCount),
  };
}

/**
 * Get a human-readable description of what distinguishes the left branch
 */
export function describeLeftBranch(
  analysis: SplitAnalysis,
  attributeProfiles?: AttributeProfile[]
): string {
  const descriptions: string[] = [];
  const profilesMap = attributeProfiles
    ? new Map(attributeProfiles.map(p => [p.name, p]))
    : undefined;

  // Get top 2-3 most distinguishing attributes
  const topAttributes = analysis.distinguishingAttributes.slice(0, 3);

  topAttributes.forEach(attr => {
    const profile = profilesMap?.get(attr.attributeName);
    const leftValue = attr.leftValue;
    const rightValue = attr.rightValue;

    if (profile) {
      const isLower = leftValue < rightValue;
      const formattedValue = formatValueForDescription(leftValue, profile);

      if (profile.type === 'price') {
        descriptions.push(isLower ? `budget-friendly (around ${formattedValue})` : `premium (around ${formattedValue})`);
      } else if (profile.type === 'rating') {
        descriptions.push(`ratings around ${formattedValue}`);
      } else if (profile.type === 'duration') {
        descriptions.push(isLower ? `faster (around ${formattedValue})` : `slower (around ${formattedValue})`);
      } else {
        const direction = isLower ? 'lower' : 'higher';
        descriptions.push(`${direction} ${profile.description} (around ${formattedValue})`);
      }
    } else {
      // Fallback without profile
      const direction = leftValue < rightValue ? 'lower' : 'higher';
      descriptions.push(`${direction} ${attr.attributeName} (${leftValue.toFixed(2)})`);
    }
  });

  return descriptions.length > 0 ? descriptions.join(' and ') : 'one set of products';
}

/**
 * Get a human-readable description of what distinguishes the right branch
 */
export function describeRightBranch(
  analysis: SplitAnalysis,
  attributeProfiles?: AttributeProfile[]
): string {
  const descriptions: string[] = [];
  const profilesMap = attributeProfiles
    ? new Map(attributeProfiles.map(p => [p.name, p]))
    : undefined;

  // Get top 2-3 most distinguishing attributes
  const topAttributes = analysis.distinguishingAttributes.slice(0, 3);

  topAttributes.forEach(attr => {
    const profile = profilesMap?.get(attr.attributeName);
    const rightValue = attr.rightValue;
    const leftValue = attr.leftValue;

    if (profile) {
      const isHigher = rightValue > leftValue;
      const formattedValue = formatValueForDescription(rightValue, profile);

      if (profile.type === 'price') {
        descriptions.push(isHigher ? `premium (around ${formattedValue})` : `budget-friendly (around ${formattedValue})`);
      } else if (profile.type === 'rating') {
        descriptions.push(`ratings around ${formattedValue}`);
      } else if (profile.type === 'duration') {
        descriptions.push(isHigher ? `slower (around ${formattedValue})` : `faster (around ${formattedValue})`);
      } else {
        const direction = isHigher ? 'higher' : 'lower';
        descriptions.push(`${direction} ${profile.description} (around ${formattedValue})`);
      }
    } else {
      // Fallback without profile
      const direction = rightValue > leftValue ? 'higher' : 'lower';
      descriptions.push(`${direction} ${attr.attributeName} (${rightValue.toFixed(2)})`);
    }
  });

  return descriptions.length > 0 ? descriptions.join(' and ') : 'another set of products';
}

/**
 * Format a value for description based on attribute profile
 */
function formatValueForDescription(value: number, profile: AttributeProfile): string {
  if (profile.type === 'price') {
    return `$${value.toFixed(2)}`;
  }
  if (profile.unit) {
    return `${value.toFixed(profile.scale === 'small' ? 1 : 0)} ${profile.unit}`;
  }
  return value.toFixed(profile.scale === 'small' ? 2 : 1);
}

