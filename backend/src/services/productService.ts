// Product service for Firestore operations
import { 
  getProductsCollection,
  getBusinessCollection 
} from '../config/firebase';
import type { Product, ProductData } from '../models/Product';
import { productFromFirestore } from '../models/Product';
import type { Business } from '../models/Business';

/**
 * Create or get a business
 */
export async function getOrCreateBusiness(
  businessId: string,
  businessData: { name: string; email: string }
): Promise<Business> {
  const businessRef = getBusinessCollection().doc(businessId);
  const businessDoc = await businessRef.get();

  if (businessDoc.exists) {
    return {
      id: businessDoc.id,
      name: businessDoc.data()!.name,
      email: businessDoc.data()!.email,
      createdAt: businessDoc.data()!.createdAt,
      updatedAt: businessDoc.data()!.updatedAt,
    };
  }

  // Create new business
  const now = new Date();
  await businessRef.set({
    name: businessData.name,
    email: businessData.email,
    createdAt: now,
    updatedAt: now,
  });

  return {
    id: businessId,
    ...businessData,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Store products from CSV data
 */
export async function storeProducts(
  businessId: string,
  products: Array<{ originalRow: string[]; attributes: Record<string, string | number> }>
): Promise<{ success: number; errors: number }> {
  const productsRef = getProductsCollection(businessId);
  const batch = productsRef.firestore.batch();
  let successCount = 0;
  let errorCount = 0;

  for (const product of products) {
    try {
      const productData: ProductData = {
        businessId,
        originalRow: product.originalRow,
        attributes: product.attributes,
        createdAt: new Date(),
      };

      // Use a unique ID based on product attributes or generate one
      // Check for common ID field names
      const idValue = product.attributes.id || 
                      product.attributes.productId ||
                      product.attributes.ID ||
                      product.attributes.ProductID;
      
      const productId = idValue?.toString() || 
                       `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const productRef = productsRef.doc(productId);
      batch.set(productRef, productData);
      successCount++;
    } catch (error) {
      console.error('Error preparing product for batch:', error);
      errorCount++;
    }
  }

  try {
    await batch.commit();
    return { success: successCount, errors: errorCount };
  } catch (error) {
    console.error('Error committing products batch:', error);
    throw new Error(`Failed to store products: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get all products for a business
 */
export async function getProductsByBusiness(businessId: string): Promise<Product[]> {
  const productsRef = getProductsCollection(businessId);
  // Limit to 1000 products to avoid quota exhaustion (most businesses won't have more)
  const snapshot = await productsRef.limit(1000).get();

  if (snapshot.empty) {
    return [];
  }

  return snapshot.docs.map(doc => productFromFirestore(doc, businessId));
}

/**
 * Get a single product
 */
export async function getProduct(businessId: string, productId: string): Promise<Product | null> {
  const productRef = getProductsCollection(businessId).doc(productId);
  const doc = await productRef.get();

  if (!doc.exists) {
    return null;
  }

  return productFromFirestore(doc, businessId);
}

/**
 * Delete all products for a business (useful for re-upload)
 */
export async function deleteAllProducts(businessId: string): Promise<void> {
  const productsRef = getProductsCollection(businessId);
  const snapshot = await productsRef.get();

  const batch = productsRef.firestore.batch();
  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });

  await batch.commit();
}

