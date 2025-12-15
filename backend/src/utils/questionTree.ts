import type { Product } from '../models/Product';
import type {
  FeatureMetadata,
  QuestionTreeNode,
  ProductSummary,
} from '../../../shared/types/questionTree.types';
import type { QuestionChoice } from '../../../shared/types/questionnaire.types';

interface BuildQuestionTreeOptions {
  maxDepth?: number;
  minLeafSize?: number;
  minGain?: number;
}

interface ProductWithScore extends ProductSummary {
  score: number;
}

interface QuestionTreeBuildResult {
  headers: string[];
  featureMetadata: FeatureMetadata[];
  questionTree: QuestionTreeNode;
}

const DEFAULT_MAX_DEPTH = 4;
const DEFAULT_MIN_LEAF_SIZE = 3;
const DEFAULT_MIN_GAIN = 1e-3;
const MAX_CATEGORIES = 6;
const MAX_PRODUCTS_PER_LEAF = 50;

const SCORE_FIELD_KEYWORDS = ['rating', 'review', 'score', 'popularity', 'rank', 'quality'];
const LOWER_BETTER_KEYWORDS = ['price', 'cost', 'time', 'duration', 'ship', 'wait'];

/**
 * Entry point: build feature metadata and a compact, axis-aligned question tree
 * from uploaded product data.
 */
export function buildQuestionTreeFromProducts(
  products: Product[],
  options: BuildQuestionTreeOptions = {}
): QuestionTreeBuildResult {
  const headers = collectHeaders(products);
  const featureMetadata = inferFeatureMetadata(products, headers);
  const questionTree = buildQuestionTree(products, featureMetadata, options);

  return {
    headers,
    featureMetadata,
    questionTree,
  };
}

function collectHeaders(products: Product[]): string[] {
  const headers = new Set<string>();
  products.forEach((p) => {
    Object.keys(p.attributes || {}).forEach((key) => headers.add(key));
  });
  return Array.from(headers);
}

function inferFeatureMetadata(products: Product[], headers: string[]): FeatureMetadata[] {
  return headers.map((name) => {
    const values = products
      .map((p) => p.attributes?.[name])
      .filter((v) => v !== undefined && v !== null && `${v}`.trim().length > 0);

    const numericValues: number[] = [];
    const categoricalValues: string[] = [];

    values.forEach((v) => {
      const num = Number(v);
      if (!isNaN(num) && isFinite(num)) {
        numericValues.push(num);
      } else {
        categoricalValues.push(String(v));
      }
    });

    const numericFraction = values.length > 0 ? numericValues.length / values.length : 0;
    const isNumeric = numericFraction >= 0.6;

    const distinctValues = Array.from(new Set(values.map((v) => String(v)))).slice(0, 50);

    let type: FeatureMetadata['type'] = 'categorical';
    let min: number | undefined;
    let max: number | undefined;

    if (isNumeric) {
      type = 'numeric';
      min = numericValues.length > 0 ? Math.min(...numericValues) : undefined;
      max = numericValues.length > 0 ? Math.max(...numericValues) : undefined;
    }

    // Basic heuristics to decide if this should be ignored
    const lower = name.toLowerCase();
    const looksLikeId =
      /(^id$|product|sku|uuid|serial|code|identifier)/i.test(lower) ||
      lower.endsWith('_id') ||
      lower.endsWith('id');
    const looksLikeTimestamp = /(timestamp|created_at|updated_at|date)/i.test(lower);

    const cardinality = distinctValues.length;
    const questionWorthy =
      !looksLikeId &&
      !looksLikeTimestamp &&
      ((type === 'numeric' && (max ?? 0) !== (min ?? 0)) ||
        (type === 'categorical' && cardinality > 1 && cardinality <= 30));

    return {
      name,
      type: questionWorthy ? type : 'ignored',
      distinctValues,
      min,
      max,
      questionWorthy,
      exampleValues: distinctValues.slice(0, 3),
    };
  });
}

function buildQuestionTree(
  products: Product[],
  metadata: FeatureMetadata[],
  options: BuildQuestionTreeOptions
): QuestionTreeNode {
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  const minLeafSize = options.minLeafSize ?? DEFAULT_MIN_LEAF_SIZE;
  const minGain = options.minGain ?? DEFAULT_MIN_GAIN;

  const questionWorthy = metadata.filter((m) => m.questionWorthy && m.type !== 'ignored');
  const metaByName = new Map(metadata.map((m) => [m.name, m]));
  const scoredProducts: ProductWithScore[] = products.map((p) => ({
    id: p.id,
    attributes: p.attributes,
    originalRow: p.originalRow || [],
    score: computeScore(p, questionWorthy),
  }));

  const buildNode = (items: ProductWithScore[], depth: number): QuestionTreeNode => {
    if (depth >= maxDepth || items.length <= minLeafSize) {
      return makeLeaf(items);
    }

    const split = findBestSplit(items, questionWorthy, minLeafSize, minGain, metaByName);
    if (!split) {
      return makeLeaf(items);
    }

    if (split.type === 'numeric') {
      const leftNode = buildNode(split.leftItems, depth + 1);
      const rightNode = buildNode(split.rightItems, depth + 1);
      const { question, options } = buildNumericQuestion(split.feature, split.threshold, metaByName);
      return {
        id: `num_${split.feature}_${split.threshold.toFixed(4)}_${depth}`,
        type: 'numeric',
        feature: split.feature,
        question,
        threshold: split.threshold,
        options,
        left: leftNode,
        right: rightNode,
        sampleCount: items.length,
      };
    }

    const children: Record<string, QuestionTreeNode> = {};
    split.branches.forEach((branchItems, key) => {
      children[key] = buildNode(branchItems, depth + 1);
    });

    const { question, options } = buildCategoricalQuestion(split.feature, Array.from(split.branches.keys()));

    return {
      id: `cat_${split.feature}_${depth}`,
      type: 'categorical',
      feature: split.feature,
      question,
      options,
      children,
      sampleCount: items.length,
    };
  };

  return buildNode(scoredProducts, 0);
}

