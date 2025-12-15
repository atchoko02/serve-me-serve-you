// Questionnaire routes
import express from 'express';
import * as questionnaireController from '../controllers/questionnaireController';
import { verifyAuthToken } from '../middleware/auth';

const router = express.Router();

/**
 * POST /api/questionnaires/generate
 * Generate a questionnaire from a decision tree
 * 
 * Body (JSON):
 * - businessId: string (optional if authenticated - will use auth token uid)
 * - treeId: string (optional, uses latest if not provided)
 * - name: string (optional)
 * 
 * Headers:
 * - Authorization: Bearer <firebase-auth-token> (optional but recommended)
 */
router.post('/generate', verifyAuthToken, questionnaireController.generateQuestionnaire);

/**
 * GET /api/questionnaires/:link
 * Get questionnaire by shareable link
 */
router.get('/:link', questionnaireController.getQuestionnaireByLink);

/**
 * GET /api/questionnaires/business/:businessId
 * Get all questionnaires for a business
 */
router.get('/business/:businessId', questionnaireController.getQuestionnairesByBusiness);

export default router;

