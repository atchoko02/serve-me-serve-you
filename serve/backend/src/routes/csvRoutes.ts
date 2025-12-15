// CSV upload routes
import express from 'express';
import multer from 'multer';
import * as csvController from '../controllers/csvController';
import { verifyAuthToken } from '../middleware/auth';

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || 
        file.mimetype === 'application/vnd.ms-excel' ||
        file.originalname.toLowerCase().endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

// Error handling middleware for multer
const handleMulterError = (
  err: Error,
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
      return;
    }
    res.status(400).json({ error: err.message });
    return;
  }
  if (err.message === 'Only CSV files are allowed') {
    res.status(400).json({ error: err.message });
    return;
  }
  next(err);
};

/**
 * POST /api/csv/upload
 * Upload and process CSV file
 * 
 * Body (multipart/form-data):
 * - file: CSV file
 * - businessId: string (optional if authenticated - will use auth token uid)
 * - businessName: string (optional)
 * - businessEmail: string (optional)
 * 
 * Headers:
 * - Authorization: Bearer <firebase-auth-token> (optional but recommended)
 */
router.post('/upload', verifyAuthToken, upload.single('file'), handleMulterError, csvController.uploadCSV);

/**
 * POST /api/csv/build-tree
 * Build decision tree from stored products
 * 
 * Body (JSON):
 * - businessId: string (optional if authenticated - will use auth token uid)
 * - maxDepth: number (optional)
 * - minLeafSize: number (optional)
 * 
 * Headers:
 * - Authorization: Bearer <firebase-auth-token> (optional but recommended)
 */
router.post('/build-tree', verifyAuthToken, csvController.buildTree);

/**
 * GET /api/csv/products/:businessId
 * Get all products for a business
 */
router.get('/products/:businessId', csvController.getProducts);

/**
 * GET /api/csv/trees/:businessId
 * Get all decision trees for a business
 */
router.get('/trees/:businessId', csvController.getDecisionTrees);

/**
 * GET /api/csv/trees/:businessId/:treeId
 * Get a specific decision tree
 */
router.get('/trees/:businessId/:treeId', csvController.getDecisionTree);

export default router;

