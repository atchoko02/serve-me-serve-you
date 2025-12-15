// Service for aggregating customer response analytics
import * as responseService from './responseService';
import { getAnalyticsCollection } from '../config/firebase';
import type { Analytics, AnalyticsData, PopularChoice, ProductRecommendation } from '../models/Analytics';
import { analyticsFromFirestore } from '../models/Analytics';
import type { NavigationStep } from '../../../shared/types/questionnaire.types';

/**
 * Calculate analytics for a questionnaire
 */
export async function calculateQuestionnaireAnalytics(
  businessId: string,
  questionnaireId: string
): Promise<Analytics> {
  const responses = await responseService.getResponsesByQuestionnaire(businessId, questionnaireId);
  const completedResponses = responses.filter(r => r.completed);

  // Calculate basic statistics
  const totalResponses = responses.length;
  const completedCount = completedResponses.length;
  const completionRate = totalResponses > 0 ? completedCount / totalResponses : 0;

  // Calculate average duration
  const durations = completedResponses.map(r => r.duration).filter(d => d > 0);
  const averageDuration = durations.length > 0
    ? durations.reduce((sum, d) => sum + d, 0) / durations.length
    : 0;

  // Calculate popular choices
  const popularChoices = calculatePopularChoices(completedResponses);

  // Calculate recommended products
  const recommendedProducts = calculateRecommendedProducts(completedResponses);

  const analyticsData: AnalyticsData = {
    businessId,
    date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
    totalResponses,
    completedResponses: completedCount,
    completionRate,
    averageDuration,
    popularChoices,
    recommendedProducts,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Store analytics
  const analyticsRef = getAnalyticsCollection(businessId);
  const docRef = analyticsRef.doc(`questionnaire_${questionnaireId}`);
  await docRef.set(analyticsData, { merge: true });

  const doc = await docRef.get();
  if (!doc.exists) {
    throw new Error('Failed to create analytics');
  }

  return analyticsFromFirestore(doc, businessId);
}

/**
 * Calculate analytics for a business (across all questionnaires)
 */
export async function calculateBusinessAnalytics(
  businessId: string
): Promise<Analytics> {
  const responses = await responseService.getResponsesByBusiness(businessId);
  const completedResponses = responses.filter(r => r.completed);

  // Calculate basic statistics
  const totalResponses = responses.length;
  const completedCount = completedResponses.length;
  const completionRate = totalResponses > 0 ? completedCount / totalResponses : 0;

  // Calculate average duration
  const durations = completedResponses.map(r => r.duration).filter(d => d > 0);
  const averageDuration = durations.length > 0
    ? durations.reduce((sum, d) => sum + d, 0) / durations.length
    : 0;

  // Calculate popular choices
  const popularChoices = calculatePopularChoices(completedResponses);

  // Calculate recommended products
  const recommendedProducts = calculateRecommendedProducts(completedResponses);

  const analyticsData: AnalyticsData = {
    businessId,
    date: 'summary', // Use 'summary' for business-wide analytics
    totalResponses,
    completedResponses: completedCount,
    completionRate,
    averageDuration,
    popularChoices,
    recommendedProducts,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Store analytics
  const analyticsRef = getAnalyticsCollection(businessId);
  const docRef = analyticsRef.doc('summary');
  await docRef.set(analyticsData, { merge: true });

  const doc = await docRef.get();
  if (!doc.exists) {
    throw new Error('Failed to create analytics');
  }

  return analyticsFromFirestore(doc, businessId);
}

/**
 * Get analytics for a questionnaire
 */
export async function getQuestionnaireAnalytics(
  businessId: string,
  questionnaireId: string
): Promise<Analytics | null> {
  const analyticsRef = getAnalyticsCollection(businessId);
  const docRef = analyticsRef.doc(`questionnaire_${questionnaireId}`);
  const doc = await docRef.get();

  if (!doc.exists) {
    // Calculate if doesn't exist
    return await calculateQuestionnaireAnalytics(businessId, questionnaireId);
  }

  return analyticsFromFirestore(doc, businessId);
}

/**
 * Get analytics for a business
 */
export async function getBusinessAnalytics(
  businessId: string
): Promise<Analytics | null> {
  const analyticsRef = getAnalyticsCollection(businessId);
  const docRef = analyticsRef.doc('summary');
  const doc = await docRef.get();

  if (!doc.exists) {
    // Calculate if doesn't exist
    return await calculateBusinessAnalytics(businessId);
  }

  return analyticsFromFirestore(doc, businessId);
}

/**
 * Calculate popular choices from responses
 */
function calculatePopularChoices(responses: Array<{ answers: NavigationStep[] }>): PopularChoice[] {
  const choiceCounts = new Map<string, Map<string, number>>();

  responses.forEach((response) => {
    response.answers.forEach((step) => {
      if (!step.answer) return;
      const attribute =
        (step.question as any).feature ||
        step.question.featureNames?.[0] ||
        step.question.id;
      const choiceKey = step.answer.optionLabel || step.answer.choice;
      if (!attribute || !choiceKey) return;

      if (!choiceCounts.has(attribute)) {
        choiceCounts.set(attribute, new Map());
      }
      const attributeChoices = choiceCounts.get(attribute)!;
      attributeChoices.set(choiceKey, (attributeChoices.get(choiceKey) || 0) + 1);
    });
  });

  const popularChoices: PopularChoice[] = [];
  choiceCounts.forEach((choices, attribute) => {
    const total = Array.from(choices.values()).reduce((sum, val) => sum + val, 0);
    choices.forEach((count, choice) => {
      popularChoices.push({
        attribute,
        choice,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
      });
    });
  });

  return popularChoices.sort((a, b) => b.count - a.count);
}

/**
 * Calculate recommended products from responses
 */
function calculateRecommendedProducts(
  responses: Array<{ recommendedProductIds: string[] }>
): ProductRecommendation[] {
  const productCounts = new Map<string, number>();
  const productScores = new Map<string, number[]>();

  // Count recommendations and collect scores
  responses.forEach(response => {
    response.recommendedProductIds.forEach((productId, index) => {
      // Higher index = lower rank, so score = 1 / (index + 1)
      const score = 1 / (index + 1);
      
      productCounts.set(productId, (productCounts.get(productId) || 0) + 1);
      
      if (!productScores.has(productId)) {
        productScores.set(productId, []);
      }
      productScores.get(productId)!.push(score);
    });
  });

  // Convert to ProductRecommendation array
  const recommendations: ProductRecommendation[] = [];
  productCounts.forEach((count, productId) => {
    const scores = productScores.get(productId) || [];
    const averageScore = scores.length > 0
      ? scores.reduce((sum, s) => sum + s, 0) / scores.length
      : 0;

    recommendations.push({
      productId,
      recommendationCount: count,
      averageScore,
    });
  });

  // Sort by recommendation count descending
  return recommendations.sort((a, b) => b.recommendationCount - a.recommendationCount);
}

