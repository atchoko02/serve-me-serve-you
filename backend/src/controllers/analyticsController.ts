// Analytics controller
import { Request, Response } from 'express';
import * as analyticsService from '../services/analyticsService';

/**
 * Get analytics for a questionnaire
 * GET /api/analytics/questionnaire/:questionnaireId
 */
export async function getQuestionnaireAnalytics(req: Request, res: Response): Promise<void> {
  try {
    const { questionnaireId } = req.params;
    const { businessId } = req.query;

    if (!questionnaireId) {
      res.status(400).json({ error: 'questionnaireId is required' });
      return;
    }

    if (!businessId || typeof businessId !== 'string') {
      res.status(400).json({ error: 'businessId query parameter is required' });
      return;
    }

    const analytics = await analyticsService.getQuestionnaireAnalytics(businessId, questionnaireId);

    if (!analytics) {
      res.status(404).json({ error: 'Analytics not found' });
      return;
    }

    res.json({
      success: true,
      analytics,
    });
  } catch (error) {
    console.error('Error getting questionnaire analytics:', error);
    res.status(500).json({
      error: 'Failed to get analytics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Get analytics for a business
 * GET /api/analytics/business/:businessId
 */
export async function getBusinessAnalytics(req: Request, res: Response): Promise<void> {
  try {
    const { businessId } = req.params;

    if (!businessId) {
      res.status(400).json({ error: 'businessId is required' });
      return;
    }

    const analytics = await analyticsService.getBusinessAnalytics(businessId);

    if (!analytics) {
      res.status(404).json({ error: 'Analytics not found' });
      return;
    }

    res.json({
      success: true,
      analytics,
    });
  } catch (error) {
    console.error('Error getting business analytics:', error);
    res.status(500).json({
      error: 'Failed to get analytics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Recalculate analytics for a questionnaire
 * POST /api/analytics/questionnaire/:questionnaireId/recalculate
 */
export async function recalculateQuestionnaireAnalytics(req: Request, res: Response): Promise<void> {
  try {
    const { questionnaireId } = req.params;
    const { businessId } = req.body;

    if (!questionnaireId) {
      res.status(400).json({ error: 'questionnaireId is required' });
      return;
    }

    if (!businessId) {
      res.status(400).json({ error: 'businessId is required' });
      return;
    }

    const analytics = await analyticsService.calculateQuestionnaireAnalytics(businessId, questionnaireId);

    res.json({
      success: true,
      analytics,
    });
  } catch (error) {
    console.error('Error recalculating analytics:', error);
    res.status(500).json({
      error: 'Failed to recalculate analytics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Recalculate analytics for a business
 * POST /api/analytics/business/:businessId/recalculate
 */
export async function recalculateBusinessAnalytics(req: Request, res: Response): Promise<void> {
  try {
    const { businessId } = req.params;

    if (!businessId) {
      res.status(400).json({ error: 'businessId is required' });
      return;
    }

    const analytics = await analyticsService.calculateBusinessAnalytics(businessId);

    res.json({
      success: true,
      analytics,
    });
  } catch (error) {
    console.error('Error recalculating analytics:', error);
    res.status(500).json({
      error: 'Failed to recalculate analytics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

