// Recommendation Details Page - Shows full details of a recommendation
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { ArrowLeft, Calendar, Building2, Package, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getCustomerRecommendations } from '../../services/api/customers';
import { getProductsByBusiness } from '../../services/api/csv';
import { getApiErrorMessage } from '../../services/api/client';

interface Recommendation {
  id: string;
  businessId: string;
  businessName: string;
  questionnaireId: string;
  recommendedProductIds: string[];
  completedAt: string;
  duration: number;
}

interface Product {
  id: string;
  attributes: Record<string, string | number>;
}

export function RecommendationDetailsPage() {
  const { recommendationId } = useParams<{ recommendationId: string }>();
  const navigate = useNavigate();
  const { customerId } = useAuth();
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDetails = async () => {
      if (!recommendationId || !customerId) {
        setError('Missing recommendation ID or customer ID');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Try to get the specific recommendation directly (more efficient)
        // For now, we'll still need to fetch all, but we can optimize this later with a backend endpoint
        const recommendationsResponse = await getCustomerRecommendations(customerId);
        const found = recommendationsResponse.recommendations.find(r => r.id === recommendationId);

        if (!found) {
          setError('Recommendation not found');
          setIsLoading(false);
          return;
        }

        setRecommendation(found);

        // Get product details (only load what we need)
        if (found.recommendedProductIds.length > 0) {
          try {
            const productsResponse = await getProductsByBusiness(found.businessId);
            const productMap = new Map(productsResponse.products.map(p => [p.id, p]));
            // Only load the recommended products, not all products
            const recommendedProducts = found.recommendedProductIds
              .map(id => productMap.get(id))
              .filter((p): p is Product => p !== undefined);
            setProducts(recommendedProducts);
          } catch (err) {
            console.error('Error loading products:', err);
            // Continue without product details
          }
        }
      } catch (err) {
        console.error('Error loading recommendation details:', err);
        setError(getApiErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    };

    loadDetails();
  }, [recommendationId, customerId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !recommendation) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5" />
              <p>{error || 'Recommendation not found'}</p>
            </div>
            <Button onClick={() => navigate('/recommendations')} className="mt-4" variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Recommendations
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Extract product name from attributes
  const getProductName = (product: Product): string => {
    const attrs = product.attributes;
    return (
      attrs.name as string ||
      attrs.productName as string ||
      attrs.title as string ||
      attrs.product as string ||
      product.id
    );
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button onClick={() => navigate('/recommendations')} variant="ghost">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Recommendations
      </Button>

      {/* Header */}
      <div>
        <h1 className="text-gray-900 mb-2 text-3xl font-bold">Recommendation Details</h1>
        <p className="text-gray-600">
          Complete details of your product recommendations
        </p>
      </div>

      {/* Recommendation Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            {recommendation.businessName}
          </CardTitle>
          <CardDescription>
            Completed on {new Date(recommendation.completedAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Products Recommended</p>
              <p className="text-gray-900 font-medium">{recommendation.recommendedProductIds.length}</p>
            </div>
            <div>
              <p className="text-gray-600">Duration</p>
              <p className="text-gray-900 font-medium">
                {Math.round(recommendation.duration / 1000)}s
              </p>
            </div>
            <div>
              <p className="text-gray-600">Questionnaire ID</p>
              <p className="text-gray-900 font-medium text-xs truncate">{recommendation.questionnaireId}</p>
            </div>
            <div>
              <p className="text-gray-600">Business ID</p>
              <p className="text-gray-900 font-medium text-xs truncate">{recommendation.businessId}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommended Products */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            Recommended Products
          </CardTitle>
          <CardDescription>
            {products.length > 0 
              ? `${products.length} product${products.length !== 1 ? 's' : ''} found`
              : 'Product details not available'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {products.length > 0 ? (
            <div className="space-y-4">
              {products.map((product, index) => (
                <div
                  key={product.id}
                  className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-700 font-semibold text-sm">
                          {index + 1}
                        </span>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-gray-900 font-medium mb-2">
                          {getProductName(product)}
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                          {Object.entries(product.attributes)
                            .filter(([key]) => !['id', 'originalRow'].includes(key))
                            .slice(0, 6)
                            .map(([key, value]) => (
                              <div key={key}>
                                <span className="text-gray-600 capitalize">{key.replace(/_/g, ' ')}:</span>{' '}
                                <span className="text-gray-900 font-medium">{String(value)}</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-2">
                Product details could not be loaded, but {recommendation.recommendedProductIds.length} product{recommendation.recommendedProductIds.length !== 1 ? 's' : ''} were recommended.
              </p>
              <p className="text-gray-500 text-sm">
                Product IDs: {recommendation.recommendedProductIds.slice(0, 5).join(', ')}
                {recommendation.recommendedProductIds.length > 5 && '...'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

