// CSV API service
import apiClient from './client';

export interface CSVUploadResponse {
  success: boolean;
  business: {
    id: string;
    name: string;
    email: string;
  };
  products: {
    total: number;
    stored: number;
    errors: number;
  };
  csvErrors: {
    count: number;
    samples: any[];
  };
}

export interface ProductsResponse {
  success: boolean;
  count: number;
  products: Array<{
    id: string;
    attributes: Record<string, string | number>;
    createdAt: any;
  }>;
}

/**
 * Upload CSV file to backend
 */
export async function uploadCSV(
  file: File,
  businessId: string,
  options?: {
    businessName?: string;
    businessEmail?: string;
  }
): Promise<CSVUploadResponse> {
  // Use browser's native FormData
  const formData = new FormData();
  formData.append('file', file);
  formData.append('businessId', businessId);
  
  if (options?.businessName) {
    formData.append('businessName', options.businessName);
  }
  if (options?.businessEmail) {
    formData.append('businessEmail', options.businessEmail);
  }

  // Don't set Content-Type header - browser will set it automatically with boundary
  const response = await apiClient.post<CSVUploadResponse>('/api/csv/upload', formData);

  return response.data;
}

/**
 * Get all products for a business
 */
export async function getProductsByBusiness(businessId: string): Promise<ProductsResponse> {
  const response = await apiClient.get<ProductsResponse>(`/api/csv/products/${businessId}`);
  return response.data;
}

/**
 * @deprecated Use getProductsByBusiness instead
 */
export async function getProducts(businessId: string): Promise<ProductsResponse> {
  return getProductsByBusiness(businessId);
}

