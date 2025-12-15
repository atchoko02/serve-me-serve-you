// src/components/Questionnaire.tsx
import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  Award,
  Loader2,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import {
  ObliqueTreeNode,
  ProductVector,
} from '../../utils/decisionTree';
import { getQuestionnaireByLink } from '../../services/api/questionnaire';
import { getApiErrorMessage } from '../../services/api/client';
import {
  navigateTree,
  isLeafNode,
  getProductsFromLeaf,
  calculateProjection,
} from '../../utils/treeNavigator';
import { generateQuestionFromSplit } from '../../utils/questionGenerator';
import { NavigationStep, Question } from '../../types/questionnaire.types';
import { QuestionTreeNode, FeatureMetadata, ProductSummary } from '../../types/questionTree.types';

interface QuestionnaireProps {
  data: {
    // Old format (for backward compatibility)
    headers?: string[];
    data?: string[][];
    // New format (from backend)
    questionnaireId?: string;
    shareableLink?: string;
    businessId?: string;
    treeId?: string;
    productCount?: number;
  };
  onBack: () => void;
  customerId?: string; // Optional customerId for linking recommendations
  disablePersistence?: boolean; // When true, skip saving responses (e.g., business simulation)
  simulationNotice?: string;
}

type RankedProduct = {
  product: ProductVector | ProductSummary;
  score: number;
};

// Collect all products under a subtree (for fallback)
function gatherProducts(node: ObliqueTreeNode | null): ProductVector[] {
  if (!node) return [];
  if (node.type === 'leaf') return node.products;
  return [...gatherProducts(node.left), ...gatherProducts(node.right)];
}

// Map raw attribute names to customer-friendly phrases (unused, kept for reference)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function describeAttribute(name: string): string {
  const lower = name.toLowerCase().trim();

  if (lower.includes('price') || lower.includes('cost')) return 'cheaper prices';
  if (lower.includes('rating')) return 'better reviews from other customers';
  if (lower.includes('ship')) return 'faster shipping';
  if (lower.includes('eco')) return 'more eco-friendly products';
  if (lower.includes('warranty')) return 'a longer warranty';
  if (lower.includes('popular') || lower.includes('popularity'))
    return 'more popular / trending items';
  if (lower.includes('durab')) return 'higher durability';
  if (lower.includes('qual')) return 'better overall quality';

  // Fallback: make it readable
  return name.replace(/[_-]/g, ' ');
}

// Try to derive a display name for a product from its original row
function getProductName(originalRow: string[], headers: string[]): string {
  if (headers && headers.length === originalRow.length) {
    const nameIndex = headers.findIndex((h) =>
      /name|product|title|sku/i.test(h.toLowerCase())
    );
    if (nameIndex >= 0 && originalRow[nameIndex]) {
      return originalRow[nameIndex];
    }
  }

  // Fallback: first non-empty cell
  const fallback = originalRow.find((c) => c && c.trim().length > 0);
  return fallback || 'Product';
}

// Score products based on tree navigation path
function scoreProductByTreePath(
  product: ProductVector,
  navigationPath: NavigationStep[],
  leafProducts: ProductVector[]
): number {
  let score = 0;
  const maxScore = navigationPath.length + 1; // +1 for being in the final leaf

  // Check if product is in the final leaf (highest score)
  const inLeaf = leafProducts.some((p) => p.id === product.id);
  if (inLeaf) {
    score += 1;
  }

  // Score based on how many splits the product matches
  navigationPath.forEach((step, index) => {
    if (!step.answer || !step.question.weights) return;

    const productProjection = calculateProjection(product, step.question.weights);
    const threshold = step.question.threshold || 0;
    
    // Check if product matches the user's choice
    const productSide = productProjection <= threshold ? 'left' : 'right';
    const userChoice = step.answer.choice;

    if (productSide === userChoice) {
      // Product matches user's preference for this split
      score += (maxScore - index) / maxScore;
    }
  });

  return score;
}

