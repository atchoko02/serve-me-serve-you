// Response controller
import { AuthenticatedRequest } from '../middleware/auth';
import { Response } from 'express';
import * as responseService from '../services/responseService';
import * as analyticsService from '../services/analyticsService';
import { v4 as uuidv4 } from 'uuid';

/**
 * Store a customer response
 * POST /api/responses
 */
export async function storeResponse(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    // Use customerId from auth token if available, otherwise fall back to body
    const customerId = req.customerId || req.body.customerId;
    const { businessId, questionnaireId, navigationPath, recommendedProductIds, duration } = req.body;

    if (!businessId) {
      res.status(400).json({ error: 'businessId is required' });
      return;
    }

    if (!questionnaireId) {
      res.status(400).json({ error: 'questionnaireId is required' });
      return;
    }

    if (!navigationPath || !Array.isArray(navigationPath)) {
      res.status(400).json({ error: 'navigationPath is required and must be an array' });
      return;
    }

    // Generate session ID if not provided
    const sessionId = req.body.sessionId || uuidv4();

    const response = await responseService.storeResponse(
      businessId,
      questionnaireId,
      {
        sessionId,
        customerId: customerId || undefined, // Use auth token customerId if available
        answers: navigationPath,
        recommendedProductIds: recommendedProductIds || [],
        duration: duration || 0,
        completed: true, // If we're storing, it's completed
      }
    );

    res.json({
      success: true,
      response: {
        id: response.id,
        sessionId: response.sessionId,
        completedAt: response.completedAt,
      },
    });

    // Recalculate analytics (non-blocking but awaited to ensure consistency)
    try {
      await analyticsService.calculateQuestionnaireAnalytics(businessId, questionnaireId);
      await analyticsService.calculateBusinessAnalytics(businessId);
    } catch (analyticsError) {
      console.error('Failed to update analytics after response:', analyticsError);
    }
  } catch (error) {
    console.error('Error storing response:', error);
    res.status(500).json({
      error: 'Failed to store response',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

