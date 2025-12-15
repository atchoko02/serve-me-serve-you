// Shared types for questionnaire functionality

export type QuestionKind = 'hyperplane' | 'attribute' | 'categorical' | 'numeric';

export interface QuestionChoice {
  id: string;
  label: string;
  value?: string;
}

export interface Question {
  id: string;
  text: string;
  type: QuestionKind;
  feature?: string;
  // For hyperplane questions (legacy)
  weights?: number[];
  featureNames?: string[];
  threshold?: number;
  // For categorical/numeric question tree
  options?: QuestionChoice[];
  // For attribute questions (fallback)
  attributeA?: string;
  attributeB?: string;
}

export interface Answer {
  questionId: string;
  /** Option identifier or legacy left/right choice */
  choice: string;
  optionLabel?: string;
  timestamp: number;
}

export interface NavigationStep {
  nodeId: string;
  question: Question;
  answer: Answer | null;
  timestamp: number;
}

export interface QuestionnaireSession {
  sessionId: string;
  treeId: string;
  currentNodeId: string;
  navigationPath: NavigationStep[];
  startTime: number;
  completed: boolean;
}

