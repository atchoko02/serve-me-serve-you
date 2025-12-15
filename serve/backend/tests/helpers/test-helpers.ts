// Test helpers for API endpoint testing
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get path to test data directory
export function getTestDataPath(filename: string): string {
  return join(__dirname, '../../../test-data', filename);
}

// Load test CSV file
export function loadTestCSV(filename: string): string {
  const path = getTestDataPath(filename);
  return readFileSync(path, 'utf-8');
}

// Get test CSV as buffer for multipart uploads
export function getTestCSVBuffer(filename: string): Buffer {
  const path = getTestDataPath(filename);
  return readFileSync(path);
}

// Generate unique test business ID
export function generateTestBusinessId(): string {
  return `test-business-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Wait for async operations
export async function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Note: FormData creation is done inline in tests using Playwright's request API
// This helper is kept for reference but FormData should be created in test context

// Test business data
export const TEST_BUSINESS = {
  id: 'test-business-1',
  name: 'Test Business',
  email: 'test@example.com',
};

// Sample CSV content for testing
export const SAMPLE_CSV = `id,name,price,rating,stock
1,Product A,10.99,4.5,100
2,Product B,15.99,4.2,50
3,Product C,8.99,4.8,200
4,Product D,20.99,4.0,75
5,Product E,12.99,4.6,150`;

export const SAMPLE_CSV_NO_HEADERS = `1,Product A,10.99,4.5,100
2,Product B,15.99,4.2,50`;

export const SAMPLE_CSV_INVALID = `id,name,price
1,Product A,10.99
2,Product B,15.99,extra,columns`;

