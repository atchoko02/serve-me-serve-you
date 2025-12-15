// Response API service
import apiClient from './client';

export interface StoreResponseRequest {
  businessId: string;
  questionnaireId: string;
  navigationPath: any[]; // NavigationStep[]
  recommendedProductIds: string[];
  duration: number;
  sessionId: string;
  customerId?: string; // Optional customerId for linking recommendations
}

export interface StoreResponseResponse {
  success: boolean;
  response: {
    id: string;
    sessionId: string;
    completedAt: any;
  };
}

/**
 * Store a customer response
 */
export async function storeResponse(
  data: StoreResponseRequest
): Promise<StoreResponseResponse> {
  const response = await apiClient.post<StoreResponseResponse>('/api/responses', data);
  return response.data;
}

