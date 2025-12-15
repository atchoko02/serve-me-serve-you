// Business Decision Trees Page - View and manage decision trees
import { useState, useEffect } from 'react';
import { useBusiness } from '../../contexts/BusinessContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { GitBranch, Loader2, AlertCircle } from 'lucide-react';
import { getDecisionTreesByBusiness } from '../../services/api/trees';
import { getApiErrorMessage } from '../../services/api/client';

interface DecisionTree {
  id: string;
  businessId: string;
  metrics: {
    depth: number;
    leafCount: number;
    averageLeafSize: number;
    maxLeafSize: number;
    minLeafSize: number;
    buildTimeMs: number;
  };
  productCount: number;
  createdAt: string;
  updatedAt?: string;
}

export function DecisionTreesPage() {
  const { businessId, isLoading: businessLoading } = useBusiness();
  const [trees, setTrees] = useState<DecisionTree[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTrees = async () => {
      if (businessLoading || !businessId) {
        setIsLoading(true);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const response = await getDecisionTreesByBusiness(businessId);
        setTrees(response.trees || []);
      } catch (err) {
        console.error('Error loading decision trees:', err);
        setError(getApiErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    };

    loadTrees();
  }, [businessId, businessLoading]);

  if (businessLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5" />
              <p>Error loading decision trees: {error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-gray-900 mb-2 text-3xl font-bold">Decision Trees</h1>
        <p className="text-gray-600">
          View and manage your decision trees for product recommendations
        </p>
      </div>

      {trees.length === 0 ? (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <GitBranch className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-gray-900 mb-2 text-xl">No decision trees yet</h2>
            <p className="text-gray-600 mb-6">
              Upload a CSV file and build a decision tree to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trees.map((tree) => (
            <Card key={tree.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitBranch className="w-5 h-5 text-blue-600" />
                  Decision Tree
                </CardTitle>
                <CardDescription>
                  Created {tree.createdAt ? new Date(tree.createdAt).toLocaleDateString() : 'Unknown'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Depth:</span>
                    <span className="text-gray-900 font-medium">{tree.metrics?.depth || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Leaf Nodes:</span>
                    <span className="text-gray-900 font-medium">{tree.metrics?.leafCount || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Avg Leaf Size:</span>
                    <span className="text-gray-900 font-medium">{tree.metrics?.averageLeafSize ? tree.metrics.averageLeafSize.toFixed(1) : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Products:</span>
                    <span className="text-gray-900 font-medium">{tree.productCount || 'N/A'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

