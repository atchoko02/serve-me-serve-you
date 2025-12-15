// src/utils/decisionTree.ts

export interface ProductVector {
  id: string;
  values: number[];
  originalRow: string[];
  /** Raw (non-normalized) values, used for question wording */
  rawValues?: number[];
}

export interface NormalizationStats {
  mins: number[];
  maxs: number[];
}

export type ObliqueTreeNode =
  | {
      type: "internal";
      featureNames: string[];
      weights: number[];
      threshold: number;
      sampleCount: number;
      left: ObliqueTreeNode;
      right: ObliqueTreeNode;
      normalization?: NormalizationStats;
    }
  | {
      type: "leaf";
      featureNames: string[];
      products: ProductVector[];
      normalization?: NormalizationStats;
    };

interface CSVData {
  headers: string[];
  data: string[][];
}

interface BuildOptions {
  maxDepth?: number;
  minLeafSize?: number;
  /** Minimum information gain to accept a split */
  minInfoGain?: number;
}

const OTHER_CATEGORY = '__OTHER__';
const MAX_CATEGORICAL_CARDINALITY = 16;
const MIN_CATEGORY_SUPPORT = 2;
const MIN_CATEGORY_FRACTION = 0.02;
  
  /**
   * ---------------------------------------------------------
   * Oblique Decision Tree Builder
   * ---------------------------------------------------------
   * Builds a tree where each split is a linear combination of
   * multiple attributes (hyperplane):
   *
   *     w₁·x₁ + w₂·x₂ + ... + wₖ·xₖ  <=  threshold
   *
   * LEFT branch  = lower projection
   * RIGHT branch = higher projection
   */
