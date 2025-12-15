// Analytics API service
import apiClient from './client';

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

export interface Analytics {
  id: string;
  businessId: string;
  date: string;
  totalResponses: number;
  completedResponses: number;
  completionRate: number;
  averageDuration: number;
  popularChoices: PopularChoice[];
  recommendedProducts: ProductRecommendation[];
  createdAt: any;
  updatedAt?: any;
}

export interface AnalyticsResponse {
  success: boolean;
  analytics: Analytics;
}

/**
 * Get analytics for a questionnaire
 */
export async function getQuestionnaireAnalytics(
  businessId: string,
  questionnaireId: string
): Promise<AnalyticsResponse> {
  const response = await apiClient.get<AnalyticsResponse>(
    `/api/analytics/questionnaire/${questionnaireId}?businessId=${encodeURIComponent(businessId)}`
  );
  return response.data;
}

/**
 * Get analytics for a business
 */
export async function getBusinessAnalytics(
  businessId: string
): Promise<AnalyticsResponse> {
  const response = await apiClient.get<AnalyticsResponse>(
    `/api/analytics/business/${businessId}`
  );
  return response.data;
}

/**
 * Recalculate analytics for a questionnaire
 */
export async function recalculateQuestionnaireAnalytics(
  businessId: string,
  questionnaireId: string
): Promise<AnalyticsResponse> {
  const response = await apiClient.post<AnalyticsResponse>(
    `/api/analytics/questionnaire/${questionnaireId}/recalculate`,
    { businessId }
  );
  return response.data;
}

/**
 * Recalculate analytics for a business
 */
export async function recalculateBusinessAnalytics(
  businessId: string
): Promise<AnalyticsResponse> {
  const response = await apiClient.post<AnalyticsResponse>(
    `/api/analytics/business/${businessId}/recalculate`
  );
  return response.data;
}

