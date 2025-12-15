// Customer API service
import apiClient from './client';

export interface Recommendation {
  id: string;
  businessId: string;
  businessName: string;
  questionnaireId: string;
  recommendedProductIds: string[];
  completedAt: string;
  duration: number;
}

export interface CustomerRecommendationsResponse {
  success: boolean;
  recommendations: Recommendation[];
}

/**
 * Get all recommendations for a customer
 */
export async function getCustomerRecommendations(
  customerId: string
): Promise<CustomerRecommendationsResponse> {
  const response = await apiClient.get<CustomerRecommendationsResponse>(
    `/api/customers/${customerId}/recommendations`
  );
  return response.data;
}

/**
 * Get recommendations for a customer from a specific business
 */
export async function getCustomerRecommendationsByBusiness(
  customerId: string,
  businessId: string
): Promise<CustomerRecommendationsResponse> {
  const response = await apiClient.get<CustomerRecommendationsResponse>(
    `/api/customers/${customerId}/recommendations/${businessId}`
  );
  return response.data;
}