export function buildObliqueTreeFromCSV(
  csv: CSVData,
  options: BuildOptions = {}
): ObliqueTreeNode {
  const { headers, data } = csv;

  const maxDepth = options.maxDepth ?? 6;
  const minLeafSize = options.minLeafSize ?? 3;
  const minInfoGain = options.minInfoGain ?? 1e-4;
  const minBranchFraction = 0.05; // Require each branch to have at least 5% of samples

  if (!headers || headers.length === 0) {
    throw new Error("CSV headers missing — cannot build decision tree.");
  }
  if (!data || data.length === 0) {
    throw new Error("No CSV rows found — cannot build decision tree.");
  }

  // Detect a product ID column if available
  const idColIndex = headers.findIndex((h) =>
    /id|product/i.test(h.toLowerCase())
  );

  // Detect numeric and categorical columns and filter out non-meaningful ones
  type ColumnInfo = {
    index: number;
    name: string;
    numericValues: number[];
    uniqueRatio: number;
    variance: number;
    range: number;
  };

  const numericColumns: ColumnInfo[] = [];
  type CategoricalColumn = {
    index: number;
    name: string;
    categories: string[];
    keptSet: Set<string>;
    hasOther: boolean;
  };
  const categoricalColumns: CategoricalColumn[] = [];

  headers.forEach((h, i) => {
    const columnValues = data
      .map((row) => row[i])
      .filter((v) => v !== undefined && v !== null && v !== "");

    if (columnValues.length === 0) {
      return;
    }

    const allNumeric = columnValues.every((v) => !isNaN(Number(v)));

    if (allNumeric) {
      const numericValues = columnValues.map((v) => Number(v));
      const uniqueValues = new Set(numericValues.map((v) => (Number.isFinite(v) ? v : NaN)));
      const uniqueRatio = uniqueValues.size / numericValues.length;
      const mean =
        numericValues.reduce((a, b) => a + b, 0) / Math.max(numericValues.length, 1);
      const variance =
        numericValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) /
        Math.max(numericValues.length, 1);
      const min = Math.min(...numericValues);
      const max = Math.max(...numericValues);

      numericColumns.push({
        index: i,
        name: h,
        numericValues,
        uniqueRatio,
        variance,
        range: max - min,
      });
    } else {
      // Candidate categorical column with frequency-aware filtering
      const normalizedValues = columnValues
        .map((v) => String(v).trim())
        .filter((v) => v !== "");

      if (normalizedValues.length === 0) {
        return;
      }

      const frequency = new Map<string, number>();
      normalizedValues.forEach((v) => {
        frequency.set(v, (frequency.get(v) || 0) + 1);
      });

      const sortedCategories = Array.from(frequency.entries()).sort((a, b) => b[1] - a[1]);

      // Keep categories that have enough support to matter
      const supported = sortedCategories
        .filter(([_, count]) => {
          const fraction = count / Math.max(normalizedValues.length, 1);
          return count >= MIN_CATEGORY_SUPPORT || fraction >= MIN_CATEGORY_FRACTION;
        })
        .map(([cat]) => cat);

      // Ensure at least one category if any values exist
      const initialKeep = supported.length > 0 ? supported : sortedCategories.map(([cat]) => cat);

      // Trim to a manageable number of categories and track overflow as "Other"
      let trimmed = initialKeep.slice(0, Math.max(1, MAX_CATEGORICAL_CARDINALITY - 1));
      const hasOverflow = initialKeep.length > trimmed.length || sortedCategories.length > trimmed.length;
      const hasOther = hasOverflow || sortedCategories.length > trimmed.length;
      const finalCategories = [...trimmed];
      const keptSet = new Set(trimmed);

      // Add an Other bucket to avoid exploding the feature space
      if (hasOther) {
        finalCategories.push(OTHER_CATEGORY);
      }

      if (finalCategories.length > 0) {
        categoricalColumns.push({
          index: i,
          name: h,
          categories: finalCategories,
          keptSet,
          hasOther,
        });
      }
    }
  });

  const isIdLike = (name: string) =>
    /(^id$|product|sku|serial|code|uuid)/i.test(name.trim());
  const isCoordinate = (name: string) =>
    /(lat|lng|long|lon|latitude|longitude|coord)/i.test(name.trim());

  const filteredNumeric = numericColumns.filter((col) => {
    // Drop obvious identifiers or coordinates
    if (isIdLike(col.name) || isCoordinate(col.name)) return false;
    // Skip columns with almost-unique values (likely identifiers)
    if (col.uniqueRatio > 0.95) return false;
    // Skip columns with no spread
    if (!Number.isFinite(col.variance) || col.range === 0) return false;
    return true;
  });

  const filteredCategorical = categoricalColumns.filter((col) => {
    if (isIdLike(col.name) || isCoordinate(col.name)) return false;
    return true;
  });

  if (filteredNumeric.length === 0 && filteredCategorical.length === 0) {
    throw new Error(
      "No meaningful columns found — decision tree requires preference-relevant attributes."
    );
  }

  const numericColIndices = filteredNumeric.map((col) => col.index);

  // Build feature schema
  type CategoricalFeature = { sourceIndex: number; sourceName: string; category: string };
  const categoricalFeatures: CategoricalFeature[] = [];
  const categoricalMetaByIndex: Map<number, { keptSet: Set<string>; hasOther: boolean }> = new Map();
  filteredCategorical.forEach((col) => {
    categoricalMetaByIndex.set(col.index, { keptSet: col.keptSet, hasOther: col.hasOther });
    col.categories.forEach((cat) => {
      categoricalFeatures.push({
        sourceIndex: col.index,
        sourceName: col.name,
        category: cat,
      });
    });
  });

  const featureNames: string[] = [
    ...numericColIndices.map((i) => headers[i]),
    ...categoricalFeatures.map((f) =>
      f.category === OTHER_CATEGORY ? `${f.sourceName}=Other` : `${f.sourceName}=${f.category}`
    ),
  ];

  // Convert CSV rows to numerical product vectors (numeric + one-hot categoricals)
  const initialProducts: ProductVector[] = data.map((row, rowIndex) => {
    const numericValues = numericColIndices.map((i) => Number(row[i] || 0));
    const categoricalValues = categoricalFeatures.map((f) => {
      const cell = row[f.sourceIndex];
      const normalized = cell !== undefined && cell !== null ? String(cell).trim() : '';
      if (f.category === OTHER_CATEGORY) {
        const meta = categoricalMetaByIndex.get(f.sourceIndex);
        // If we have an "Other" bucket, mark 1 when the value is not in the kept set
        if (!meta || !meta.hasOther) return 0;
        return normalized !== '' && !meta.keptSet.has(normalized) ? 1 : 0;
      }
      return normalized === f.category ? 1 : 0;
    });
    const values = [...numericValues, ...categoricalValues];
    return {
      id:
        idColIndex >= 0 && row[idColIndex]
          ? row[idColIndex]
          : `product_${rowIndex}`,
      values,
      originalRow: row,
      rawValues: [...values],
    };
  });

  // Normalize features to [0, 1] range for better tree quality, but keep raw values
  const { normalizedProducts, normalization } = normalizeFeatures(
    initialProducts,
    featureNames.length
  );
  
    /** ----------
     * Build tree
     * ---------- */
  function buildNode(items: ProductVector[], depth: number): ObliqueTreeNode {
    if (depth >= maxDepth || items.length <= minLeafSize) {
      return {
        type: "leaf",
        featureNames,
        products: items,
      };
    }

    // Try multiple split candidates and pick the one with best information gain
    const bestSplit = findBestSplit(items, featureNames.length, minBranchFraction, featureNames);

    if (!bestSplit || bestSplit.infoGain <= minInfoGain) {
      return {
        type: "leaf",
        featureNames,
        products: items,
      };
    }

    const { weights, threshold } = bestSplit;

    // Partition items across hyperplane
    const left: ProductVector[] = [];
    const right: ProductVector[] = [];

    for (const p of items) {
      const projection = dot(weights, p.values);
      if (projection <= threshold) left.push(p);
      else right.push(p);
    }

    // Fallback for degenerate or tiny splits
    if (
      left.length === 0 ||
      right.length === 0 ||
      left.length < minBranchFraction * items.length ||
      right.length < minBranchFraction * items.length
    ) {
      return {
        type: "leaf",
        featureNames,
        products: items,
      };
    }

    return {
      type: "internal",
      featureNames,
      weights,
      threshold,
      sampleCount: items.length,
      left: buildNode(left, depth + 1),
      right: buildNode(right, depth + 1),
    };
  }

  const root = buildNode(normalizedProducts, 0);
  attachNormalization(root, normalization);
  return root;
}

