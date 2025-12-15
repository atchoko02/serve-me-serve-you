// Attribute profiling utility
// Analyzes attributes to understand their semantic meaning and generate adaptive descriptions
import type { AttributeProfile, AttributeType, PreferenceDirection, ValueScale, ValueRange } from '../../../shared/types/attributeProfile.types';
import type { ProductVector } from './decisionTree';

function parseOneHotName(name: string): { base: string; value: string } | null {
  const parts = name.split('=');
  if (parts.length === 2) {
    return { base: parts[0], value: parts[1] };
  }
  return null;
}

/**
 * Calculate statistical measures for a set of values
 */
function calculateStatistics(values: number[]): ValueRange {
  if (values.length === 0) {
    return {
      min: 0,
      max: 0,
      mean: 0,
      median: 0,
      stdDev: 0,
      q25: 0,
      q75: 0,
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];
  
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  
  const q25Index = Math.floor(sorted.length * 0.25);
  const q75Index = Math.floor(sorted.length * 0.75);
  const q25 = sorted[q25Index];
  const q75 = sorted[q75Index];

  return { min, max, mean, median, stdDev, q25, q75 };
}

/**
 * Determine value scale based on magnitude
 */
function determineScale(valueRange: ValueRange): ValueScale {
  const magnitude = Math.max(Math.abs(valueRange.max), Math.abs(valueRange.min));
  
  if (magnitude < 10) return 'small';
  if (magnitude < 1000) return 'medium';
  return 'large';
}

/**
 * Detect attribute type based on name and value patterns
 */
function detectAttributeType(
  name: string,
  valueRange: ValueRange,
  uniqueValueRatio: number
): AttributeType {
  const lower = name.toLowerCase().trim();

  // Identifier detection (high uniqueness, often integer)
  if (uniqueValueRatio > 0.95 && Number.isInteger(valueRange.mean)) {
    if (lower.includes('id') || lower.includes('identifier') || lower === 'id') {
      return 'identifier';
    }
  }

  // Coordinate detection
  if (lower === 'lat' || lower === 'latitude' || lower === 'lng' || lower === 'longitude' || lower === 'lon' || lower === 'x' || lower === 'y' || lower === 'z') {
    return 'coordinate';
  }

  // Price detection (typically positive, often has decimals, wide range)
  if (lower.includes('price') || lower.includes('cost') || lower.includes('amount')) {
    return 'price';
  }
  // Heuristic: values that look like prices (0.01 to 100000 range, often decimals)
  if (valueRange.min >= 0 && valueRange.max <= 100000 && valueRange.mean > 0 && !Number.isInteger(valueRange.mean)) {
    if (lower.includes('$') || lower.includes('usd') || lower.includes('dollar')) {
      return 'price';
    }
  }

  // Rating detection (typically 0-5 or 0-10, often 1 decimal place)
  if (lower.includes('rating') || lower.includes('review') || lower.includes('score')) {
    return 'rating';
  }
  // Heuristic: values in typical rating ranges
  if (valueRange.min >= 0 && valueRange.max <= 10 && valueRange.mean >= 0 && valueRange.mean <= 10) {
    if (uniqueValueRatio < 0.3) { // Limited unique values (like 1.0, 1.5, 2.0, etc.)
      return 'rating';
    }
  }

  // Percentage detection (0-100 range)
  if (lower.includes('percent') || lower.includes('percentage') || lower.includes('%')) {
    return 'percentage';
  }
  if (valueRange.min >= 0 && valueRange.max <= 100 && valueRange.mean >= 0 && valueRange.mean <= 100) {
    if (lower.includes('rate') || lower.includes('ratio')) {
      return 'percentage';
    }
  }

  // Duration/time detection
  if (lower.includes('duration') || lower.includes('time') || lower.includes('delay') || lower.includes('wait')) {
    return 'duration';
  }
  if (lower.includes('day') || lower.includes('hour') || lower.includes('minute') || lower.includes('second')) {
    return 'duration';
  }

  // Dimension detection
  if (lower.includes('width') || lower.includes('height') || lower.includes('length') || lower.includes('depth')) {
    return 'dimension';
  }
  if (lower.includes('size') && valueRange.min >= 0) {
    return 'dimension';
  }

  // Weight detection
  if (lower.includes('weight') || lower.includes('mass')) {
    return 'weight';
  }

  // Count detection (integer values, often starting from 0 or 1)
  if (Number.isInteger(valueRange.mean) && valueRange.min >= 0) {
    if (lower.includes('count') || lower.includes('quantity') || lower.includes('num') || lower.includes('qty')) {
      return 'count';
    }
  }

  return 'unknown';
}

/**
 * Determine preference direction (higher better, lower better, or neutral)
 */
function determinePreferenceDirection(
  type: AttributeType,
  name: string
): PreferenceDirection {
  const lower = name.toLowerCase();

  // Price/cost: lower is better
  if (type === 'price' || lower.includes('price') || lower.includes('cost')) {
    return 'lower_better';
  }

  // Duration/time: lower is better
  if (type === 'duration' || lower.includes('time') || lower.includes('duration') || lower.includes('delay')) {
    return 'lower_better';
  }

  // Rating/score: higher is better
  if (type === 'rating' || lower.includes('rating') || lower.includes('review') || lower.includes('score')) {
    return 'higher_better';
  }

  // Percentage: depends on context, default to higher better
  if (type === 'percentage') {
    if (lower.includes('error') || lower.includes('failure') || lower.includes('defect')) {
      return 'lower_better';
    }
    return 'higher_better';
  }

  // Count: usually higher is better (more features, more items)
  if (type === 'count') {
    if (lower.includes('error') || lower.includes('defect') || lower.includes('issue')) {
      return 'lower_better';
    }
    return 'higher_better';
  }

  // Weight/dimension: depends on context, default to neutral
  if (type === 'weight' || type === 'dimension') {
    return 'neutral';
  }

  // Coordinates and identifiers: not preference-relevant
  if (type === 'coordinate' || type === 'identifier') {
    return 'neutral';
  }

  // Default: neutral (user preference dependent)
  return 'neutral';
}

/**
 * Generate human-readable description for an attribute
 */
function generateDescription(
  name: string,
  type: AttributeType,
  valueRange: ValueRange,
  direction: PreferenceDirection
): string {
  const lower = name.toLowerCase().trim();

  // Use type-specific descriptions
  switch (type) {
    case 'price':
      return 'affordability';
    case 'rating':
      return 'customer ratings';
    case 'duration':
      if (lower.includes('ship') || lower.includes('delivery')) {
        return 'shipping speed';
      }
      if (lower.includes('time') || lower.includes('wait')) {
        return 'time efficiency';
      }
      return 'duration';
    case 'percentage':
      if (lower.includes('discount') || lower.includes('sale')) {
        return 'discount';
      }
      return 'percentage';
    case 'count':
      if (lower.includes('feature')) {
        return 'number of features';
      }
      if (lower.includes('item')) {
        return 'quantity';
      }
      return 'count';
    case 'dimension':
      if (lower.includes('size')) {
        return 'size';
      }
      return 'dimensions';
    case 'weight':
      return 'weight';
    default:
      // Generate from name
      const readable = name.replace(/[_-]/g, ' ').toLowerCase();
      return readable.charAt(0).toUpperCase() + readable.slice(1);
  }
}

/**
 * Infer unit from attribute name and values
 */
function inferUnit(name: string, type: AttributeType, valueRange: ValueRange): string | undefined {
  const lower = name.toLowerCase();

  if (type === 'price') {
    return 'dollars';
  }

  if (type === 'duration') {
    if (lower.includes('day') || valueRange.max > 30) return 'days';
    if (lower.includes('hour') || valueRange.max > 24) return 'hours';
    if (lower.includes('minute') || valueRange.max > 60) return 'minutes';
    if (lower.includes('second')) return 'seconds';
    // Heuristic: if max is small, likely days; if large, likely seconds
    if (valueRange.max < 10) return 'days';
    if (valueRange.max < 100) return 'hours';
    return 'minutes';
  }

  if (type === 'weight') {
    if (lower.includes('kg') || valueRange.max > 100) return 'kilograms';
    if (lower.includes('lb') || lower.includes('pound')) return 'pounds';
    return 'grams';
  }

  if (type === 'dimension') {
    if (lower.includes('inch') || lower.includes('in')) return 'inches';
    if (lower.includes('cm') || lower.includes('centimeter')) return 'centimeters';
    if (lower.includes('meter') || lower.includes('m ')) return 'meters';
    return 'units';
  }

  if (type === 'percentage') {
    return 'percent';
  }

  return undefined;
}

/**
 * Check if attribute is relevant for customer preferences
 */
function isPreferenceRelevant(
  type: AttributeType,
  uniqueValueRatio: number,
  name: string
): boolean {
  // Identifiers and coordinates are never preference-relevant
  if (type === 'identifier' || type === 'coordinate') {
    return false;
  }

  // If too many unique values relative to total, might be identifier
  if (uniqueValueRatio > 0.9 && type === 'unknown') {
    return false;
  }

  // Filter out common non-preference attributes
  const lower = name.toLowerCase();
  if (lower === 'id' || lower === 'product_id' || lower === 'productid') {
    return false;
  }
  if (lower === 'index' || lower === 'row' || lower === 'rowid') {
    return false;
  }

  return true;
}

/**
 * Profile a single attribute from product data
 */
export function profileAttribute(
  name: string,
  values: number[],
  allProducts: ProductVector[]
): AttributeProfile {
  // Filter out invalid values
  const validValues = values.filter(v => !isNaN(v) && isFinite(v));
  
  if (validValues.length === 0) {
    // Return default profile for empty attribute
    return {
      name,
      type: 'unknown',
      isPreferenceRelevant: false,
      valueRange: {
        min: 0,
        max: 0,
        mean: 0,
        median: 0,
        stdDev: 0,
        q25: 0,
        q75: 0,
      },
      scale: 'small',
      direction: 'neutral',
      description: name,
      categorical: false,
      uniqueValues: 0,
      uniqueValueRatio: 0,
    };
  }

  // Calculate statistics
  const valueRange = calculateStatistics(validValues);
  const scale = determineScale(valueRange);

  // Calculate uniqueness
  const uniqueValues = new Set(validValues).size;
  const uniqueValueRatio = uniqueValues / validValues.length;
  const categorical = uniqueValueRatio < 0.2 && uniqueValues < 20; // Less than 20% unique and fewer than 20 unique values
  const oneHot = parseOneHotName(name);

  // Detect type
  let type = detectAttributeType(name, valueRange, uniqueValueRatio);

  // Determine preference direction
  let direction = determinePreferenceDirection(type, name);

  // Generate description
  let description = generateDescription(name, type, valueRange, direction);

  // Treat one-hot encoded categorical flags as categorical attributes
  let categoricalFlag = categorical;
  if (oneHot) {
    categoricalFlag = true;
    type = 'unknown';
    direction = 'neutral';
    const baseReadable = oneHot.base.replace(/[_-]/g, ' ').toLowerCase();
    const valueReadable = oneHot.value.replace(/[_-]/g, ' ').toLowerCase();
    description = `${baseReadable} is ${valueReadable}`;
  }

  // Check if preference-relevant
  const preferenceRelevant = isPreferenceRelevant(type, uniqueValueRatio, name);

  // Infer unit
  const unit = inferUnit(name, type, valueRange);

  return {
    name,
    type,
    isPreferenceRelevant: preferenceRelevant,
    valueRange,
    scale,
    direction,
    description,
    unit,
    categorical: categoricalFlag,
    uniqueValues,
    uniqueValueRatio,
  };
}

/**
 * Profile all attributes from a set of products
 */
export function profileAllAttributes(
  featureNames: string[],
  products: ProductVector[]
): AttributeProfile[] {
  if (products.length === 0 || featureNames.length === 0) {
    return [];
  }

  // Extract values for each attribute
  const attributeValues: Map<string, number[]> = new Map();
  
  featureNames.forEach((name, index) => {
    const values: number[] = [];
    products.forEach(product => {
      if (product.values && product.values[index] !== undefined) {
        values.push(product.values[index]);
      }
    });
    attributeValues.set(name, values);
  });

  // Profile each attribute
  const profiles: AttributeProfile[] = [];
  featureNames.forEach(name => {
    const values = attributeValues.get(name) || [];
    const profile = profileAttribute(name, values, products);
    profiles.push(profile);
  });

  return profiles;
}