function computeScore(product: Product, metadata: FeatureMetadata[]): number {
  const numericFeatures = metadata.filter((m) => m.type === 'numeric');
  const scoringFeature = numericFeatures.find((m) =>
    SCORE_FIELD_KEYWORDS.some((kw) => m.name.toLowerCase().includes(kw))
  );

  const valueFromFeature = scoringFeature
    ? Number(product.attributes?.[scoringFeature.name])
    : NaN;

  if (!isNaN(valueFromFeature) && isFinite(valueFromFeature)) {
    return valueFromFeature;
  }

  // Composite score: average of normalized numeric question-worthy attributes
  const normalizedValues: number[] = [];
  numericFeatures.forEach((meta) => {
    const val = Number(product.attributes?.[meta.name]);
    if (isNaN(val) || !isFinite(val) || meta.min === undefined || meta.max === undefined) {
      return;
    }
    const range = meta.max - meta.min;
    if (range === 0) return;
    let normalized = (val - meta.min) / range;
    if (LOWER_BETTER_KEYWORDS.some((kw) => meta.name.toLowerCase().includes(kw))) {
      normalized = 1 - normalized; // lower is better
    }
    normalizedValues.push(Math.max(0, Math.min(1, normalized)));
  });

  if (normalizedValues.length === 0) {
    return 1; // neutral default
  }

  return normalizedValues.reduce((sum, v) => sum + v, 0) / normalizedValues.length;
}

type NumericSplit = {
  type: 'numeric';
  feature: string;
  threshold: number;
  gain: number;
  leftItems: ProductWithScore[];
  rightItems: ProductWithScore[];
};

type CategoricalSplit = {
  type: 'categorical';
  feature: string;
  gain: number;
  branches: Map<string, ProductWithScore[]>;
};

type SplitResult = NumericSplit | CategoricalSplit;

function findBestSplit(
  items: ProductWithScore[],
  metadata: FeatureMetadata[],
  minLeafSize: number,
  minGain: number,
  metaByName: Map<string, FeatureMetadata>
): SplitResult | null {
  const parentVariance = variance(items.map((i) => i.score));
  let bestSplit: SplitResult | null = null;
  let bestGain = minGain;

  const questionWorthy = metadata.filter((m) => m.questionWorthy && m.type !== 'ignored');

  questionWorthy.forEach((meta) => {
    if (meta.type === 'numeric') {
      const candidate = bestNumericSplit(items, meta, minLeafSize, parentVariance);
      if (candidate && candidate.gain > bestGain) {
        bestGain = candidate.gain;
        bestSplit = candidate;
      }
    } else if (meta.type === 'categorical') {
      const candidate = bestCategoricalSplit(items, meta, minLeafSize, parentVariance, metaByName);
      if (candidate && candidate.gain > bestGain) {
        bestGain = candidate.gain;
        bestSplit = candidate;
      }
    }
  });

  return bestSplit;
}

function bestNumericSplit(
  items: ProductWithScore[],
  meta: FeatureMetadata,
  minLeafSize: number,
  parentVariance: number
): NumericSplit | null {
  const values = items
    .map((item) => ({
      val: Number(item.attributes[meta.name]),
      item,
    }))
    .filter((entry) => !isNaN(entry.val) && isFinite(entry.val))
    .sort((a, b) => a.val - b.val);

  if (values.length < minLeafSize * 2) {
    return null;
  }

  // Candidate thresholds: quartiles
  const uniqueVals = Array.from(new Set(values.map((v) => v.val)));
  const thresholds: number[] = [];
  for (let i = 1; i < uniqueVals.length; i++) {
    const mid = (uniqueVals[i - 1] + uniqueVals[i]) / 2;
    thresholds.push(mid);
  }

  let best: NumericSplit | null = null;
  let bestGain = -Infinity;

  thresholds.slice(0, 25).forEach((thr) => {
    const leftItems = values.filter((v) => v.val <= thr).map((v) => v.item);
    const rightItems = values.filter((v) => v.val > thr).map((v) => v.item);

    if (leftItems.length < minLeafSize || rightItems.length < minLeafSize) {
      return;
    }

    const gain = informationGain(parentVariance, leftItems, rightItems);
    if (gain > bestGain) {
      bestGain = gain;
      best = {
        type: 'numeric',
        feature: meta.name,
        threshold: thr,
        gain,
        leftItems,
        rightItems,
      };
    }
  });

  return best;
}

