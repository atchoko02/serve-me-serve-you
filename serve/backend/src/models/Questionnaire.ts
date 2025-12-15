// Questionnaire document interface for Firestore
// Stored as subcollection: businesses/{businessId}/questionnaires/{questionnaireId}
export interface Questionnaire {
  id: string;
  businessId: string;
  treeId: string; // Reference to decision tree
  name: string; // Questionnaire name/title
  shareableLink: string; // Unique shareable link (e.g., UUID or short code)
  isActive: boolean;
  createdAt: Date | FirebaseFirestore.Timestamp;
  updatedAt?: Date | FirebaseFirestore.Timestamp;
}

// Questionnaire document data (without id, for creating)
export interface QuestionnaireData {
  businessId: string;
  treeId: string;
  name: string;
  shareableLink: string;
  isActive: boolean;
  createdAt?: Date | FirebaseFirestore.Timestamp;
  updatedAt?: Date | FirebaseFirestore.Timestamp;
}

// Helper function to convert Firestore document to Questionnaire
export function questionnaireFromFirestore(
  doc: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>,
  businessId: string
): Questionnaire {
  const data = doc.data();
  if (!data) {
    throw new Error('Questionnaire document has no data');
  }
  return {
    id: doc.id,
    businessId,
    treeId: data.treeId,
    name: data.name || 'Unnamed Questionnaire',
    shareableLink: data.shareableLink,
    isActive: data.isActive !== false, // Default to true
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

