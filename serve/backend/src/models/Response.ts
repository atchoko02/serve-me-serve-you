// Response document interface for Firestore
// Stored as subcollection: questionnaires/{questionnaireId}/responses/{responseId}
import type { NavigationStep } from '../../../shared/types/questionnaire.types';

export interface Response {
  id: string;
  questionnaireId: string;
  sessionId: string;
  customerId?: string; // Customer ID for linking recommendations
  answers: NavigationStep[]; // User's navigation path through the tree
  recommendedProductIds: string[]; // Product IDs that were recommended
  completedAt: Date | FirebaseFirestore.Timestamp;
  duration: number; // Duration in milliseconds
  completed: boolean; // Whether user completed the questionnaire
}

// Response document data (without id, for creating)
export interface ResponseData {
  questionnaireId: string;
  sessionId: string;
  customerId?: string; // Customer ID for linking recommendations
  answers: NavigationStep[];
  recommendedProductIds: string[];
  completedAt?: Date | FirebaseFirestore.Timestamp;
  duration: number;
  completed: boolean;
}

// Helper function to convert Firestore document to Response
export function responseFromFirestore(
  doc: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>,
  questionnaireId: string
): Response {
  const data = doc.data();
  if (!data) {
    throw new Error('Response document has no data');
  }
  return {
    id: doc.id,
    questionnaireId,
    sessionId: data.sessionId,
    customerId: data.customerId,
    answers: data.answers || [],
    recommendedProductIds: data.recommendedProductIds || [],
    completedAt: data.completedAt,
    duration: data.duration || 0,
    completed: data.completed !== false,
  };
}

