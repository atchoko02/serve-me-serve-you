// CSV upload and processing controller
import { AuthenticatedRequest } from '../middleware/auth';
import { Response } from 'express';
import { parseCSV } from '../utils/csvParser';
import { buildObliqueTreeFromCSV, type ProductVector } from '../utils/decisionTree';
import * as productService from '../services/productService';
import * as decisionTreeService from '../services/decisionTreeService';
import { profileAllAttributes } from '../utils/attributeProfiler';
import { buildQuestionTreeFromProducts } from '../utils/questionTree';

interface CSVUploadRequest extends AuthenticatedRequest {
  file?: Express.Multer.File;
  body: {
    businessId?: string;
    businessName?: string;
    businessEmail?: string;
    maxDepth?: string;
    minLeafSize?: string;
  };
}

/**
 * Upload and process CSV file
 * POST /api/csv/upload
 */
export async function uploadCSV(req: CSVUploadRequest, res: Response): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No CSV file provided' });
      return;
    }

    // Use businessId from auth token if available, otherwise fall back to body (for backward compatibility)
    const businessId = req.businessId || req.body.businessId;
    const { businessName, businessEmail, maxDepth, minLeafSize } = req.body;

    if (!businessId) {
      res.status(400).json({ error: 'businessId is required. Please log in or provide businessId in request body.' });
      return;
    }

    // Clear existing products for this business before uploading new ones
    // This prevents product accumulation across multiple CSV uploads
    try {
      await productService.deleteAllProducts(businessId);
    } catch (error) {
      console.warn('Error clearing existing products (may not exist yet):', error);
      // Continue even if deletion fails (e.g., no products exist yet)
    }

    // Get or create business
    const business = await productService.getOrCreateBusiness(
      businessId,
      {
        name: businessName || 'Unknown Business',
        email: businessEmail || `${businessId}@example.com`,
      }
    );

    // Parse CSV
    const csvText = req.file.buffer.toString('utf-8');
    const generator = parseCSV(csvText, { hasHeader: true });

    const validRows: any[] = [];
    const errors: any[] = [];
    let headers: string[] | undefined;

    for (const result of generator) {
      if ('error' in result) {
        errors.push(result.error);
      } else {
        if (result.headers && !headers) {
          headers = result.headers;
        }
        validRows.push(result.data);
      }
    }

    if (!headers || headers.length === 0) {
      res.status(400).json({ error: 'CSV file must have headers' });
      return;
    }

    if (validRows.length === 0) {
      res.status(400).json({ 
        error: 'No valid rows found in CSV',
        errors: errors.slice(0, 10) // Return first 10 errors
      });
      return;
    }

    // Convert rows to product format
    // Note: parseCSV returns data as an array (row), not as an object
    const products = validRows.map((row: string[] | any) => {
      // Handle both array format and object format
      const rowArray = Array.isArray(row) ? row : Object.values(row);
      const attributes: Record<string, string | number> = {};
      
      headers!.forEach((header, index) => {
        const value = rowArray[index];
        if (value !== undefined && value !== null && value !== '') {
          // Try to parse as number, otherwise keep as string
          const numValue = Number(value);
          attributes[header] = isNaN(numValue) || value === '' ? String(value) : numValue;
        }
      });
      
      return {
        originalRow: rowArray,
        attributes,
      };
    });

    // Store products in Firestore
    const storeResult = await productService.storeProducts(businessId, products);

    res.json({
      success: true,
      business: {
        id: business.id,
        name: business.name,
        email: business.email,
      },
      products: {
        total: validRows.length,
        stored: storeResult.success,
        errors: storeResult.errors,
      },
      csvErrors: {
        count: errors.length,
        samples: errors.slice(0, 10), // First 10 errors
      },
    });
  } catch (error) {
    console.error('Error processing CSV:', error);
    res.status(500).json({
      error: 'Failed to process CSV file',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Build decision tree from stored products
 * POST /api/csv/build-tree
 */
export async function buildTree(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    // Use businessId from auth token if available, otherwise fall back to body
    const businessId = req.businessId || req.body.businessId;
    const { maxDepth, minLeafSize } = req.body;

    if (!businessId) {
      res.status(400).json({ error: 'businessId is required. Please log in or provide businessId in request body.' });
      return;
    }

    // Get products from Firestore
    const products = await productService.getProductsByBusiness(businessId);

    if (products.length === 0) {
      res.status(404).json({ error: 'No products found for this business' });
      return;
    }

    // Convert products to CSV format for tree building
    // Extract all unique attribute keys
    const allKeys = new Set<string>();
    products.forEach(p => {
      Object.keys(p.attributes).forEach(key => allKeys.add(key));
    });

    const headers = Array.from(allKeys);
    const data: string[][] = [];

    // Build data array using all attributes (categorical + numeric)
    products.forEach(product => {
      const row = headers.map(header => {
        const value = product.attributes[header];
        return value !== undefined && value !== null ? String(value) : '';
      });
      data.push(row);
    });

    // Build decision tree (scoring/embedding)
    const startTime = Date.now();
    const tree = buildObliqueTreeFromCSV(
      { headers, data },
      {
        maxDepth: maxDepth ? parseInt(maxDepth, 10) : undefined,
        minLeafSize: minLeafSize ? parseInt(minLeafSize, 10) : undefined,
      }
    );
    const buildTimeMs = Date.now() - startTime;

    // Build interpretable question tree from raw product attributes
    const {
      questionTree,
      featureMetadata,
      headers: sourceHeaders,
    } = buildQuestionTreeFromProducts(products, {
      maxDepth: maxDepth ? parseInt(maxDepth, 10) : 4,
      minLeafSize: minLeafSize ? parseInt(minLeafSize, 10) : 3,
    });

    // Calculate metrics
    const metrics = decisionTreeService.calculateTreeMetrics(tree, buildTimeMs, questionTree);

    // Generate attribute profiles for adaptive question generation using raw values
    let attributeProfiles;
    try {
      const parseOneHot = (name: string) => {
        const parts = name.split('=');
        if (parts.length === 2) {
          return { base: parts[0], value: parts[1] };
        }
        return null;
      };

      const profilingProducts: ProductVector[] = products.map((product, idx) => {
        const values = tree.featureNames.map((name) => {
          const oneHot = parseOneHot(name);
          if (oneHot) {
            const cell = product.attributes[oneHot.base];
            if (cell === undefined || cell === null) return 0;
            return String(cell).trim() === oneHot.value ? 1 : 0;
          }
          const raw = product.attributes[name];
          const num = Number(raw);
          return !isNaN(num) ? num : 0;
        });
        const originalRow = tree.featureNames.map((name) => {
          const oneHot = parseOneHot(name);
          if (oneHot) {
            return String(product.attributes[oneHot.base] ?? '');
          }
          return String(product.attributes[name] ?? '');
        });
        return {
          id: (product as any).id || `product_${idx}`,
          values,
          rawValues: values,
          originalRow,
        };
      });

      if (profilingProducts.length > 0 && tree.featureNames.length > 0) {
        attributeProfiles = profileAllAttributes(tree.featureNames, profilingProducts);
      }
    } catch (error) {
      console.error('Error generating attribute profiles:', error);
      // Continue without profiles if profiling fails
      attributeProfiles = undefined;
    }

    // Store tree in Firestore with attribute profiles
    const storedTree = await decisionTreeService.storeDecisionTree(
      businessId,
      tree,
      metrics,
      products.length,
      attributeProfiles,
      questionTree,
      featureMetadata,
      sourceHeaders
    );

    res.json({
      success: true,
      tree: {
        id: storedTree.id,
        metrics: storedTree.metrics,
        productCount: storedTree.productCount,
        createdAt: storedTree.createdAt,
      },
    });
  } catch (error) {
    console.error('Error building decision tree:', error);
    res.status(500).json({
      error: 'Failed to build decision tree',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Get products for a business
 * GET /api/csv/products/:businessId
 */
/**
 * Get all decision trees for a business
 * GET /api/csv/trees/:businessId
 */
export async function getDecisionTrees(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    // Use businessId from auth token if available, otherwise fall back to params
    const businessId = req.businessId || (req as any).params?.businessId;

    if (!businessId) {
      res.status(400).json({ error: 'businessId is required' });
      return;
    }

    const trees = await decisionTreeService.getDecisionTreesByBusiness(businessId);
    
    // Limit results to avoid quota issues
    const limitedTrees = trees.slice(0, 50);

    res.json({
      success: true,
      trees: limitedTrees.map(tree => ({
        id: tree.id,
        businessId: tree.businessId,
        metrics: tree.metrics,
        productCount: tree.productCount,
        createdAt: tree.createdAt instanceof Date 
          ? tree.createdAt.toISOString() 
          : tree.createdAt.toDate().toISOString(),
        updatedAt: tree.updatedAt 
          ? (tree.updatedAt instanceof Date 
              ? tree.updatedAt.toISOString() 
              : tree.updatedAt.toDate().toISOString())
          : undefined,
      })),
    });
  } catch (error) {
    console.error('Error getting decision trees:', error);
    res.status(500).json({
      error: 'Failed to get decision trees',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Get a specific decision tree
 * GET /api/csv/trees/:businessId/:treeId
 */
export async function getDecisionTree(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    // Use businessId from auth token if available, otherwise fall back to params
    const businessId = req.businessId || (req as any).params?.businessId;
    const { treeId } = (req as any).params;

    if (!businessId) {
      res.status(400).json({ error: 'businessId is required' });
      return;
    }

    if (!treeId) {
      res.status(400).json({ error: 'treeId is required' });
      return;
    }

    const tree = await decisionTreeService.getDecisionTree(businessId, treeId);

    if (!tree) {
      res.status(404).json({ error: 'Decision tree not found' });
      return;
    }

    res.json({
      success: true,
      tree: {
        id: tree.id,
        businessId: tree.businessId,
        treeStructure: tree.treeStructure,
        questionTree: tree.questionTree,
        featureMetadata: tree.featureMetadata,
        headers: tree.headers,
        metrics: tree.metrics,
        createdAt: tree.createdAt instanceof Date 
          ? tree.createdAt.toISOString() 
          : tree.createdAt.toDate().toISOString(),
        updatedAt: tree.updatedAt 
          ? (tree.updatedAt instanceof Date 
              ? tree.updatedAt.toISOString() 
              : tree.updatedAt.toDate().toISOString())
          : undefined,
      },
    });
  } catch (error) {
    console.error('Error getting decision tree:', error);
    res.status(500).json({
      error: 'Failed to get decision tree',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

export async function getProducts(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    // Use businessId from auth token if available, otherwise fall back to params
    const businessId = req.businessId || (req as any).params?.businessId;

    if (!businessId) {
      res.status(400).json({ error: 'businessId is required' });
      return;
    }

    const products = await productService.getProductsByBusiness(businessId);

    res.json({
      success: true,
      count: products.length,
      products: products.map(p => ({
        id: p.id,
        attributes: p.attributes,
        createdAt: p.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      error: 'Failed to fetch products',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

