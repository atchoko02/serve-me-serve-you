// Export API service
import apiClient from './client';

export type ExportType = 'preferences' | 'recommendations' | 'full-report' | 'raw-data';

/**
 * Export analytics data
 */
export async function exportAnalytics(
  businessId: string,
  type: ExportType
): Promise<Blob> {
  const response = await apiClient.post(
    `/api/analytics/export/${type}`,
    { businessId },
    {
      responseType: 'blob', // Important for file downloads
    }
  );
  return response.data;
}

