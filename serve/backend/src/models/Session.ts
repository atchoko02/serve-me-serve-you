// Session document interface for Firestore
// Stored in: sessions/{sessionId}
// Temporary collection for active questionnaire sessions
import type { ObliqueTreeNode } from '../utils/decisionTree';
import type { NavigationStep } from '../../../shared/types/questionnaire.types';

export interface Session {
  id: string; // sessionId
  questionnaireId: string;
  businessId: string;
  currentNode: ObliqueTreeNode | null; // Current position in tree (stored as JSON)
  navigationPath: NavigationStep[]; // Answers so far
  startTime: Date | FirebaseFirestore.Timestamp;
  lastActivity: Date | FirebaseFirestore.Timestamp;
  completed: boolean;
  expiresAt?: Date | FirebaseFirestore.Timestamp; // TTL for automatic cleanup
}

// Session document data (without id, for creating)
export interface SessionData {
  questionnaireId: string;
  businessId: string;
  currentNode: ObliqueTreeNode | null;
  navigationPath: NavigationStep[];
  startTime?: Date | FirebaseFirestore.Timestamp;
  lastActivity?: Date | FirebaseFirestore.Timestamp;
  completed?: boolean;
  expiresAt?: Date | FirebaseFirestore.Timestamp;
}

// Helper function to convert Firestore document to Session
export function sessionFromFirestore(
  doc: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>
): Session {
  const data = doc.data();
  if (!data) {
    throw new Error('Session document has no data');
  }
  return {
    id: doc.id,
    questionnaireId: data.questionnaireId,
    businessId: data.businessId,
    currentNode: data.currentNode as ObliqueTreeNode | null,
    navigationPath: data.navigationPath || [],
    startTime: data.startTime,
    lastActivity: data.lastActivity,
    completed: data.completed === true,
    expiresAt: data.expiresAt,
  };
}

