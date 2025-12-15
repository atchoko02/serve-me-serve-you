// Questionnaire controller
import { AuthenticatedRequest } from '../middleware/auth';
import { Response } from 'express';
import * as decisionTreeService from '../services/decisionTreeService';
import { getQuestionnairesCollection, getBusinessCollection } from '../config/firebase';
import type { Questionnaire } from '../models/Questionnaire';

/**
 * Generate a questionnaire from a decision tree
 * POST /api/questionnaires/generate
 */
export async function generateQuestionnaire(req: Request, res: Response): Promise<void> {
  try {
    const { businessId, treeId, name } = req.body;

    if (!businessId) {
      res.status(400).json({ error: 'businessId is required' });
      return;
    }

    // Get decision tree (latest or specific)
    let tree;
    if (treeId) {
      tree = await decisionTreeService.getDecisionTree(businessId, treeId);
    } else {
      tree = await decisionTreeService.getLatestDecisionTree(businessId);
    }

    if (!tree) {
      res.status(404).json({ error: 'No decision tree found for this business' });
      return;
    }

    // Create questionnaire document
    const questionnairesRef = getQuestionnairesCollection(businessId);
    const questionnaireData: {
      businessId: string;
      treeId: string;
      name: string;
      shareableLink: string;
      isActive: boolean;
      createdAt: Date;
      updatedAt: Date;
    } = {
      businessId,
      treeId: tree.id,
      name: name || `Questionnaire ${new Date().toISOString()}`,
      shareableLink: `questionnaire_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await questionnairesRef.add(questionnaireData);
    const doc = await docRef.get();

    if (!doc.exists) {
      res.status(500).json({ error: 'Failed to create questionnaire' });
      return;
    }

    const questionnaire: Questionnaire = {
      id: doc.id,
      businessId: doc.data()!.businessId,
      treeId: doc.data()!.treeId,
      name: doc.data()!.name,
      shareableLink: doc.data()!.shareableLink,
      isActive: doc.data()!.isActive,
      createdAt: doc.data()!.createdAt,
      updatedAt: doc.data()!.updatedAt,
    };

    res.json({
      success: true,
      questionnaire: {
        id: questionnaire.id,
        name: questionnaire.name,
        shareableLink: questionnaire.shareableLink,
        treeId: questionnaire.treeId,
        createdAt: questionnaire.createdAt,
      },
    });
  } catch (error) {
    console.error('Error generating questionnaire:', error);
    res.status(500).json({
      error: 'Failed to generate questionnaire',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Get questionnaire by shareable link
 * GET /api/questionnaires/:link
 */
export async function getQuestionnaireByLink(req: Request, res: Response): Promise<void> {
  try {
    const { link } = req.params;

    if (!link) {
      res.status(400).json({ error: 'Questionnaire link is required' });
      return;
    }

    // Search for questionnaire by shareableLink
    // Note: This requires querying across all businesses
    // In production, consider using a top-level collection with shareableLink as document ID
    const { getBusinessCollection } = await import('../config/firebase');
    const businessesRef = getBusinessCollection();
    const businessesSnapshot = await businessesRef.limit(20).get(); // Limit to avoid quota exhaustion

    let foundQuestionnaire: Questionnaire | null = null;

    for (const businessDoc of businessesSnapshot.docs) {
      try {
        const questionnairesRef = getQuestionnairesCollection(businessDoc.id);
        const snapshot = await questionnairesRef
          .where('shareableLink', '==', link)
          .where('isActive', '==', true)
          .limit(1)
          .get();

        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          foundQuestionnaire = {
            id: doc.id,
            businessId: doc.data().businessId,
            treeId: doc.data().treeId,
            name: doc.data().name,
            shareableLink: doc.data().shareableLink,
            isActive: doc.data().isActive,
            createdAt: doc.data().createdAt,
            updatedAt: doc.data().updatedAt,
          };
          break;
        }
      } catch (err) {
        console.error(`Error querying questionnaires for business ${businessDoc.id}:`, err);
        // Continue with next business
      }
    }

    if (!foundQuestionnaire) {
      res.status(404).json({ error: 'Questionnaire not found or inactive' });
      return;
    }

    // Get the associated tree
    const tree = await decisionTreeService.getDecisionTree(
      foundQuestionnaire.businessId,
      foundQuestionnaire.treeId
    );

    if (!tree) {
      res.status(404).json({ error: 'Decision tree not found' });
      return;
    }

    res.json({
      success: true,
      questionnaire: foundQuestionnaire,
      tree: {
        id: tree.id,
        metrics: tree.metrics,
        treeStructure: tree.treeStructure,
        questionTree: tree.questionTree,
        featureMetadata: tree.featureMetadata,
        headers: tree.headers,
        attributeProfiles: tree.attributeProfiles, // Include attribute profiles for adaptive question generation
      },
    });
  } catch (error) {
    console.error('Error fetching questionnaire:', error);
    res.status(500).json({
      error: 'Failed to fetch questionnaire',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Get all questionnaires for a business
 * GET /api/questionnaires/business/:businessId
 */
export async function getQuestionnairesByBusiness(req: Request, res: Response): Promise<void> {
  try {
    const { businessId } = req.params;

    if (!businessId) {
      res.status(400).json({ error: 'businessId is required' });
      return;
    }

    const questionnairesRef = getQuestionnairesCollection(businessId);
    const snapshot = await questionnairesRef.orderBy('createdAt', 'desc').limit(50).get(); // Limit to avoid quota

    const questionnaires: Questionnaire[] = snapshot.docs.map(doc => ({
      id: doc.id,
      businessId: doc.data().businessId,
      treeId: doc.data().treeId,
      name: doc.data().name,
      shareableLink: doc.data().shareableLink,
      isActive: doc.data().isActive,
      createdAt: doc.data().createdAt,
      updatedAt: doc.data().updatedAt,
    }));

    res.json({
      success: true,
      count: questionnaires.length,
      questionnaires: questionnaires.map(q => ({
        id: q.id,
        name: q.name,
        shareableLink: q.shareableLink,
        isActive: q.isActive,
        createdAt: q.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching questionnaires:', error);
    res.status(500).json({
      error: 'Failed to fetch questionnaires',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

