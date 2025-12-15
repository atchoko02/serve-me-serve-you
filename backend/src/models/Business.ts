// Business document interface for Firestore
export interface Business {
  id: string;
  name: string;
  email: string;
  createdAt: Date | FirebaseFirestore.Timestamp;
  updatedAt: Date | FirebaseFirestore.Timestamp;
}

// Business document data (without id, for creating/updating)
export interface BusinessData {
  name: string;
  email: string;
  createdAt?: Date | FirebaseFirestore.Timestamp;
  updatedAt?: Date | FirebaseFirestore.Timestamp;
}

// Helper function to convert Firestore document to Business
export function businessFromFirestore(
  doc: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>
): Business {
  const data = doc.data();
  if (!data) {
    throw new Error('Business document has no data');
  }
  return {
    id: doc.id,
    name: data.name,
    email: data.email,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