function bestCategoricalSplit(
  items: ProductWithScore[],
  meta: FeatureMetadata,
  minLeafSize: number,
  parentVariance: number,
  metaByName: Map<string, FeatureMetadata>
): CategoricalSplit | null {
  const freq = new Map<string, number>();
  items.forEach((item) => {
    const raw = item.attributes[meta.name];
    const key = raw === undefined || raw === null ? '__MISSING__' : String(raw);
    freq.set(key, (freq.get(key) || 0) + 1);
  });

  const sortedCats = Array.from(freq.entries()).sort((a, b) => b[1] - a[1]);
  const topCategories = sortedCats.slice(0, MAX_CATEGORIES).map(([cat]) => cat);

  const branches = new Map<string, ProductWithScore[]>();
  topCategories.forEach((cat) => branches.set(cat, []));

  const otherKey = topCategories.length < freq.size ? '__OTHER__' : null;
  if (otherKey) branches.set(otherKey, []);

  items.forEach((item) => {
    const raw = item.attributes[meta.name];
    const key = raw === undefined || raw === null ? '__MISSING__' : String(raw);
    if (branches.has(key)) {
      branches.get(key)!.push(item);
    } else if (otherKey) {
      branches.get(otherKey)!.push(item);
    }
  });

  // Remove small branches
  Array.from(branches.keys()).forEach((key) => {
    if ((branches.get(key)?.length || 0) < minLeafSize) {
      branches.delete(key);
    }
  });

  if (branches.size < 2) {
    return null;
  }

  const gain = categoricalInformationGain(parentVariance, branches, items.length);
  if (gain <= 0) return null;

  return {
    type: 'categorical',
    feature: meta.name,
    gain,
    branches,
  };
}

function variance(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  return values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
}

function informationGain(
  parentVariance: number,
  left: ProductWithScore[],
  right: ProductWithScore[]
): number {
  const total = left.length + right.length;
  if (total === 0) return 0;
  const leftVar = variance(left.map((i) => i.score));
  const rightVar = variance(right.map((i) => i.score));
  const weighted = (left.length / total) * leftVar + (right.length / total) * rightVar;
  return parentVariance - weighted;
}

function categoricalInformationGain(
  parentVariance: number,
  branches: Map<string, ProductWithScore[]>,
  totalCount: number
): number {
  let weighted = 0;
  branches.forEach((items) => {
    weighted += (items.length / totalCount) * variance(items.map((i) => i.score));
  });
  return parentVariance - weighted;
}

function makeLeaf(items: ProductWithScore[]): QuestionTreeNode {
  const sorted = [...items].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const representativeProducts = sorted.slice(0, 3);
  const storedProducts = sorted.slice(0, Math.min(sorted.length, MAX_PRODUCTS_PER_LEAF));
  return {
    id: `leaf_${Math.random().toString(36).slice(2, 8)}`,
    type: 'leaf',
    sampleCount: items.length,
    products: storedProducts,
    representativeProducts,
  };
}

function buildNumericQuestion(
  feature: string,
  threshold: number,
  metaByName: Map<string, FeatureMetadata>
): { question: string; options: QuestionChoice[] } {
  const featureLabel = humanize(feature);
  const formattedThreshold = formatValue(threshold, metaByName.get(feature));
  const question = `Are you looking for ${featureLabel} at or below ${formattedThreshold}?`;
  const options: QuestionChoice[] = [
    { id: 'leq', label: `At or below ${formattedThreshold}`, value: '<=' },
    { id: 'gt', label: `Above ${formattedThreshold}`, value: '>' },
  ];
  return { question, options };
}

function buildCategoricalQuestion(
  feature: string,
  categories: string[]
): { question: string; options: QuestionChoice[] } {
  const featureLabel = humanize(feature);
  const question = `Which ${featureLabel} do you prefer?`;
  const options: QuestionChoice[] = categories.map((cat) => {
    const readable =
      cat === '__OTHER__'
        ? 'Other'
        : cat === '__MISSING__'
        ? 'Not specified'
        : humanize(cat);
    return {
      id: cat,
      label: readable,
      value: cat,
    };
  });
  return { question, options };
}

function humanize(text: string): string {
  return text
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatValue(value: number, meta?: FeatureMetadata): string {
  if (!meta) return value.toFixed(2);
  const lower = meta.name.toLowerCase();
  const isPrice = lower.includes('price') || lower.includes('cost');
  const isRating = lower.includes('rating') || lower.includes('review');

  if (isPrice) {
    return `$${value.toFixed(2)}`;
  }

  if (isRating) {
    return value.toFixed(1);
  }

  // Generic formatting
  if (Math.abs(value) >= 100) {
    return value.toFixed(0);
  }
  return value.toFixed(2);
}

export type { QuestionTreeBuildResult };


