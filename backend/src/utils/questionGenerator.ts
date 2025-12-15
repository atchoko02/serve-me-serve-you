// Question generation from decision tree hyperplane splits
import { Question } from '../../../shared/types/questionnaire.types';
import { ObliqueTreeNode } from './decisionTree';
import type { AttributeProfile, AttributeType } from '../../../shared/types/attributeProfile.types';
import { analyzeSplit, describeLeftBranch, describeRightBranch } from './splitAnalyzer';

/**
 * Check if an attribute is meaningful for customer preferences
 * Filters out identifiers, coordinates, and other non-preference attributes
 * Uses attribute profiles if available for more accurate filtering
 */
function isMeaningfulAttribute(
  name: string,
  profiles?: Map<string, AttributeProfile>
): boolean {
  // If profiles are available, use them for more accurate filtering
  if (profiles) {
    const profile = profiles.get(name);
    if (profile) {
      return profile.isPreferenceRelevant;
    }
  }

  // Fallback to basic heuristics
  const lower = name.toLowerCase().trim();
  
  // Filter out identifiers and coordinates
  if (lower === 'id' || lower === 'product_id' || lower === 'productid') return false;
  if (lower === 'lat' || lower === 'latitude' || lower === 'lng' || lower === 'longitude' || lower === 'lon') return false;
  if (lower === 'x' || lower === 'y' || lower === 'z') return false;
  if (lower === 'index' || lower === 'row' || lower === 'rowid') return false;
  
  return true;
}

/**
 * Map attribute names to customer-friendly descriptions
 * Uses attribute profiles if available for more accurate descriptions
 */
function parseOneHot(name: string): { base: string; value: string } | null {
  const parts = name.split('=');
  if (parts.length === 2) {
    return { base: parts[0], value: parts[1] };
  }
  return null;
}

function isNumericLikelySecondary(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.includes('rating') || lower.includes('score') || lower.includes('price');
}

function describeAttribute(
  name: string,
  profiles?: Map<string, AttributeProfile>
): string {
  // If profiles are available, use the generated description
  if (profiles) {
    const profile = profiles.get(name);
    if (profile && profile.description) {
      return profile.description;
    }
  }

  const oneHot = parseOneHot(name);

  if (oneHot) {
    const baseReadable = oneHot.base.replace(/[_-]/g, ' ').toLowerCase();
    const valueReadable = oneHot.value.replace(/[_-]/g, ' ').toLowerCase();
    return `${baseReadable} is ${valueReadable}`;
  }

  // Fallback to basic heuristics
  const lower = name.toLowerCase().trim();

  // Price/cost attributes
  if (lower.includes('price') || lower.includes('cost')) return 'affordability';
  if (lower.includes('rating') || lower.includes('review')) return 'customer ratings';
  if (lower.includes('ship') || lower.includes('delivery')) return 'shipping speed';
  if (lower.includes('eco') || lower.includes('sustain')) return 'eco-friendliness';
  if (lower.includes('warranty') || lower.includes('guarantee')) return 'warranty coverage';
  if (lower.includes('popular') || lower.includes('popularity') || lower.includes('trend')) return 'popularity';
  if (lower.includes('durab') || lower.includes('durability')) return 'durability';
  if (lower.includes('qual') || lower.includes('quality')) return 'quality';
  if (lower.includes('weight')) return 'weight';
  if (lower.includes('size') || lower.includes('dimension')) return 'size';
  if (lower.includes('color') || lower.includes('colour')) return 'color options';
  if (lower.includes('brand')) return 'brand reputation';
  if (lower.includes('material')) return 'material quality';
  if (lower.includes('feature') || lower.includes('function')) return 'features';
  if (lower.includes('battery') || lower.includes('power')) return 'battery life';
  if (lower.includes('speed') || lower.includes('performance')) return 'performance';
  if (lower.includes('storage') || lower.includes('capacity')) return 'storage capacity';
  if (lower.includes('screen') || lower.includes('display')) return 'display quality';
  if (lower.includes('camera')) return 'camera quality';
  if (lower.includes('audio') || lower.includes('sound')) return 'audio quality';
  
  // Duration/time attributes
  if (lower.includes('duration') || lower.includes('time') || lower.includes('length')) {
    return 'time efficiency';
  }

  // Fallback: make it readable (capitalize first letter)
  const readable = name.replace(/[_-]/g, ' ').toLowerCase();
  return readable.charAt(0).toUpperCase() + readable.slice(1);
}

/**
 * Check if lower values are better for an attribute
 * Uses attribute profiles if available for more accurate direction
 */
