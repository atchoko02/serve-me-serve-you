// Shared types for attribute profiling
// Used by both frontend and backend

export type AttributeType =
  | 'price'
  | 'rating'
  | 'count'
  | 'percentage'
  | 'duration'
  | 'coordinate'
  | 'identifier'
  | 'dimension'
  | 'weight'
  | 'unknown';

export type PreferenceDirection = 'higher_better' | 'lower_better' | 'neutral';

export type ValueScale = 'small' | 'medium' | 'large';

export interface ValueRange {
  min: number;
  max: number;
  mean: number;
  median: number;
  stdDev: number;
  q25: number; // 25th percentile
  q75: number; // 75th percentile
}

export interface AttributeProfile {
  name: string;
  type: AttributeType;
  isPreferenceRelevant: boolean;
  valueRange: ValueRange;
  scale: ValueScale;
  direction: PreferenceDirection;
  description: string;
  unit?: string; // Inferred unit (dollars, days, seconds, etc.)
  categorical?: boolean; // True if limited unique values
  uniqueValues?: number; // Count of unique values
  uniqueValueRatio?: number; // uniqueValues / totalValues (0-1)
}

