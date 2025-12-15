// Response routes
import express from 'express';
import * as responseController from '../controllers/responseController';
import { verifyAuthToken, requireAuth } from '../middleware/auth';

const router = express.Router();

/**
 * POST /api/responses
 * Store a customer response
 * Body: { businessId, questionnaireId, navigationPath, recommendedProductIds, duration, sessionId? }
 * Note: customerId will be extracted from auth token if authenticated
 * Headers:
 * - Authorization: Bearer <firebase-auth-token> (optional but recommended)
 */
router.post('/', verifyAuthToken, requireAuth, responseController.storeResponse);

export default router;

