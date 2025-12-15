// Service for customer-related operations
import { getResponsesCollection } from '../config/firebase';
import { responseFromFirestore } from '../models/Response';
import type { Response } from '../models/Response';
import { getQuestionnairesCollection, getBusinessCollection } from '../config/firebase';

/**
 * Get all recommendations for a customer
 */
export async function getCustomerRecommendations(
  customerId: string
): Promise<Array<{
  id: string;
  businessId: string;
  businessName: string;
  questionnaireId: string;
  recommendedProductIds: string[];
  completedAt: Date | FirebaseFirestore.Timestamp;
  duration: number;
}>> {
  // OPTIMIZED: Use collection group query instead of nested loops
  // This reduces quota usage from O(businesses × questionnaires × responses) to O(1 query)
  // However, collection groups require a composite index, so we'll use a hybrid approach
  
  const { db } = await import('../config/firebase');
  const allRecommendations: Array<{
    id: string;
    businessId: string;
    businessName: string;
    questionnaireId: string;
    recommendedProductIds: string[];
    completedAt: Date | FirebaseFirestore.Timestamp;
    duration: number;
  }> = [];

  try {
    // Try collection group query first (most efficient, but requires index)
    // Query all 'responses' subcollections across all businesses
    const responsesSnapshot = await db.collectionGroup('responses')
      .where('customerId', '==', customerId)
      .where('completed', '==', true)
      .orderBy('completedAt', 'desc')
      .limit(50) // Limit total results to avoid quota
      .get();

    // Extract businessId and questionnaireId from document path
    // Path format: businesses/{businessId}/questionnaires/{questionnaireId}/responses/{responseId}
    const businessIds = new Set<string>();
    const businessQuestionnaireMap = new Map<string, Set<string>>();

    for (const responseDoc of responsesSnapshot.docs) {
      const pathParts = responseDoc.ref.path.split('/');
      const businessId = pathParts[1];
      const questionnaireId = pathParts[3];
      
      businessIds.add(businessId);
      if (!businessQuestionnaireMap.has(businessId)) {
        businessQuestionnaireMap.set(businessId, new Set());
      }
      businessQuestionnaireMap.get(businessId)!.add(questionnaireId);
    }

    // Fetch business names in batch
    const businessNames = new Map<string, string>();
    if (businessIds.size > 0) {
      const businessesRef = getBusinessCollection();
      const businessDocs = await Promise.all(
        Array.from(businessIds).slice(0, 10).map(id => businessesRef.doc(id).get())
      );
      
      for (const doc of businessDocs) {
        if (doc.exists) {
          businessNames.set(doc.id, doc.data()?.name || 'Unknown Business');
        }
      }
    }

    // Build recommendations from responses
    for (const responseDoc of responsesSnapshot.docs) {
      const pathParts = responseDoc.ref.path.split('/');
      const businessId = pathParts[1];
      const questionnaireId = pathParts[3];
      const businessName = businessNames.get(businessId) || 'Unknown Business';
      
      const response = responseFromFirestore(responseDoc, questionnaireId);
      allRecommendations.push({
        id: response.id,
        businessId,
        businessName,
        questionnaireId,
        recommendedProductIds: response.recommendedProductIds,
        completedAt: response.completedAt,
        duration: response.duration,
      });
    }

    // Sort by completedAt descending (most recent first)
    return allRecommendations.sort((a, b) => {
      const aTime = a.completedAt instanceof Date ? a.completedAt.getTime() : a.completedAt.toMillis();
      const bTime = b.completedAt instanceof Date ? b.completedAt.getTime() : b.completedAt.toMillis();
      return bTime - aTime;
    });
  } catch (error: any) {
    // Fallback to nested query if collection group query fails (e.g., missing index)
    if (error.code === 9 || error.message?.includes('index')) {
      console.warn('Collection group index not found, falling back to nested queries');
      
      // Fallback: Use the optimized nested approach with limits
      const businessesRef = getBusinessCollection();
      const businessesSnapshot = await businessesRef.limit(10).get();
      const businessDocs = businessesSnapshot.docs;
      
      for (const businessDoc of businessDocs) {
        const businessId = businessDoc.id;
        const businessData = businessDoc.data();
        const businessName = businessData.name || 'Unknown Business';

        try {
          const questionnairesRef = getQuestionnairesCollection(businessId);
          const questionnairesSnapshot = await questionnairesRef.limit(10).get();

          for (const questionnaireDoc of questionnairesSnapshot.docs) {
            const questionnaireId = questionnaireDoc.id;
            
            try {
              const responsesRef = getResponsesCollection(businessId, questionnaireId);
              const responsesSnapshot = await responsesRef
                .where('customerId', '==', customerId)
                .where('completed', '==', true)
                .limit(20)
                .get();

              for (const responseDoc of responsesSnapshot.docs) {
                const response = responseFromFirestore(responseDoc, questionnaireId);
                allRecommendations.push({
                  id: response.id,
                  businessId,
                  businessName,
                  questionnaireId,
                  recommendedProductIds: response.recommendedProductIds,
                  completedAt: response.completedAt,
                  duration: response.duration,
                });
              }
            } catch (err) {
              console.error(`Error loading responses for questionnaire ${questionnaireId}:`, err);
            }
          }
        } catch (err) {
          console.error(`Error loading questionnaires for business ${businessId}:`, err);
        }
      }

      return allRecommendations.sort((a, b) => {
        const aTime = a.completedAt instanceof Date ? a.completedAt.getTime() : a.completedAt.toMillis();
        const bTime = b.completedAt instanceof Date ? b.completedAt.getTime() : b.completedAt.toMillis();
        return bTime - aTime;
      });
    }
    
    throw error;
  }
}

