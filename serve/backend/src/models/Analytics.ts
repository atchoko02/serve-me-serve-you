// Analytics document interface for Firestore
// Stored as subcollection: businesses/{businessId}/analytics/{date}
export interface Analytics {
  id: string; // Date string (YYYY-MM-DD) or 'summary'
  businessId: string;
  date: string; // ISO date string
  totalResponses: number;
  completedResponses: number;
  completionRate: number; // completedResponses / totalResponses
  averageDuration: number; // Average duration in milliseconds
  popularChoices: PopularChoice[]; // Most popular attribute choices
  recommendedProducts: ProductRecommendation[]; // Most recommended products
  createdAt: Date | FirebaseFirestore.Timestamp;
  updatedAt?: Date | FirebaseFirestore.Timestamp;
}

export interface PopularChoice {
  attribute: string;
  choice: string;
  count: number;
  percentage: number;
}

export interface ProductRecommendation {
  productId: string;
  recommendationCount: number;
  averageScore: number;
}

// Analytics document data (without id, for creating/updating)
export interface AnalyticsData {
  businessId: string;
  date: string;
  totalResponses: number;
  completedResponses: number;
  completionRate: number;
  averageDuration: number;
  popularChoices: PopularChoice[];
  recommendedProducts: ProductRecommendation[];
  createdAt?: Date | FirebaseFirestore.Timestamp;
  updatedAt?: Date | FirebaseFirestore.Timestamp;
}

// Helper function to convert Firestore document to Analytics
export function analyticsFromFirestore(
  doc: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>,
  businessId: string
): Analytics {
  const data = doc.data();
  if (!data) {
    throw new Error('Analytics document has no data');
  }
  return {
    id: doc.id,
    businessId,
    date: data.date,
    totalResponses: data.totalResponses || 0,
    completedResponses: data.completedResponses || 0,
    completionRate: data.completionRate || 0,
    averageDuration: data.averageDuration || 0,
    popularChoices: data.popularChoices || [],
    recommendedProducts: data.recommendedProducts || [],
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