function isLowerBetter(
  attrName: string,
  profiles?: Map<string, AttributeProfile>
): boolean {
  // If profiles are available, use them
  if (profiles) {
    const profile = profiles.get(attrName);
    if (profile) {
      return profile.direction === 'lower_better';
    }
  }

  // Fallback to basic heuristics
  const lower = attrName.toLowerCase();
  return (
    lower.includes('price') ||
    lower.includes('cost') ||
    lower.includes('ship') ||
    lower.includes('time') ||
    lower.includes('duration') ||
    lower.includes('delay')
  );
}

/**
 * Format a value for display in questions (with units if available)
 */
function formatValue(value: number, profile?: AttributeProfile): string {
  if (!profile) {
    return value.toFixed(2);
  }

  // Round based on scale
  let rounded: number;
  if (profile.scale === 'small') {
    rounded = Math.round(value * 100) / 100; // 2 decimal places
  } else if (profile.scale === 'medium') {
    rounded = Math.round(value * 10) / 10; // 1 decimal place
  } else {
    rounded = Math.round(value); // No decimals
  }

  // Add unit if available
  if (profile.unit) {
    if (profile.type === 'price') {
      return `$${rounded.toFixed(2)}`;
    }
    return `${rounded} ${profile.unit}`;
  }

  return rounded.toString();
}

/**
 * Get value range description for an attribute (e.g., "budget", "premium")
 */
function getValueRangeDescription(
  profile: AttributeProfile,
  isLow: boolean
): string {
  const { valueRange, type, unit } = profile;
  const { min, max, q25, median, q75 } = valueRange;

  if (type === 'price') {
    if (isLow) {
      // Low price range
      const lowMax = Math.min(q25, max * 0.3);
      return `budget-friendly (under ${formatValue(lowMax, profile)})`;
    } else {
      // High price range
      const highMin = Math.max(q75, max * 0.7);
      return `premium (over ${formatValue(highMin, profile)})`;
    }
  }

  if (type === 'rating') {
    if (isLow) {
      return `moderate ratings (${formatValue(q25, profile)}-${formatValue(median, profile)})`;
    } else {
      return `high ratings (${formatValue(q75, profile)}+)`;
    }
  }

  if (type === 'duration' || type === 'count') {
    if (isLowerBetter(profile.name, new Map([[profile.name, profile]]))) {
      // Lower is better (duration, time)
      if (isLow) {
        return `faster (under ${formatValue(q25, profile)} ${unit || 'units'})`;
      } else {
        return `slower (over ${formatValue(q75, profile)} ${unit || 'units'})`;
      }
    } else {
      // Higher is better (count, quantity)
      if (isLow) {
        return `fewer (under ${formatValue(q25, profile)} ${unit || 'units'})`;
      } else {
        return `more (over ${formatValue(q75, profile)} ${unit || 'units'})`;
      }
    }
  }

  // Generic fallback
  if (isLow) {
    return `lower ${profile.description} (around ${formatValue(q25, profile)})`;
  } else {
    return `higher ${profile.description} (around ${formatValue(q75, profile)})`;
  }
}

/**
 * Calculate relative importance of attributes in a split
 */
function calculateRelativeImportance(
  weights: number[],
  featureNames: string[],
  profilesMap?: Map<string, AttributeProfile>
): Array<{ name: string; weight: number; importance: number; profile?: AttributeProfile }> {
  const totalAbsWeight = weights.reduce((sum, w) => sum + Math.abs(w), 0);
  
  return featureNames
    .map((name, idx) => ({
      name,
      weight: weights[idx],
      importance: totalAbsWeight > 0 ? Math.abs(weights[idx]) / totalAbsWeight : 0,
      profile: profilesMap?.get(name),
    }))
    .filter(item => item.profile?.isPreferenceRelevant !== false)
    .sort((a, b) => b.importance - a.importance);
}

/**
 * Generate a natural language question from a hyperplane split
 * @param node - The tree node to generate a question for
 * @param attributeProfiles - Optional array of attribute profiles for adaptive question generation
 * @param askedAttributes - Optional set of attribute names that have already been asked about (to avoid repetition)
 * @param treeDepth - Optional current depth in the tree (0 = root) for progressive refinement
 */
