// API client base configuration
import axios, { AxiosInstance, AxiosError } from 'axios';
import { auth } from '../../config/firebase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

// Create axios instance with default configuration
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor (for adding auth tokens, etc.)
apiClient.interceptors.request.use(
  async (config) => {
    // Get auth token if user is authenticated
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        try {
          const token = await currentUser.getIdToken();
          config.headers.Authorization = `Bearer ${token}`;
        } catch (error) {
          console.error('Error getting auth token:', error);
          // Continue without token if there's an error
        }
      }
    } catch (error) {
      // If Firebase auth fails, continue without auth token
      console.warn('Could not get Firebase auth token:', error);
    }

    // If the data is FormData, remove Content-Type header to let browser set it with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor (for error handling)
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError) => {
    // Handle common errors
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const data = error.response.data as any;

      switch (status) {
        case 400:
          console.error('Bad Request:', data?.error || data?.message);
          break;
        case 401:
          console.error('Unauthorized');
          // Handle auth error
          break;
        case 404:
          console.error('Not Found:', data?.error || data?.message);
          break;
        case 500:
          console.error('Server Error:', data?.error || data?.message);
          break;
        default:
          console.error('API Error:', data?.error || data?.message || error.message);
      }
    } else if (error.request) {
      // Request made but no response received
      console.error('Network Error: No response from server');
    } else {
      // Something else happened
      console.error('Error:', error.message);
    }

    return Promise.reject(error);
  }
);

// Helper function to handle API errors
export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ error?: string; message?: string }>;
    if (axiosError.response?.data) {
      return axiosError.response.data.error || axiosError.response.data.message || 'An error occurred';
    }
    if (axiosError.request) {
      return 'Network error: Could not connect to server';
    }
  }
  return error instanceof Error ? error.message : 'An unknown error occurred';
}

export default apiClient;

