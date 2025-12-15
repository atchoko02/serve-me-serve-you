// Authentication middleware for Express
import { Request, Response, NextFunction } from 'express';
import { admin } from '../config/firebase';

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
  };
  businessId?: string;
  customerId?: string;
}

/**
 * Middleware to verify Firebase Auth token and extract user info
 */
export async function verifyAuthToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // For backward compatibility, allow requests without auth token
      // In production, you might want to require auth for certain endpoints
      return next();
    }

    const token = authHeader.split('Bearer ')[1];
    
    // Verify the token
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Attach user info to request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
    };

    // For business endpoints, businessId = uid
    // For customer endpoints, customerId = uid
    req.businessId = decodedToken.uid;
    req.customerId = decodedToken.uid;

    next();
  } catch (error) {
    console.error('Error verifying auth token:', error);
    // For backward compatibility, continue without auth
    // In production, you might want to return 401 here
    next();
  }
}

/**
 * Middleware to require authentication (returns 401 if not authenticated)
 */
export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user || !req.user.uid) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  next();
}

/**
 * Middleware to require business authentication
 */
export function requireBusinessAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user || !req.businessId) {
    res.status(401).json({ error: 'Business authentication required' });
    return;
  }
  next();
}