export function generateQuestionFromSplit(
  node: ObliqueTreeNode,
  attributeProfiles?: AttributeProfile[],
  askedAttributes?: Set<string>,
  treeDepth: number = 0
): Question {
  if (node.type === 'leaf') {
    throw new Error('Cannot generate question from leaf node');
  }

  const { weights, featureNames, threshold } = node;

  // Create a map of attribute profiles for quick lookup
  const profilesMap = attributeProfiles
    ? new Map(attributeProfiles.map(p => [p.name, p]))
    : undefined;

  // Find dominant features (highest absolute weights)
  // Find dominant features (highest absolute weights)
  // Filter out non-meaningful attributes first, and avoid recently asked attributes
  const featureWeights = featureNames
    .map((name, idx) => ({
      name,
      weight: weights[idx],
      absWeight:
        Math.abs(weights[idx]) *
        (parseOneHot(name) ? 3 : isNumericLikelySecondary(name) ? 0.6 : 1), // boost categorical, downweight rating/price
    }))
    .filter((f) => {
      // Filter out non-meaningful attributes
      if (!isMeaningfulAttribute(f.name, profilesMap)) return false;
      // If we have askedAttributes, prefer attributes that haven't been asked yet
      // But don't completely exclude asked attributes (they might be necessary)
      if (askedAttributes && askedAttributes.has(f.name)) {
        // Penalize already-asked attributes by reducing their weight slightly
        // This makes them less likely to be selected, but still available if needed
        return true; // Still include, but will be deprioritized
      }
      return true;
    })
    .map(f => {
      // Reduce weight for already-asked attributes to prioritize new ones
      if (askedAttributes && askedAttributes.has(f.name)) {
        return { ...f, absWeight: f.absWeight * 0.5 }; // 50% weight reduction
      }
      return f;
    });

  if (featureWeights.length === 0) {
    // Fallback: use all features if none are meaningful
    const allFeatureWeights = featureNames.map((name, idx) => ({
      name,
      weight: weights[idx],
      absWeight: Math.abs(weights[idx]),
    }));
    featureWeights.push(...allFeatureWeights);
  }

  // Sort by absolute weight (descending)
  featureWeights.sort((a, b) => b.absWeight - a.absWeight);

  // Calculate relative importance for better question generation
  const attributeImportance = calculateRelativeImportance(weights, featureNames, profilesMap);
  
  // Focus on top 1-2 most important features for clearer questions
  const maxFeatures = 3;
  const topFeatures = featureWeights.slice(0, Math.min(maxFeatures, featureWeights.length));
  const topImportant = attributeImportance.slice(0, Math.min(maxFeatures, attributeImportance.length));

  // Determine if we're asking about "high" or "low" values
  // Positive weights mean higher values go right, negative mean lower values go right
  const positiveWeights = topFeatures.filter((f) => f.weight > 0);
  const negativeWeights = topFeatures.filter((f) => f.weight < 0);

  // Build question text with value ranges / categories
  let questionText = '';
  const leftFeatures: string[] = [];
  const rightFeatures: string[] = [];
  const leftDescriptions: string[] = [];
  const rightDescriptions: string[] = [];

  // Axis-aligned convenience: if only one significant weight, derive a concrete threshold
  const nonZeroWeights = weights
    .map((w, i) => ({ w, i }))
    .filter(({ w }) => Math.abs(w) > 1e-6);
  const isAxisAligned = nonZeroWeights.length === 1 && node.normalization;
  let axisLeftDesc: string | null = null;
  let axisRightDesc: string | null = null;

  if (isAxisAligned) {
    const idx = nonZeroWeights[0].i;
    const w = nonZeroWeights[0].w;
    const norm = node.normalization!;
    const min = norm.mins[idx];
    const max = norm.maxs[idx];
    if (min !== undefined && max !== undefined && Number.isFinite(min) && Number.isFinite(max)) {
      const normalizedCutoff = w !== 0 ? threshold / w : null;
      if (normalizedCutoff !== null && Number.isFinite(normalizedCutoff)) {
        const rawCutoff = min + normalizedCutoff * (max - min);
        const profile = profilesMap?.get(featureNames[idx]);
        const desc = describeAttribute(featureNames[idx], profilesMap);
        const formatted = profile ? formatValue(rawCutoff, profile) : rawCutoff.toFixed(2);
        axisLeftDesc = `${desc} at or below ${formatted}`;
        axisRightDesc = `${desc} above ${formatted}`;
      }
    }
  }

  // Features with positive weights: higher values → right
  // Features with negative weights: lower values → right
  positiveWeights.forEach((f) => {
    const profile = profilesMap?.get(f.name);
    const desc = describeAttribute(f.name, profilesMap);
    
    const oh = parseOneHot(f.name);
    if (oh) {
      // One-hot: presence vs absence
      rightFeatures.push(`${oh.base} is ${oh.value}`);
      leftFeatures.push(`${oh.base} is not ${oh.value}`);
    } else if (isLowerBetter(f.name, profilesMap)) {
      // For "lower is better" attributes (price, shipping time), higher = worse
      if (profile && attributeProfiles) {
        leftDescriptions.push(getValueRangeDescription(profile, true)); // Low values (better)
        rightDescriptions.push(getValueRangeDescription(profile, false)); // High values (worse)
      } else {
        leftFeatures.push(`more ${desc}`);
        rightFeatures.push(`less ${desc}`);
      }
    } else {
      // For "higher is better" attributes (rating, quality), higher = better
      if (profile && attributeProfiles) {
        leftDescriptions.push(getValueRangeDescription(profile, true)); // Low values (worse)
        rightDescriptions.push(getValueRangeDescription(profile, false)); // High values (better)
      } else {
        leftFeatures.push(`less ${desc}`);
        rightFeatures.push(`more ${desc}`);
      }
    }
  });

  negativeWeights.forEach((f) => {
    const profile = profilesMap?.get(f.name);
    const desc = describeAttribute(f.name, profilesMap);
    
    const oh = parseOneHot(f.name);
    if (oh) {
      // One-hot with negative weight: presence goes left
      leftFeatures.push(`${oh.base} is ${oh.value}`);
      rightFeatures.push(`${oh.base} is not ${oh.value}`);
    } else if (isLowerBetter(f.name, profilesMap)) {
      // For "lower is better" attributes with negative weight
      if (profile && attributeProfiles) {
        leftDescriptions.push(getValueRangeDescription(profile, false)); // High values (worse)
        rightDescriptions.push(getValueRangeDescription(profile, true)); // Low values (better)
      } else {
        leftFeatures.push(`less ${desc}`);
        rightFeatures.push(`more ${desc}`);
      }
    } else {
      // For "higher is better" attributes with negative weight
      if (profile && attributeProfiles) {
        leftDescriptions.push(getValueRangeDescription(profile, false)); // High values (better)
        rightDescriptions.push(getValueRangeDescription(profile, true)); // Low values (worse)
      } else {
        leftFeatures.push(`more ${desc}`);
        rightFeatures.push(`less ${desc}`);
      }
    }
  });

  // Phase 3: Try split analysis first (if we have enough products to analyze)
  let splitAnalysis = null;
  let useSplitAnalysis = false;
  let leftDesc = '';
  let rightDesc = '';

  try {
    splitAnalysis = analyzeSplit(node, attributeProfiles);
    if (splitAnalysis && splitAnalysis.distinguishingAttributes.length > 0) {
      // Use split analysis if we have meaningful distinguishing attributes
      const leftBranchDesc = describeLeftBranch(splitAnalysis, attributeProfiles);
      const rightBranchDesc = describeRightBranch(splitAnalysis, attributeProfiles);
      
      // Only use split analysis if descriptions are meaningful
      if (leftBranchDesc !== 'one set of products' && rightBranchDesc !== 'another set of products') {
        useSplitAnalysis = true;
        leftDesc = leftBranchDesc;
        rightDesc = rightBranchDesc;
      }
    }
  } catch (error) {
    // If split analysis fails, fall back to value range descriptions
    console.warn('Split analysis failed, falling back to value ranges:', error);
    splitAnalysis = null;
  }

  // Fallback to value range descriptions if split analysis didn't work
  if (!useSplitAnalysis) {
    if (axisLeftDesc && axisRightDesc) {
      leftDesc = axisLeftDesc;
      rightDesc = axisRightDesc;
    } else {
      const useValueRanges = leftDescriptions.length > 0 || rightDescriptions.length > 0;
      leftDesc = useValueRanges 
        ? (leftDescriptions.length > 0 ? leftDescriptions.join(' and ') : leftFeatures.join(' and '))
        : leftFeatures.join(' and ');
      rightDesc = useValueRanges
        ? (rightDescriptions.length > 0 ? rightDescriptions.join(' and ') : rightFeatures.join(' and '))
        : rightFeatures.join(' and ');
    }
  }

  if (leftDesc && rightDesc) {
    // Phase 3: Progressive refinement - adjust question style based on tree depth
    const isEarlyQuestion = treeDepth <= 2; // First 2-3 questions
    const isLateQuestion = treeDepth >= 4; // Later questions (depth 4+)

    // Determine question style based on attribute types and depth
    const primaryProfile = topImportant[0]?.profile;
    const attributeType = primaryProfile?.type;

    // Use split analysis descriptions if available (Phase 3)
    if (useSplitAnalysis) {
      // Split analysis provides concrete product characteristics
      if (isEarlyQuestion) {
        // Early: Broad preferences
        questionText = `Would you prefer products with ${leftDesc} or ${rightDesc}?`;
      } else if (isLateQuestion) {
        // Late: Specific tradeoffs
        questionText = `Within your narrowed preferences, would you prefer ${leftDesc} or ${rightDesc}?`;
      } else {
        // Middle: Balanced
        questionText = `Would you prefer ${leftDesc} or ${rightDesc}?`;
      }
    } else if (attributeType && attributeProfiles) {
      // Use attribute-specific templates when we have profiles
      switch (attributeType) {
        case 'price':
          questionText = isEarlyQuestion
            ? `Would you prefer ${leftDesc} or ${rightDesc}?`
            : `Would you prefer ${leftDesc} or ${rightDesc}?`;
          break;
        case 'rating':
          questionText = isEarlyQuestion
            ? `Do you prioritize ${rightDesc} or are you open to ${leftDesc}?`
            : `Do you prioritize ${rightDesc} or are you open to ${leftDesc}?`;
          break;
        case 'duration':
          questionText = isEarlyQuestion
            ? `Do you value ${leftDesc} or are you willing to accept ${rightDesc}?`
            : `Do you value ${leftDesc} or are you willing to accept ${rightDesc}?`;
          break;
        case 'count':
          questionText = `Would you prefer products with ${rightDesc} or ${leftDesc}?`;
          break;
        default:
          // Generic template
          if (topImportant.length === 1) {
            const templates = [
              `Would you prefer products with ${leftDesc} or ${rightDesc}?`,
              `What matters more to you: ${leftDesc} or ${rightDesc}?`,
              `Which do you value more: ${leftDesc} or ${rightDesc}?`,
            ];
            const templateIndex = Math.abs(Math.floor(threshold * 1000)) % templates.length;
            questionText = templates[templateIndex];
          } else {
            // Multi-attribute with tradeoff
            const primaryAttr = topImportant[0];
            const secondaryAttr = topImportant[1];
            if (primaryAttr.importance > 0.6) {
              // One attribute dominates
              questionText = `Would you prefer ${leftDesc} or ${rightDesc}?`;
            } else {
              // Show tradeoff
              questionText = `Would you prefer ${leftDesc} (even if it means ${rightDesc}) or ${rightDesc} (even if it means ${leftDesc})?`;
            }
          }
      }
    } else {
      // Fallback to generic templates
      if (topImportant.length === 1) {
        const templates = [
          `Would you prefer products with ${leftDesc} or ${rightDesc}?`,
          `What matters more to you: ${leftDesc} or ${rightDesc}?`,
          `Which do you value more: ${leftDesc} or ${rightDesc}?`,
        ];
        const templateIndex = Math.abs(Math.floor(threshold * 1000)) % templates.length;
        questionText = templates[templateIndex];
      } else {
        const templates = [
          `Would you prefer products with ${leftDesc} or ${rightDesc}?`,
          `What matters more to you: ${leftDesc} or ${rightDesc}?`,
          `If you had to choose, would you rather have ${leftDesc} or ${rightDesc}?`,
        ];
        const templateIndex = Math.abs(Math.floor(threshold * 1000)) % templates.length;
        questionText = templates[templateIndex];
      }
    }
  } else {
    // Fallback: use all features
    const allFeatures = topFeatures.map((f) => describeAttribute(f.name, profilesMap)).join(', ');
    questionText = `How important are these features to you: ${allFeatures}?`;
  }

  // Use a stable ID based on node properties, not timestamp
  const nodeId = `q_${threshold}_${weights.join('_').slice(0, 20)}`;

  return {
    id: nodeId,
    text: questionText,
    type: 'hyperplane',
    weights: node.weights,
    featureNames: node.featureNames,
    threshold: node.threshold,
  };
}

/**
 * Generate a simple attribute comparison question (fallback)
 */
export function generateAttributeQuestion(
  attributeA: string,
  attributeB: string,
  attributeProfiles?: AttributeProfile[]
): Question {
  const profilesMap = attributeProfiles
    ? new Map(attributeProfiles.map(p => [p.name, p]))
    : undefined;
  const descA = describeAttribute(attributeA, profilesMap);
  const descB = describeAttribute(attributeB, profilesMap);

  const templates = [
    `What matters more: ${descA} or ${descB}?`,
    `Would you prefer ${descA} or ${descB}?`,
    `Which is more important: ${descA} or ${descB}?`,
  ];

  return {
    id: `attr_${attributeA}_${attributeB}_${Date.now()}`,
    text: templates[Math.floor(Math.random() * templates.length)],
    type: 'attribute',
    attributeA,
    attributeB,
  };
}