function attachNormalization(node: ObliqueTreeNode, normalization: NormalizationStats): void {
  node.normalization = normalization;
  if (node.type === "internal") {
    attachNormalization(node.left, normalization);
    attachNormalization(node.right, normalization);
  }
}
  
  /** -----------------------------
   * Feature Normalization
   * ----------------------------- */
function normalizeFeatures(
  products: ProductVector[],
  numFeatures: number
): { normalizedProducts: ProductVector[]; normalization: NormalizationStats } {
  if (products.length === 0) {
    return { normalizedProducts: products, normalization: { mins: [], maxs: [] } };
  }

  // Find min/max for each feature using raw (pre-normalized) values
  const mins: number[] = new Array(numFeatures).fill(Infinity);
  const maxs: number[] = new Array(numFeatures).fill(-Infinity);

  for (const product of products) {
    for (let i = 0; i < numFeatures; i++) {
      const val = product.rawValues?.[i] ?? product.values[i];
      if (val < mins[i]) mins[i] = val;
      if (val > maxs[i]) maxs[i] = val;
    }
  }

  // Normalize to [0, 1]
  const normalizedProducts = products.map((product) => ({
    ...product,
    values: product.values.map((val, idx) => {
      const baseVal = product.rawValues?.[idx] ?? val;
      const range = maxs[idx] - mins[idx];
      if (range === 0) return 0.5; // All values are the same
      return (baseVal - mins[idx]) / range;
    }),
  }));

  return { normalizedProducts, normalization: { mins, maxs } };
}

  /** -----------------------------
   * Information Gain Calculation
   * ----------------------------- */
  function calculateGiniImpurity(items: ProductVector[]): number {
    if (items.length === 0) return 0;
    // For now, we use a simple impurity measure based on variance
    // In a more sophisticated version, we'd use actual class labels
    const numFeatures = items[0].values.length;
    let totalVariance = 0;

    for (let i = 0; i < numFeatures; i++) {
      const values = items.map((p) => p.values[i]);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
      totalVariance += variance;
    }

    return totalVariance / numFeatures;
  }

  function calculateInformationGain(
    parent: ProductVector[],
    left: ProductVector[],
    right: ProductVector[]
  ): number {
    if (parent.length === 0) return 0;

    const parentImpurity = calculateGiniImpurity(parent);
    const leftWeight = left.length / parent.length;
    const rightWeight = right.length / parent.length;
    const leftImpurity = calculateGiniImpurity(left);
    const rightImpurity = calculateGiniImpurity(right);

    const weightedImpurity = leftWeight * leftImpurity + rightWeight * rightImpurity;
    return parentImpurity - weightedImpurity;
  }

  /** -----------------------------
   * Find Best Split Using Information Gain
   * ----------------------------- */
