// Export routes
import express from 'express';
import * as exportController from '../controllers/exportController';

const router = express.Router();

/**
 * POST /api/analytics/export/preferences
 * Export customer preferences report (CSV)
 */
router.post('/preferences', exportController.exportPreferences);

/**
 * POST /api/analytics/export/recommendations
 * Export product recommendations report (CSV)
 */
router.post('/recommendations', exportController.exportRecommendations);

/**
 * POST /api/analytics/export/full-report
 * Export full analytics report (CSV for now, PDF can be added later)
 */
router.post('/full-report', exportController.exportFullReport);

/**
 * POST /api/analytics/export/raw-data
 * Export raw data (CSV)
 */
router.post('/raw-data', exportController.exportRawData);

export default router;