/**
 * Get recommendations for a customer from a specific business
 */
export async function getCustomerRecommendationsByBusiness(
  customerId: string,
  businessId: string
): Promise<Array<{
  id: string;
  businessId: string;
  businessName: string;
  questionnaireId: string;
  recommendedProductIds: string[];
  completedAt: Date | FirebaseFirestore.Timestamp;
  duration: number;
}>> {
  // Get business name
  const businessDoc = await getBusinessCollection().doc(businessId).get();
  const businessName = businessDoc.data()?.name || 'Unknown Business';

  // Get all questionnaires for this business (limit to avoid quota)
  const questionnairesRef = getQuestionnairesCollection(businessId);
  const questionnairesSnapshot = await questionnairesRef.limit(50).get();

  const recommendations: Array<{
    id: string;
    businessId: string;
    businessName: string;
    questionnaireId: string;
    recommendedProductIds: string[];
    completedAt: Date | FirebaseFirestore.Timestamp;
    duration: number;
  }> = [];

  for (const questionnaireDoc of questionnairesSnapshot.docs) {
    const questionnaireId = questionnaireDoc.id;
    
    // Get responses for this questionnaire (limit to avoid quota)
    const responsesRef = getResponsesCollection(businessId, questionnaireId);
    const responsesSnapshot = await responsesRef
      .where('customerId', '==', customerId)
      .where('completed', '==', true)
      .limit(50)
      .get();

    // Convert responses to recommendations
    for (const responseDoc of responsesSnapshot.docs) {
      const response = responseFromFirestore(responseDoc, questionnaireId);
      recommendations.push({
        id: response.id,
        businessId,
        businessName,
        questionnaireId,
        recommendedProductIds: response.recommendedProductIds,
        completedAt: response.completedAt,
        duration: response.duration,
      });
    }
  }

  // Sort by completedAt descending (most recent first)
  return recommendations.sort((a, b) => {
    const aTime = a.completedAt instanceof Date ? a.completedAt.getTime() : a.completedAt.toMillis();
    const bTime = b.completedAt instanceof Date ? b.completedAt.getTime() : b.completedAt.toMillis();
    return bTime - aTime;
  });
}

