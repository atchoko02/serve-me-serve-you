// Questionnaire API service
import apiClient from './client';
import type { ObliqueTreeNode } from '../../utils/decisionTree';
import type { QuestionTreeNode, FeatureMetadata } from '../../types/questionTree.types';

export interface Questionnaire {
  id: string;
  businessId: string;
  treeId: string;
  name: string;
  shareableLink: string;
  isActive: boolean;
  createdAt: any;
  updatedAt?: any;
}

export interface GenerateQuestionnaireResponse {
  success: boolean;
  questionnaire: {
    id: string;
    name: string;
    shareableLink: string;
    treeId: string;
    createdAt: any;
  };
}

export interface QuestionnaireWithTree {
  success: boolean;
  questionnaire: Questionnaire;
  tree: {
    id: string;
    metrics: any;
    treeStructure: ObliqueTreeNode;
    questionTree?: QuestionTreeNode;
    featureMetadata?: FeatureMetadata[];
    headers?: string[];
    attributeProfiles?: import('../../../shared/types/attributeProfile.types').AttributeProfile[];
  };
}

export interface QuestionnairesListResponse {
  success: boolean;
  count: number;
  questionnaires: Array<{
    id: string;
    name: string;
    shareableLink: string;
    isActive: boolean;
    createdAt: any;
  }>;
}

/**
 * Generate a questionnaire from a decision tree
 */
export async function generateQuestionnaire(
  businessId: string,
  options?: {
    treeId?: string;
    name?: string;
  }
): Promise<GenerateQuestionnaireResponse> {
  const response = await apiClient.post<GenerateQuestionnaireResponse>('/api/questionnaires/generate', {
    businessId,
    treeId: options?.treeId,
    name: options?.name,
  });

  return response.data;
}

/**
 * Get questionnaire by shareable link
 */
export async function getQuestionnaireByLink(link: string): Promise<QuestionnaireWithTree> {
  const response = await apiClient.get<QuestionnaireWithTree>(`/api/questionnaires/${link}`);
  return response.data;
}

/**
 * Get all questionnaires for a business
 */
export async function getQuestionnairesByBusiness(businessId: string): Promise<QuestionnairesListResponse> {
  const response = await apiClient.get<QuestionnairesListResponse>(`/api/questionnaires/business/${businessId}`);
  return response.data;
}

