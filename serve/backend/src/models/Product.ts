// Product document interface for Firestore
// Stored as subcollection: businesses/{businessId}/products/{productId}
export interface Product {
  id: string;
  businessId: string;
  originalRow: string[]; // Original CSV row data
  attributes: Record<string, string | number>; // Parsed attributes (key-value pairs)
  createdAt: Date | FirebaseFirestore.Timestamp;
}

// Product document data (without id, for creating)
export interface ProductData {
  businessId: string;
  originalRow: string[];
  attributes: Record<string, string | number>;
  createdAt?: Date | FirebaseFirestore.Timestamp;
}

// Helper function to convert Firestore document to Product
export function productFromFirestore(
  doc: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>,
  businessId: string
): Product {
  const data = doc.data();
  if (!data) {
    throw new Error('Product document has no data');
  }
  return {
    id: doc.id,
    businessId,
    originalRow: data.originalRow || [],
    attributes: data.attributes || {},
    createdAt: data.createdAt,
  };
}

