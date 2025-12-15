// Customer controller
import { AuthenticatedRequest } from '../middleware/auth';
import { Response } from 'express';
import * as customerService from '../services/customerService';

/**
 * Get all recommendations for a customer
 * GET /api/customers/:customerId/recommendations
 */
export async function getCustomerRecommendations(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    // Use customerId from auth token if available, otherwise fall back to params (for backward compatibility)
    const customerId = req.customerId || req.params.customerId;

    if (!customerId) {
      res.status(400).json({ error: 'customerId is required. Please ensure you are authenticated or provide customerId in URL.' });
      return;
    }

    const recommendations = await customerService.getCustomerRecommendations(customerId);

    // Convert Firestore timestamps to ISO strings for JSON response
    const formattedRecommendations = recommendations.map(rec => ({
      ...rec,
      completedAt: rec.completedAt instanceof Date 
        ? rec.completedAt.toISOString() 
        : rec.completedAt.toDate().toISOString(),
    }));

    res.json({
      success: true,
      recommendations: formattedRecommendations,
    });
  } catch (error) {
    console.error('Error getting customer recommendations:', error);
    res.status(500).json({
      error: 'Failed to get customer recommendations',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Get recommendations for a customer from a specific business
 * GET /api/customers/:customerId/recommendations/:businessId
 */
export async function getCustomerRecommendationsByBusiness(req: Request, res: Response): Promise<void> {
  try {
    // Use customerId from auth token if available, otherwise fall back to params
    const customerId = (req as any).user?.uid || req.params.customerId;
    const { businessId } = req.params;

    if (!customerId) {
      res.status(400).json({ error: 'customerId is required' });
      return;
    }

    if (!businessId) {
      res.status(400).json({ error: 'businessId is required' });
      return;
    }

    const recommendations = await customerService.getCustomerRecommendationsByBusiness(customerId, businessId);

    // Convert Firestore timestamps to ISO strings for JSON response
    const formattedRecommendations = recommendations.map(rec => ({
      ...rec,
      completedAt: rec.completedAt instanceof Date 
        ? rec.completedAt.toISOString() 
        : rec.completedAt.toDate().toISOString(),
    }));

    res.json({
      success: true,
      recommendations: formattedRecommendations,
    });
  } catch (error) {
    console.error('Error getting customer recommendations by business:', error);
    res.status(500).json({
      error: 'Failed to get customer recommendations',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