export function Questionnaire({ data, onBack, customerId, disablePersistence = false, simulationNotice }: QuestionnaireProps) {
  // Tree navigation state
  const [flowMode, setFlowMode] = useState<'question-tree' | 'oblique'>('oblique');
  const [currentNode, setCurrentNode] = useState<ObliqueTreeNode | null>(null);
  const [questionTree, setQuestionTree] = useState<QuestionTreeNode | null>(null);
  const [currentQuestionNode, setCurrentQuestionNode] = useState<QuestionTreeNode | null>(null);
  const [navigationPath, setNavigationPath] = useState<NavigationStep[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [pendingChoice, setPendingChoice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tree, setTree] = useState<ObliqueTreeNode | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [attributeProfiles, setAttributeProfiles] = useState<any[] | undefined>(undefined);
  const [featureMetadata, setFeatureMetadata] = useState<FeatureMetadata[] | undefined>(undefined);
  const [askedAttributes, setAskedAttributes] = useState<Set<string>>(new Set());
  const [sessionId] = useState<string>(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [startTime] = useState<number>(Date.now());
  const [questionnaireInfo, setQuestionnaireInfo] = useState<{ businessId?: string; questionnaireId?: string; businessName?: string } | null>(null);
  
  // Use provided customerId or fall back to sessionId
  const effectiveCustomerId = customerId || sessionId;

  // Load questionnaire from backend if shareableLink or questionnaireId is provided
  React.useEffect(() => {
    const loadQuestionnaire = async () => {
      if (data.shareableLink || data.questionnaireId) {
        setIsLoading(true);
        setLoadError(null);
        
        try {
          // Use shareableLink if available, otherwise we'd need questionnaireId lookup
          const link = data.shareableLink;
          if (!link) {
            setLoadError('No questionnaire link provided');
            setIsLoading(false);
            return;
          }

          const response = await getQuestionnaireByLink(link);
          console.log('Questionnaire response:', response);
          
          if (!response || !response.tree || !response.tree.treeStructure) {
            console.error('Invalid questionnaire response:', response);
            setLoadError('Invalid questionnaire response: missing tree structure');
            setIsLoading(false);
            return;
          }
          
          // Store questionnaire info for saving responses
          if (response.questionnaire) {
            setQuestionnaireInfo({
              businessId: response.questionnaire.businessId,
              questionnaireId: response.questionnaire.id,
              businessName: response.questionnaire.name || 'Business', // Use questionnaire name as business name for now
            });
          }
          
          const loadedTree = response.tree.treeStructure;
          console.log('Loaded tree:', loadedTree);

          // Prefer new question tree if available
          if (response.tree.questionTree) {
            setFlowMode('question-tree');
            setQuestionTree(response.tree.questionTree);
            setCurrentQuestionNode(response.tree.questionTree);
            setFeatureMetadata(response.tree.featureMetadata);
            setTree(loadedTree);
            if (response.tree.attributeProfiles) {
              setAttributeProfiles(response.tree.attributeProfiles);
            }
            if (response.tree.headers && response.tree.headers.length > 0) {
              setHeaders(response.tree.headers);
            }
          } else {
            // Validate oblique tree structure
            if (!loadedTree || (loadedTree.type !== 'leaf' && loadedTree.type !== 'internal')) {
              console.error('Invalid tree structure:', loadedTree);
              setLoadError('Invalid tree structure received from server');
              setIsLoading(false);
              return;
            }
            
            // Extract headers from tree feature names (available on both internal and leaf nodes)
            const extractFeatureNames = (node: ObliqueTreeNode): string[] => {
              if (node.type === 'leaf' || node.type === 'internal') {
                return node.featureNames || [];
              }
              return [];
            };
            
            const featureNames = extractFeatureNames(loadedTree);
            if (featureNames.length > 0) {
              setHeaders(featureNames);
            }
            
            // Store attribute profiles if available
            if (response.tree.attributeProfiles) {
              setAttributeProfiles(response.tree.attributeProfiles);
            }
            
            setTree(loadedTree);
            setFlowMode('oblique');
            // Ensure we start at the root, not a leaf
            if (loadedTree.type === 'leaf') {
              console.error('Tree is a leaf node, cannot start questionnaire');
              setLoadError('Invalid questionnaire: tree has no questions (only leaf node)');
              setIsLoading(false);
              return;
            }
            console.log('Setting currentNode to loaded tree root');
            setCurrentNode(loadedTree);
          }
        } catch (error) {
          console.error('Error loading questionnaire:', error);
          setLoadError(getApiErrorMessage(error));
        } finally {
          setIsLoading(false);
        }
      } else if (data.headers && data.data) {
        // Fallback to old client-side building (for backward compatibility)
        try {
          setFlowMode('oblique');
          const { buildObliqueTreeFromCSV } = await import('../../utils/decisionTree');
          const builtTree = buildObliqueTreeFromCSV(
        { headers: data.headers, data: data.data },
        {
          maxDepth: 8,
          minLeafSize: 1,
        }
      );
          setTree(builtTree);
          setCurrentNode(builtTree);
          setHeaders(data.headers);
        } catch (err: any) {
          console.error('Failed to build oblique decision tree:', err);
          setLoadError(
            err?.message ||
            'We could not build a decision tree from your product data. Please check your CSV.'
          );
        }
      } else {
        setLoadError('No product data found. Please upload a CSV file with products.');
      }
    };

    loadQuestionnaire();
  }, [data.shareableLink, data.questionnaireId, data.headers, data.data]);

  // Initialize current node when tree is loaded (already handled in loadQuestionnaire)

  // Handle case where currentNode becomes a leaf unexpectedly
  React.useEffect(() => {
    if (currentNode && currentNode.type === 'leaf' && !isComplete) {
      setIsComplete(true);
    }
  }, [currentNode, isComplete]);

  React.useEffect(() => {
    if (currentQuestionNode && currentQuestionNode.type === 'leaf' && !isComplete) {
      setIsComplete(true);
    }
  }, [currentQuestionNode, isComplete]);

  // Calculate progress based on tree depth
  const calculateProgress = (): number => {
    if (flowMode === 'question-tree') {
      if (!questionTree || !currentQuestionNode) return 0;
      const estimateDepth = (node: QuestionTreeNode, depth = 0): number => {
        if (node.type === 'leaf') return depth;
        if (node.type === 'numeric') {
          return Math.max(
            estimateDepth(node.left, depth + 1),
            estimateDepth(node.right, depth + 1)
          );
        }
        const childDepths = Object.values(node.children).map((child) => estimateDepth(child, depth + 1));
        return childDepths.length > 0 ? Math.max(...childDepths) : depth;
      };
      const maxDepth = estimateDepth(questionTree);
      const currentDepth = navigationPath.length;
      return maxDepth > 0 ? Math.min((currentDepth / maxDepth) * 100, 100) : 0;
    }

    if (!tree || !currentNode) return 0;
    
    // Estimate total depth (this is approximate)
    const estimateDepth = (node: ObliqueTreeNode, depth: number = 0): number => {
      if (node.type === 'leaf') return depth;
      return Math.max(
        estimateDepth(node.left, depth + 1),
        estimateDepth(node.right, depth + 1)
      );
    };
    
    const maxDepth = estimateDepth(tree);
    const currentDepth = navigationPath.length;
    return maxDepth > 0 ? Math.min((currentDepth / maxDepth) * 100, 100) : 0;
  };

  const progress = calculateProgress();

  // ---------- RESULTS PHASE ----------
  // IMPORTANT: This useMemo must be called before any conditional returns
  const results = useMemo(() => {
    try {
      if (flowMode === 'question-tree') {
        if (!isComplete || !currentQuestionNode || currentQuestionNode.type !== 'leaf') {
          return { rankedProducts: [] as RankedProduct[] };
        }
        const products = currentQuestionNode.representativeProducts?.length
          ? currentQuestionNode.representativeProducts
          : currentQuestionNode.products;
        const rankedProducts: RankedProduct[] = [...products]
          .map((p) => ({
            product: p,
            score: (p as ProductSummary).score ?? 1,
          }))
          .sort((a, b) => b.score - a.score);
        return { rankedProducts };
      }

      if (!isComplete || !currentNode || currentNode.type !== 'leaf') {
        return {
          rankedProducts: [] as RankedProduct[],
        };
      }

      const leafProducts = getProductsFromLeaf(currentNode);
      
      // Score all products (including those not in leaf, but with lower scores)
      const allProducts = gatherProducts(tree);
      const rankedProducts: RankedProduct[] = allProducts
        .map((p) => ({
          product: p,
          score: scoreProductByTreePath(p, navigationPath, leafProducts),
        }))
        .sort((a, b) => b.score - a.score);

      return { rankedProducts };
    } catch (err) {
      console.error('Error computing results:', err);
      return { rankedProducts: [] as RankedProduct[] };
    }
  }, [flowMode, isComplete, currentQuestionNode, currentNode, navigationPath, tree]);

  // Save response when questionnaire is completed
  // IMPORTANT: This must come AFTER results is defined
  React.useEffect(() => {
    const saveResponse = async () => {
      if (disablePersistence) {
        return;
      }
      if (!isComplete || !questionnaireInfo || !questionnaireInfo.businessId || !questionnaireInfo.questionnaireId) {
        return;
      }

      if (navigationPath.length === 0) {
        return; // Don't save if no answers
      }

      if (!results || !results.rankedProducts || results.rankedProducts.length === 0) {
        return; // Don't save if no results yet
      }

      try {
        const { storeResponse } = await import('../../services/api/responses');
        const duration = Date.now() - startTime;
        
        // Get recommended product IDs from results
        const recommendedProductIds = results.rankedProducts
          .slice(0, 10) // Top 10 recommendations
          .map(rp => rp.product.id);

        await storeResponse({
          businessId: questionnaireInfo.businessId!,
          questionnaireId: questionnaireInfo.questionnaireId!,
          navigationPath,
          recommendedProductIds,
          duration,
          sessionId,
          customerId: effectiveCustomerId, // Include customerId in response
        });
      } catch (error) {
        // Don't show error to user, just log it
        console.error('Failed to save response:', error);
      }
    };

    saveResponse();
  }, [disablePersistence, isComplete, questionnaireInfo, navigationPath, results, startTime, sessionId]);

  // Calculate current tree depth for progressive refinement
  const calculateCurrentDepth = (): number => {
    // Count how many steps we've taken (approximate depth)
    return navigationPath.length;
  };

  // ---------- QUESTION GENERATION ----------
  // IMPORTANT: This useMemo must also be called before any conditional returns
  // to maintain consistent hook order
  const question = useMemo(() => {
    if (flowMode === 'question-tree') {
      if (!currentQuestionNode || currentQuestionNode.type === 'leaf') {
        return null;
      }
      return {
        id: currentQuestionNode.id,
        text: currentQuestionNode.question,
        type: currentQuestionNode.type === 'numeric' ? 'numeric' : 'categorical',
        feature: currentQuestionNode.feature,
        options: currentQuestionNode.options,
        threshold: currentQuestionNode.type === 'numeric' ? currentQuestionNode.threshold : undefined,
      } as Question;
    }

    if (!currentNode || currentNode.type === 'leaf') {
      return null;
    }
    const treeDepth = calculateCurrentDepth();
    return generateQuestionFromSplit(currentNode, attributeProfiles, askedAttributes, treeDepth);
  }, [flowMode, currentQuestionNode, currentNode, attributeProfiles, askedAttributes, navigationPath.length]);

  // Derive display options for the current question (before any conditional returns)
  const displayOptions = useMemo(() => {
    if (question?.options && question.options.length > 0) {
      return question.options.map((opt) => ({
        id: opt.id,
        label: opt.label || opt.value || opt.id,
      }));
    }
    // Extract left/right option descriptions from question text
    const extractOptions = (questionText: string | undefined): { left: string; right: string } => {
      if (!questionText) {
        return { left: 'Option A', right: 'Option B' };
      }
      
      const orMatch = questionText.match(/(.+?)\s+or\s+(.+?)\?/);
      if (orMatch) {
        const left = orMatch[1]
          .replace(/Would you prefer products with /g, '')
          .replace(/What matters more to you: /g, '')
          .replace(/If you had to choose, would you rather have /g, '')
          .replace(/Which do you value more: /g, '')
          .trim();
        const right = orMatch[2].trim();
        return { left, right };
      }
      
      const parts = questionText.split(' or ');
      if (parts.length >= 2) {
        const left = parts[0]
          .replace(/Would you prefer products with /g, '')
          .replace(/What matters more to you: /g, '')
          .replace(/If you had to choose, would you rather have /g, '')
          .replace(/Which do you value more: /g, '')
          .trim();
        const right = parts[1].replace(/\?/g, '').trim();
        return { left, right };
      }
      
      return { left: 'Option A', right: 'Option B' };
    };

    const { left, right } = extractOptions(question?.text);
    return [
      { id: 'left', label: left },
      { id: 'right', label: right },
    ];
  }, [question]);

  // Predict if the next step reaches a leaf (before any conditional returns)
  const nextIsLeaf = useMemo(() => {
    if (!pendingChoice || !question) return false;
    if (flowMode === 'question-tree') {
      if (!currentQuestionNode || currentQuestionNode.type === 'leaf') return false;
      if (currentQuestionNode.type === 'numeric') {
        const next = pendingChoice === 'leq' ? currentQuestionNode.left : currentQuestionNode.right;
        return next?.type === 'leaf';
      }
      const next = currentQuestionNode.children[pendingChoice];
      return next?.type === 'leaf';
    }
    if (currentNode) {
      try {
        return isLeafNode(navigateTree(currentNode, pendingChoice as 'left' | 'right'));
      } catch {
        return false;
      }
    }
    return false;
  }, [pendingChoice, question, flowMode, currentQuestionNode, currentNode]);

  const handleRestart = () => {
    if (flowMode === 'question-tree') {
      setCurrentQuestionNode(questionTree);
    } else {
      setCurrentNode(tree);
    }
    setNavigationPath([]);
    setIsComplete(false);
    setPendingChoice(null);
    setAskedAttributes(new Set()); // Reset asked attributes on restart
  };

  const handleChoose = (choice: 'left' | 'right') => {
    setPendingChoice(choice);
  };

  const handleNextStep = () => {
    if (!pendingChoice) return;

    if (flowMode === 'question-tree') {
      if (!currentQuestionNode || currentQuestionNode.type === 'leaf' || !question) return;

      const nextNode =
        currentQuestionNode.type === 'numeric'
          ? (pendingChoice === 'leq' ? currentQuestionNode.left : currentQuestionNode.right)
          : currentQuestionNode.children[pendingChoice];

      const selectedOption = question.options?.find((opt) => opt.id === pendingChoice);

      const step: NavigationStep = {
        nodeId: currentQuestionNode.id,
        question,
        answer: {
          questionId: question.id,
          choice: pendingChoice,
          optionLabel: selectedOption?.label,
          timestamp: Date.now(),
        },
        timestamp: Date.now(),
      };

      setNavigationPath((prev) => [...prev, step]);
      if (!nextNode) {
        setIsComplete(true);
        setPendingChoice(null);
        return;
      }
      setCurrentQuestionNode(nextNode || null);
      setPendingChoice(null);
      if (nextNode && nextNode.type === 'leaf') {
        setIsComplete(true);
      }
      return;
    }

    if (!currentNode || currentNode.type === 'leaf') return;

    // Generate question for current node (use same logic as render)
    // IMPORTANT: Use attributeProfiles, askedAttributes, and treeDepth to ensure consistency between display and saved questions
    const treeDepth = navigationPath.length;
    const obliqueQuestion = generateQuestionFromSplit(currentNode, attributeProfiles, askedAttributes, treeDepth);

    // Extract top attributes from the current question to track what we've asked about
    // This helps avoid repetitive questions
    if (currentNode.type === 'internal' && currentNode.featureNames && currentNode.weights) {
      const featureWeights = currentNode.featureNames
        .map((name, idx) => ({
          name,
          absWeight: Math.abs(currentNode.weights[idx]),
        }))
        .sort((a, b) => b.absWeight - a.absWeight);
      
      // Track top 1-2 attributes from this question
      const topAttributes = featureWeights.slice(0, 2).map(f => f.name);
      setAskedAttributes((prev) => {
        const newSet = new Set(prev);
        topAttributes.forEach(attr => newSet.add(attr));
        return newSet;
      });
    }

    // Create navigation step
    const step: NavigationStep = {
      nodeId: `node_${currentNode.threshold}_${currentNode.weights.join('_').slice(0, 10)}`,
      question: obliqueQuestion,
      answer: {
        questionId: obliqueQuestion.id,
        choice: pendingChoice,
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
    };

    // Navigate to next node
    const nextNode = navigateTree(currentNode, pendingChoice as 'left' | 'right');

    // Update state atomically to prevent intermediate renders
    setNavigationPath((prev) => [...prev, step]);
    setCurrentNode(nextNode);
    setPendingChoice(null);

    // Check if we've reached a leaf
    if (isLeafNode(nextNode)) {
      setIsComplete(true);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto" data-testid="questionnaire-container">
        <Button onClick={onBack} variant="ghost" className="mb-6" data-testid="back-to-setup-button">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Setup
        </Button>

        <Card data-testid="loading-card">
          <CardHeader>
            <CardTitle>Loading Questionnaire...</CardTitle>
            <CardDescription>Please wait while we load your questionnaire</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-2xl mx-auto" data-testid="questionnaire-container">
        <Button onClick={onBack} variant="ghost" className="mb-6" data-testid="back-to-setup-button">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Setup
        </Button>

        <Card data-testid="error-card">
          <CardHeader>
            <CardTitle data-testid="error-title">Something went wrong</CardTitle>
            <CardDescription data-testid="error-message">{loadError}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Setup
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (flowMode === 'question-tree') {
    if (!questionTree || !currentQuestionNode) {
      return (
        <div className="max-w-2xl mx-auto" data-testid="questionnaire-container">
          <Button onClick={onBack} variant="ghost" className="mb-6" data-testid="back-to-setup-button">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Setup
          </Button>

          <Card data-testid="error-card">
              <CardHeader>
                <CardTitle data-testid="error-title">Not enough data to ask questions</CardTitle>
                <CardDescription data-testid="error-message">
                  We need a few meaningful attributes (numeric or categorical) to guide preferences. Please check your CSV.
                </CardDescription>
              </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={onBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Setup
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
  } else if (!tree || !currentNode) {
    return (
      <div className="max-w-2xl mx-auto" data-testid="questionnaire-container">
        <Button onClick={onBack} variant="ghost" className="mb-6" data-testid="back-to-setup-button">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Setup
        </Button>

        <Card data-testid="error-card">
            <CardHeader>
              <CardTitle data-testid="error-title">Not enough data to ask questions</CardTitle>
              <CardDescription data-testid="error-message">
                We need a few meaningful attributes (numeric or categorical) to guide preferences. Please check your CSV.
              </CardDescription>
            </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Setup
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isQuestionTreeComplete = flowMode === 'question-tree' && currentQuestionNode && currentQuestionNode.type === 'leaf' && isComplete;
  const isObliqueComplete = flowMode === 'oblique' && currentNode && currentNode.type === 'leaf' && isComplete;

  if (isQuestionTreeComplete || isObliqueComplete) {
    const { rankedProducts } = results;
    const leafProducts =
      flowMode === 'question-tree' && currentQuestionNode && currentQuestionNode.type === 'leaf'
        ? (currentQuestionNode.representativeProducts?.length
            ? currentQuestionNode.representativeProducts
            : currentQuestionNode.products)
        : getProductsFromLeaf(currentNode as ObliqueTreeNode);
    const recommendedProducts =
      flowMode === 'question-tree'
        ? rankedProducts.slice(0, 3)
        : rankedProducts
            .filter((rp) => leafProducts.some((lp) => lp.id === rp.product.id))
            .slice(0, 3);

    const bestScore = rankedProducts[0]?.score ?? 0;

    return (
      <div className="max-w-2xl mx-auto" data-testid="questionnaire-container">
        <Button onClick={onBack} variant="ghost" className="mb-6" data-testid="back-to-setup-button">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Setup
        </Button>

        <Card data-testid="results-card">
          <CardContent className="pt-12 pb-12 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-gray-900 mb-2" data-testid="completion-message">Questionnaire Complete!</h2>
            <p className="text-gray-600 mb-8">
              Based on your answers, here are the products that best match your preferences.
            </p>

            {/* How we got here / your choices */}
            {navigationPath.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left">
                <p className="text-gray-900 mb-4 font-medium">
                  How we got here
                </p>
                <ol className="space-y-3 text-sm text-gray-700">
                  {navigationPath.map((step, index) => (
                    <li key={index} className="flex gap-2">
                      <span className="mt-0.5 text-xs font-semibold text-gray-400">
                        {index + 1}.
                      </span>
                      <div>
                        <p className="font-medium text-gray-900">
                          {step.question.text}
                        </p>
                        <p className="text-gray-600">
                          You chose:{' '}
                          <span className="font-semibold">
                            {step.answer?.optionLabel || step.answer?.choice || 'Option'}
                          </span>
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Recommended products */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 mb-6 text-left border border-blue-100" data-testid="recommended-products">
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-5 h-5 text-blue-600" />
                <p className="text-gray-900 font-medium">
                  Top Recommended Products
                </p>
              </div>

              {recommendedProducts.length > 0 ? (
                <div className="space-y-3">
                  {recommendedProducts.map((item, index) => {
                    const { product, score } = item;
                    const matchPercent =
                      bestScore > 0
                        ? Math.round((score / bestScore) * 100)
                        : 0;
                    return (
                      <div
                        key={product.id ?? index}
                        className="bg-white rounded-lg p-4 border border-blue-200 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                index === 0
                                  ? 'bg-yellow-100'
                                  : index === 1
                                  ? 'bg-gray-100'
                                  : 'bg-orange-100'
                              }`}
                            >
                              <span
                                className={`${
                                  index === 0
                                    ? 'text-yellow-700'
                                    : index === 1
                                    ? 'text-gray-700'
                                    : 'text-orange-700'
                                }`}
                              >
                                {index + 1}
                              </span>
                            </div>
                            <div className="flex-1">
                              <p className="text-gray-900 mb-1 font-medium">
                                {getProductName(product.originalRow, headers)}
                              </p>
                              <p className="text-sm text-gray-600">
                                Highly aligned with your preferences
                              </p>
                            </div>
                          </div>
                          <Badge
                            variant={index === 0 ? 'default' : 'secondary'}
                            className="flex-shrink-0"
                          >
                            {matchPercent}% Match
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white rounded-lg p-6 border border-gray-200 text-center">
                  <p className="text-gray-600">
                    We couldn't find strong matches based on your answers. Try
                    starting over or using a different catalog.
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-center" data-testid="results-actions">
              <Button onClick={handleRestart} variant="outline" data-testid="start-over-button">
                <RefreshCw className="w-4 h-4 mr-2" />
                Start Over
              </Button>
              <Button onClick={onBack} data-testid="create-new-button">
                Create New Questionnaire
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalSteps = navigationPath.length + 1; // Approximate

  // Handle case where question generation failed
  if (!question) {
    return (
      <div className="max-w-2xl mx-auto" data-testid="questionnaire-container">
        <Button onClick={onBack} variant="ghost" className="mb-6" data-testid="back-to-setup-button">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Setup
        </Button>
        <Card data-testid="error-card">
          <CardHeader>
            <CardTitle data-testid="error-title">Error generating question</CardTitle>
            <CardDescription data-testid="error-message">
              Unable to generate a question from the current node. Please try again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Setup
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If we hit a leaf in oblique mode before completion flag flips, show a stable loading view
  if (flowMode === 'oblique' && currentNode && currentNode.type === 'leaf' && !isComplete) {
    return (
      <div className="max-w-2xl mx-auto" data-testid="questionnaire-container">
        <Button onClick={onBack} variant="ghost" className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Setup
        </Button>
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Preparing results...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto" data-testid="questionnaire-container">
      <Button onClick={onBack} variant="ghost" className="mb-6" data-testid="back-to-setup-button">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Setup
      </Button>
      {simulationNotice && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {simulationNotice}
        </div>
      )}

      <Card data-testid="question-card">
        <CardHeader>
          <div className="flex items-center justify-between mb-2">
            <CardDescription data-testid="question-number">
              Question {navigationPath.length + 1}
            </CardDescription>
            <span className="text-sm text-gray-500" data-testid="progress-percentage">
              {Math.round(progress)}% Complete
            </span>
          </div>
          <Progress value={progress} className="mb-4" data-testid="progress-bar" />
          <CardTitle data-testid="question-text">{question.text}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Answer Options */}
          <div className="grid grid-cols-1 gap-3" data-testid="answer-options">
            {displayOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleChoose(opt.id as 'left' | 'right')}
                data-testid={`option-${opt.id}`}
                className={`p-4 rounded-lg border-2 text-left transition-all hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-slate-800 dark:hover:border-blue-400 ${
                  pendingChoice === opt.id
                    ? 'border-blue-600 bg-blue-50 dark:border-blue-400 dark:bg-slate-800'
                    : 'border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-gray-900 dark:text-slate-100">{opt.label}</span>
                  {pendingChoice === opt.id && (
                    <CheckCircle2 className="w-5 h-5 text-blue-600" />
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-4" data-testid="navigation-buttons">
            <Button variant="outline" onClick={handleRestart} data-testid="start-over-button">
              <RefreshCw className="w-4 h-4 mr-2" />
              Start Over
            </Button>
            <Button onClick={handleNextStep} disabled={!pendingChoice} data-testid="next-button">
              {nextIsLeaf ? 'Finish' : 'Next'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
