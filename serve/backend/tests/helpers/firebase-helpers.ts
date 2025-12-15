// Firebase test helpers
import { getBusinessCollection, getProductsCollection, getDecisionTreesCollection, getQuestionnairesCollection } from '../../src/config/firebase';

/**
 * Clean up all test data for a business
 */
export async function cleanupTestBusiness(businessId: string): Promise<void> {
  try {
    // Delete subcollections first
    const productsRef = getProductsCollection(businessId);
    const productsSnapshot = await productsRef.get();
    const productsBatch = productsRef.firestore.batch();
    productsSnapshot.docs.forEach(doc => productsBatch.delete(doc.ref));
    await productsBatch.commit();

    const treesRef = getDecisionTreesCollection(businessId);
    const treesSnapshot = await treesRef.get();
    const treesBatch = treesRef.firestore.batch();
    treesSnapshot.docs.forEach(doc => treesBatch.delete(doc.ref));
    await treesBatch.commit();

    const questionnairesRef = getQuestionnairesCollection(businessId);
    const questionnairesSnapshot = await questionnairesRef.get();
    const questionnairesBatch = questionnairesRef.firestore.batch();
    questionnairesSnapshot.docs.forEach(doc => questionnairesBatch.delete(doc.ref));
    await questionnairesBatch.commit();

    // Delete business document
    const businessRef = getBusinessCollection().doc(businessId);
    await businessRef.delete();
  } catch (error) {
    console.warn(`Error cleaning up test business ${businessId}:`, error);
  }
}

/**
 * Clean up multiple test businesses
 */
export async function cleanupTestBusinesses(businessIds: string[]): Promise<void> {
  await Promise.all(businessIds.map(id => cleanupTestBusiness(id)));
}

/**
 * Wait for Firestore write to complete
 */
export async function waitForFirestoreWrite(ms: number = 500): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

