// Analytics routes
import express from 'express';
import * as analyticsController from '../controllers/analyticsController';

const router = express.Router();

/**
 * GET /api/analytics/questionnaire/:questionnaireId
 * Get analytics for a specific questionnaire
 * Query params: businessId (required)
 */
router.get('/questionnaire/:questionnaireId', analyticsController.getQuestionnaireAnalytics);

/**
 * GET /api/analytics/business/:businessId
 * Get analytics for a business (across all questionnaires)
 */
router.get('/business/:businessId', analyticsController.getBusinessAnalytics);

/**
 * POST /api/analytics/questionnaire/:questionnaireId/recalculate
 * Recalculate analytics for a questionnaire
 * Body: { businessId: string }
 */
router.post('/questionnaire/:questionnaireId/recalculate', analyticsController.recalculateQuestionnaireAnalytics);

/**
 * POST /api/analytics/business/:businessId/recalculate
 * Recalculate analytics for a business
 */
router.post('/business/:businessId/recalculate', analyticsController.recalculateBusinessAnalytics);

export default router;