function findBestSplit(
  items: ProductVector[],
  numFeatures: number,
  minBranchFraction: number,
  featureNames: string[]
): { weights: number[]; threshold: number; infoGain: number } | null {
  if (items.length < 2) return null;

  const NUM_OBLIQUE_CANDIDATES = 8;
  const MAX_AXIS_THRESHOLDS = 12;
  let bestSplit: { weights: number[]; threshold: number; infoGain: number } | null = null;
  let bestGain = -Infinity;

  const isOneHot = (name: string) => name.includes('=');
  const categoricalBoost = 6; // strongly prefer categorical splits

  // Axis-aligned candidates (more interpretable)
  let bestCategoricalSplit: { weights: number[]; threshold: number; infoGain: number } | null = null;
  let bestCategoricalGain = -Infinity;

  for (let f = 0; f < numFeatures; f++) {
    const values = items.map((p) => p.values[f]).filter((v) => !isNaN(v));
    const uniqueVals = Array.from(new Set(values)).sort((a, b) => a - b);
    if (uniqueVals.length <= 1) continue;

    const thresholds: number[] = [];
    // Sample midpoints between unique values
    for (let i = 0; i < uniqueVals.length - 1; i++) {
      const mid = (uniqueVals[i] + uniqueVals[i + 1]) / 2;
      thresholds.push(mid);
    }
    // Downsample thresholds if too many
    if (thresholds.length > MAX_AXIS_THRESHOLDS) {
      const step = Math.ceil(thresholds.length / MAX_AXIS_THRESHOLDS);
      const sampled: number[] = [];
      for (let i = 0; i < thresholds.length; i += step) {
        sampled.push(thresholds[i]);
      }
      thresholds.length = 0;
      thresholds.push(...sampled);
    }

    for (const thr of thresholds) {
      const left: ProductVector[] = [];
      const right: ProductVector[] = [];

      for (const p of items) {
        const projection = p.values[f];
        if (projection <= thr) left.push(p);
        else right.push(p);
      }

      if (
        left.length === 0 ||
        right.length === 0 ||
        left.length < minBranchFraction * items.length ||
        right.length < minBranchFraction * items.length
      ) {
        continue;
      }

      const infoGain = calculateInformationGain(items, left, right);
      const boostedGain = isOneHot(featureNames[f]) ? infoGain * categoricalBoost : infoGain;

      const weights = new Array(numFeatures).fill(0);
      weights[f] = 1;

      if (isOneHot(featureNames[f]) && boostedGain > bestCategoricalGain) {
        bestCategoricalGain = boostedGain;
        bestCategoricalSplit = { weights, threshold: thr, infoGain };
      }

      if (boostedGain > bestGain) {
        bestGain = boostedGain;
        bestSplit = { weights, threshold: thr, infoGain };
      }
    }
  }

  // Oblique candidates (retain flexibility)
  for (let c = 0; c < NUM_OBLIQUE_CANDIDATES; c++) {
    const { aIndex, bIndex } = findFarthest(items);
    const a = items[aIndex].values;
    const b = items[bIndex].values;
    const w = subtract(b, a);
    const m = midpoint(a, b);
    const threshold = dot(w, m);

    // Partition items
    const left: ProductVector[] = [];
    const right: ProductVector[] = [];

    for (const p of items) {
      const projection = dot(w, p.values);
      if (projection <= threshold) left.push(p);
      else right.push(p);
    }

    if (
      left.length === 0 ||
      right.length === 0 ||
      left.length < minBranchFraction * items.length ||
      right.length < minBranchFraction * items.length
    ) {
      continue;
    }

    const infoGain = calculateInformationGain(items, left, right);

    if (infoGain > bestGain) {
      bestGain = infoGain;
      bestSplit = { weights: w, threshold, infoGain };
    }
  }

  // Prefer the best categorical split if it's competitive
  const bestIsCategorical =
    bestSplit &&
    bestSplit.weights.findIndex((w) => w !== 0) >= 0 &&
    isOneHot(featureNames[bestSplit.weights.findIndex((w) => w !== 0)]);

  if (
    bestCategoricalSplit &&
    (!bestSplit ||
      !bestIsCategorical ||
      bestCategoricalGain >= bestGain * 0.35) // lean toward categorical even when slightly weaker
  ) {
    return bestCategoricalSplit;
  }

  return bestSplit;
}

  /** -----------------------------
   * Helper math utilities
   * ----------------------------- */
  function dot(a: number[], b: number[]): number {
    return a.reduce((s, v, i) => s + v * b[i], 0);
  }
  
  function subtract(a: number[], b: number[]): number[] {
    return a.map((v, i) => v - b[i]);
  }
  
  function midpoint(a: number[], b: number[]): number[] {
    return a.map((v, i) => (v + b[i]) / 2);
  }
  
  function squaredDist(a: number[], b: number[]): number {
    return a.reduce((s, v, i) => {
      const d = v - b[i];
      return s + d * d;
    }, 0);
  }
  
  /**
   * Optimized farthest point finding using random sampling
   * Reduces complexity from O(n²) to O(k*n) where k is sample size
   * For small datasets (< 100), uses brute force. For larger, uses sampling.
   */
  function findFarthest(items: ProductVector[]) {
    const SAMPLE_SIZE = 50; // Number of random pairs to check
    
    // For small datasets, use brute force (more accurate)
    if (items.length <= 100) {
      let bestDist = -1;
      let aIndex = 0;
      let bIndex = 0;
    
      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          const d = squaredDist(items[i].values, items[j].values);
          if (d > bestDist) {
            bestDist = d;
            aIndex = i;
            bIndex = j;
          }
        }
      }
    
      return { aIndex, bIndex, dist: bestDist };
    }
    
    // For larger datasets, use random sampling
    let bestDist = -1;
    let aIndex = 0;
    let bIndex = 0;
    
    // Sample random pairs
    const maxSamples = Math.min(SAMPLE_SIZE, (items.length * (items.length - 1)) / 2);
    const checked = new Set<string>();
    
    for (let s = 0; s < maxSamples; s++) {
      // Pick two random distinct indices
      let i: number, j: number;
      let key: string;
      
      do {
        i = Math.floor(Math.random() * items.length);
        j = Math.floor(Math.random() * items.length);
        // Ensure i < j for consistent key
        if (i > j) [i, j] = [j, i];
        key = `${i}_${j}`;
      } while (i === j || checked.has(key));
      
      checked.add(key);
      
      const d = squaredDist(items[i].values, items[j].values);
      if (d > bestDist) {
        bestDist = d;
        aIndex = i;
        bIndex = j;
      }
    }
  
    return { aIndex, bIndex, dist: bestDist };
  }
  