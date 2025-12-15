// Service for storing and retrieving customer responses
import { getResponsesCollection } from '../config/firebase';
import type { Response, ResponseData } from '../models/Response';
import { responseFromFirestore } from '../models/Response';

/**
 * Store a customer response
 */
export async function storeResponse(
  businessId: string,
  questionnaireId: string,
  responseData: Omit<ResponseData, 'questionnaireId'>
): Promise<Response> {
  const responsesRef = getResponsesCollection(businessId, questionnaireId);
  
  const data: ResponseData = {
    ...responseData,
    questionnaireId,
    completedAt: new Date(),
  };

  const docRef = await responsesRef.add(data);
  const doc = await docRef.get();

  if (!doc.exists) {
    throw new Error('Failed to create response');
  }

  return responseFromFirestore(doc, questionnaireId);
}

/**
 * Get all responses for a questionnaire
 */
export async function getResponsesByQuestionnaire(
  businessId: string,
  questionnaireId: string
): Promise<Response[]> {
  const responsesRef = getResponsesCollection(businessId, questionnaireId);
  const snapshot = await responsesRef.get();

  return snapshot.docs.map(doc => responseFromFirestore(doc, questionnaireId));
}

/**
 * Get responses by business (across all questionnaires)
 */
export async function getResponsesByBusiness(
  businessId: string
): Promise<Response[]> {
  // Get all questionnaires for this business
  const { getQuestionnairesCollection } = await import('../config/firebase');
  const questionnairesRef = getQuestionnairesCollection(businessId);
  const questionnairesSnapshot = await questionnairesRef.get();

  const allResponses: Response[] = [];

  for (const questionnaireDoc of questionnairesSnapshot.docs) {
    const questionnaireId = questionnaireDoc.id;
    const responses = await getResponsesByQuestionnaire(businessId, questionnaireId);
    allResponses.push(...responses);
  }

  return allResponses;
}

/**
 * Get completed responses only
 */
export async function getCompletedResponses(
  businessId: string,
  questionnaireId: string
): Promise<Response[]> {
  const responses = await getResponsesByQuestionnaire(businessId, questionnaireId);
  return responses.filter(r => r.completed);
}

