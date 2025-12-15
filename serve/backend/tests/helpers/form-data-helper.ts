// Helper for creating multipart form data in Node.js
import FormData from 'form-data';
import { getTestCSVBuffer, getTestDataPath } from './test-helpers';

export function createCSVUploadFormData(
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

