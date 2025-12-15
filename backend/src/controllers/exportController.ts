// Export controller
import { Request, Response } from 'express';
import * as analyticsService from '../services/analyticsService';
import * as responseService from '../services/responseService';
import * as productService from '../services/productService';
import PDFDocument from 'pdfkit';

/**
 * Export customer preferences report
 * POST /api/analytics/export/preferences
 */
export async function exportPreferences(req: Request, res: Response): Promise<void> {
  try {
    const { businessId } = req.body;

    if (!businessId) {
      res.status(400).json({ error: 'businessId is required' });
      return;
    }

    // Get analytics (will calculate if doesn't exist)
    const analytics = await analyticsService.getBusinessAnalytics(businessId);

    if (!analytics) {
      res.status(404).json({ error: 'No analytics found' });
      return;
    }

    // Generate CSV
    const csvRows: string[] = [];
    csvRows.push('Attribute,Choice,Count,Percentage');
    
    analytics.popularChoices.forEach(choice => {
      csvRows.push(
        `"${choice.attribute}","${choice.choice}",${choice.count},${choice.percentage.toFixed(2)}`
      );
    });

    csvRows.push('');
    csvRows.push('Summary');
    csvRows.push(`Total Responses,${analytics.totalResponses}`);
    csvRows.push(`Completed Responses,${analytics.completedResponses}`);
    csvRows.push(`Completion Rate,${(analytics.completionRate * 100).toFixed(2)}%`);
    csvRows.push(`Average Duration (minutes),${(analytics.averageDuration / 60000).toFixed(2)}`);

    const csv = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="preferences-${businessId}-${Date.now()}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting preferences:', error);
    res.status(500).json({
      error: 'Failed to export preferences',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Export product recommendations report
 * POST /api/analytics/export/recommendations
 */
export async function exportRecommendations(req: Request, res: Response): Promise<void> {
  try {
    const { businessId } = req.body;

    if (!businessId) {
      res.status(400).json({ error: 'businessId is required' });
      return;
    }

    // Get analytics
    const analytics = await analyticsService.getBusinessAnalytics(businessId);

    if (!analytics) {
      res.status(404).json({ error: 'No analytics found' });
      return;
    }

    // Get products to include product names
    const products = await productService.getProductsByBusiness(businessId);
    const productMap = new Map(products.map(p => [p.id, p]));

    // Generate CSV
    const csvRows: string[] = [];
    csvRows.push('Product ID,Product Name,Recommendation Count,Average Score');
    
    analytics.recommendedProducts.forEach(rec => {
      const product = productMap.get(rec.productId);
      const productName = product 
        ? (product.attributes.name || product.attributes.productName || product.id)
        : rec.productId;
      
      csvRows.push(
        `"${rec.productId}","${productName}",${rec.recommendationCount},${rec.averageScore.toFixed(4)}`
      );
    });

    const csv = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="recommendations-${businessId}-${Date.now()}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting recommendations:', error);
    res.status(500).json({
      error: 'Failed to export recommendations',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Export full analytics report (PDF placeholder - returns CSV for now)
 * POST /api/analytics/export/full-report
 */
export async function exportFullReport(req: Request, res: Response): Promise<void> {
  let doc: any = null;
  
  try {
    const { businessId } = req.body;

    if (!businessId) {
      res.status(400).json({ error: 'businessId is required' });
      return;
    }

    const analytics = await analyticsService.getBusinessAnalytics(businessId);

    if (!analytics) {
      res.status(404).json({ error: 'No analytics found' });
      return;
    }

    // Create PDF document
    doc = new PDFDocument({
      margin: 50,
      size: 'A4',
      autoFirstPage: true
    });

    // Set response headers for PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="analytics-report-${businessId}-${Date.now()}.pdf"`);
    
    // Pipe PDF to response
    doc.pipe(res);
    
    // Add content to PDFgit 
    if (doc) {
      doc.fontSize(25).text('Analytics Report', { align: 'center' });
      doc.moveDown();
      
      doc.fontSize(12).text(`Business ID: ${businessId}`, { align: 'center' });
      doc.text(`Report Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
      doc.moveDown(2);
      
      // Summary section
      doc.fontSize(18).text('Summary Statistics', { underline: true });
      doc.moveDown(0.5);
      
      doc.fontSize(12);
      doc.text(`Total Responses: ${analytics.totalResponses}`);
      doc.text(`Completed Responses: ${analytics.completedResponses}`);
      doc.text(`Completion Rate: ${(analytics.completionRate * 100).toFixed(1)}%`);
      doc.text(`Average Duration: ${(analytics.averageDuration / 60000).toFixed(1)} minutes`);
      doc.moveDown();
      
      // Popular Choices section
      if (analytics.popularChoices.length > 0) {
        doc.fontSize(18).text('Popular Customer Preferences', { underline: true });
        doc.moveDown(0.5);
        
        doc.fontSize(12);
        analytics.popularChoices.slice(0, 15).forEach((choice, index) => {
          doc.text(`${index + 1}. ${choice.attribute}: "${choice.choice}" (${choice.count} votes, ${choice.percentage.toFixed(1)}%)`);
        });
        doc.moveDown();
      }
      
      // Recommended Products section
      if (analytics.recommendedProducts.length > 0) {
        doc.fontSize(18).text('Top Recommended Products', { underline: true });
        doc.moveDown(0.5);
        
        doc.fontSize(12);
        analytics.recommendedProducts.slice(0, 10).forEach((product, index) => {
          doc.text(`${index + 1}. Product ID: ${product.productId}`);
          doc.text(`   Recommendations: ${product.recommendationCount}, Average Score: ${product.averageScore.toFixed(2)}`);
          doc.moveDown(0.3);
        });
      }
      
      // End PDF
      doc.end();
    }
    
  } catch (error) {
    console.error('Error exporting full report:', error);
    
    // If we started the PDF, end it properly
    if (doc) {
      try {
        doc.end();
      } catch (e) {
        // Ignore ending errors
      }
    }
    
    // Only send JSON error if we haven't started streaming
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Failed to export full report',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    } else {
      // If headers were sent, we can't send JSON - just end
      res.end();
    }
  }
}

/**
 * Export raw data
 * POST /api/analytics/export/raw-data
 */
export async function exportRawData(req: Request, res: Response): Promise<void> {
  try {
    const { businessId } = req.body;

    if (!businessId) {
      res.status(400).json({ error: 'businessId is required' });
      return;
    }

    // Get all responses
    const responses = await responseService.getResponsesByBusiness(businessId);

    // Generate CSV
    const csvRows: string[] = [];
    csvRows.push('Response ID,Questionnaire ID,Session ID,Customer ID,Completed,Completed At,Duration (ms),Recommended Product IDs');
    
    responses.forEach(response => {
      const completedAt = response.completedAt instanceof Date
        ? response.completedAt.toISOString()
        : response.completedAt.toDate().toISOString();
      
      csvRows.push(
        `"${response.id}","${response.questionnaireId}","${response.sessionId}","${response.customerId || ''}",${response.completed},"${completedAt}",${response.duration},"${response.recommendedProductIds.join(';')}"`
      );
    });

    const csv = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="raw-data-${businessId}-${Date.now()}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting raw data:', error);
    res.status(500).json({
      error: 'Failed to export raw data',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

