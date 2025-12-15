import type { QuestionChoice } from './questionnaire.types';

export type FeatureKind = 'numeric' | 'categorical' | 'ignored';

export interface FeatureMetadata {
  name: string;
  type: FeatureKind;
  distinctValues: string[];
  min?: number;
  max?: number;
  questionWorthy: boolean;
  exampleValues?: string[];
}

export interface ProductSummary {
  id: string;
  attributes: Record<string, string | number>;
  originalRow: string[];
  score?: number;
}

export type QuestionTreeNode =
  | QuestionTreeLeaf
  | NumericQuestionNode
  | CategoricalQuestionNode;

export interface QuestionTreeLeaf {
  id: string;
  type: 'leaf';
  sampleCount: number;
  products: ProductSummary[];
  representativeProducts: ProductSummary[];
}

export interface NumericQuestionNode {
  id: string;
  type: 'numeric';
  feature: string;
  question: string;
  threshold: number;
  options: QuestionChoice[];
  left: QuestionTreeNode;
  right: QuestionTreeNode;
  sampleCount: number;
}

export interface CategoricalQuestionNode {
  id: string;
  type: 'categorical';
  feature: string;
  question: string;
  options: QuestionChoice[];
  children: Record<string, QuestionTreeNode>;
  sampleCount: number;
}


