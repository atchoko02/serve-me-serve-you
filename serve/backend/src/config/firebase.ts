// Firebase Admin SDK configuration
import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Firebase Admin SDK
// IMPORTANT: Check for emulator FIRST to prevent connecting to production
// Option 1: Using Firebase Emulator (for local development)
// Check if emulator is explicitly enabled OR if we're in development mode
const useEmulator = process.env.FIREBASE_USE_EMULATOR === 'true' || 
                    (process.env.NODE_ENV !== 'production' && !process.env.FIREBASE_PROJECT_ID);

if (useEmulator) {
  try {
    // IMPORTANT: Set emulator host BEFORE initializing Firebase
    process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'demo-project',
    });
    console.log('✅ Firebase Admin SDK initialized for EMULATOR (localhost:8080)');
    console.log('   Using emulator - no production quota will be used');
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK for emulator:', error);
    throw error;
  }
}
// Option 2: Using service account (for production)
else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });
    console.log('⚠️  Firebase Admin SDK initialized with PRODUCTION service account');
    console.log('   WARNING: This will use your production Firebase quota!');
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
    throw error;
  }
}
// Option 3: Try to use default credentials (for Google Cloud environments)
else {
  try {
    admin.initializeApp();
    console.log('Firebase Admin SDK initialized with default credentials');
  } catch (error) {
    console.warn('Firebase Admin SDK not initialized. Set environment variables or use emulator.');
    console.warn('For local development, set FIREBASE_USE_EMULATOR=true or ensure NODE_ENV is not "production"');
  }
}

// Export Firestore instance
export const db = admin.firestore();

// Export Firebase Admin for other uses (Auth, Storage, etc.)
export { admin };

// Helper function to get Firestore collection references
export const getBusinessCollection = () => db.collection('businesses');
export const getSessionsCollection = () => db.collection('sessions');

// Helper functions for subcollections
export const getProductsCollection = (businessId: string) =>
  getBusinessCollection().doc(businessId).collection('products');

export const getDecisionTreesCollection = (businessId: string) =>
  getBusinessCollection().doc(businessId).collection('decisionTrees');

export const getQuestionnairesCollection = (businessId: string) =>
  getBusinessCollection().doc(businessId).collection('questionnaires');

export const getResponsesCollection = (businessId: string, questionnaireId: string) =>
  getQuestionnairesCollection(businessId).doc(questionnaireId).collection('responses');

export const getAnalyticsCollection = (businessId: string) =>
  getBusinessCollection().doc(businessId).collection('analytics');

