// Helper for making API requests with axios (better FormData support)
import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';
import { getTestCSVBuffer } from './test-helpers';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5001';

// Create axios instance
export function createApiClient(): AxiosInstance {
  return axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
  });
}

// Create FormData for CSV upload
export function createCSVFormData(
  csvFilename: string,
  businessId: string,
  options?: {
    businessName?: string;
    businessEmail?: string;
  }
): FormData {
  const formData = new FormData();
  const csvBuffer = getTestCSVBuffer(csvFilename);
  
  formData.append('file', csvBuffer, {
    filename: csvFilename,
    contentType: 'text/csv',
  });
  formData.append('businessId', businessId);
  
  if (options?.businessName) {
    formData.append('businessName', options.businessName);
  }
  if (options?.businessEmail) {
    formData.append('businessEmail', options.businessEmail);
  }
  
  return formData;
}

// Upload CSV using axios
export async function uploadCSV(
  csvFilename: string,
  businessId: string,
  options?: {
    businessName?: string;
    businessEmail?: string;
  }
) {
  const client = createApiClient();
  const formData = createCSVFormData(csvFilename, businessId, options);
  
  return client.post('/api/csv/upload', formData, {
    headers: formData.getHeaders(),
  });
}

// Build tree using axios
export async function buildTree(businessId: string, options?: {
  maxDepth?: number;
  minLeafSize?: number;
}) {
  const client = createApiClient();
  return client.post('/api/csv/build-tree', {
    businessId,
    ...options,
  });
}

// Get products using axios
export async function getProducts(businessId: string) {
  const client = createApiClient();
  return client.get(`/api/csv/products/${businessId}`);
}

// Generate questionnaire using axios
export async function generateQuestionnaire(businessId: string, options?: {
  treeId?: string;
  name?: string;
}) {
  const client = createApiClient();
  return client.post('/api/questionnaires/generate', {
    businessId,
    ...options,
  });
}

// Get questionnaire by link using axios
export async function getQuestionnaireByLink(link: string) {
  const client = createApiClient();
  return client.get(`/api/questionnaires/${link}`);
}

// Get questionnaires by business using axios
export async function getQuestionnairesByBusiness(businessId: string) {
  const client = createApiClient();
  return client.get(`/api/questionnaires/business/${businessId}`);
}

