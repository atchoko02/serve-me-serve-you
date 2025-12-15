import FormData from 'form-data';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const csvBuffer = readFileSync(join(__dirname, '../../test-data/test-small.csv'));
const formData = new FormData();
formData.append('file', csvBuffer, {
  filename: 'test-small.csv',
  contentType: 'text/csv',
});
formData.append('businessId', 'test-123');

console.log('FormData headers:', formData.getHeaders());
console.log('FormData has boundary:', formData.getHeaders()['content-type'].includes('boundary'));
