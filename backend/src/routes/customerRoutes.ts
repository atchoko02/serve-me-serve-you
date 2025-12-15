// Customer routes
import express from 'express';
import * as customerController from '../controllers/customerController';
import { verifyAuthToken } from '../middleware/auth';

const router = express.Router();

/**
 * GET /api/customers/:customerId/recommendations
 * Get all recommendations for a customer
 * 
 * Note: customerId in URL is optional if authenticated - will use auth token uid
 * Headers:
 * - Authorization: Bearer <firebase-auth-token> (optional but recommended)
 */
router.get('/:customerId/recommendations', verifyAuthToken, customerController.getCustomerRecommendations);

/**
 * GET /api/customers/:customerId/recommendations/:businessId
 * Get recommendations for a customer from a specific business
 */
router.get('/:customerId/recommendations/:businessId', customerController.getCustomerRecommendationsByBusiness);

export default router;

