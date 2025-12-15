// Customer Recommendations History Page
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Heart, Calendar, Building2, ArrowRight, Loader2, Package } from 'lucide-react';
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

interface RecommendationWithProducts extends Recommendation {
  products?: Product[];
}

export function RecommendationsPage() {
  const { customerId, isLoading: contextLoading } = useAuth();
  const [recommendations, setRecommendations] = useState<RecommendationWithProducts[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadRecommendations = async () => {
      // Don't wait for context if customerId is available
      if (!customerId) {
        if (!contextLoading) {
          // Context finished loading but no customerId - user is logged out or not initialized
          setIsLoading(false);
          setRecommendations([]); // Clear recommendations when logged out
        }
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        // First, show recommendations immediately without product details
        const response = await getCustomerRecommendations(customerId);
        const recs = response.recommendations || [];
        
        // Set recommendations immediately (without products) for fast initial render
        setRecommendations(recs);
        setIsLoading(false); // Show page immediately
        
        // Then, load product details in the background (non-blocking)
        // Only load for first recommendation to show something quickly
        if (recs.length > 0) {
          const firstRec = recs[0];
          if (firstRec.recommendedProductIds.length > 0) {
            getProductsByBusiness(firstRec.businessId)
              .then((productsResponse) => {
                const productMap = new Map(productsResponse.products.map(p => [p.id, p]));
                const products = firstRec.recommendedProductIds
                  .slice(0, 3)
                  .map(id => productMap.get(id))
                  .filter((p): p is Product => p !== undefined);
                
                // Update only the first recommendation with products
                setRecommendations(prev => 
                  prev.map((rec, idx) => idx === 0 ? { ...rec, products } : rec)
                );
              })
              .catch((err) => {
                console.error(`Error loading products for recommendation ${firstRec.id}:`, err);
                // Continue without products
              });
          }
          
          // Load products for remaining recommendations in background (non-blocking)
          if (recs.length > 1) {
            recs.slice(1, 4).forEach((rec, idx) => {
              if (rec.recommendedProductIds.length > 0) {
                setTimeout(() => {
                  getProductsByBusiness(rec.businessId)
                    .then((productsResponse) => {
                      const productMap = new Map(productsResponse.products.map(p => [p.id, p]));
                      const products = rec.recommendedProductIds
                        .slice(0, 3)
                        .map(id => productMap.get(id))
                        .filter((p): p is Product => p !== undefined);
                      
                      setRecommendations(prev => 
                        prev.map((r, i) => i === idx + 1 ? { ...r, products } : r)
                      );
                    })
                    .catch((err) => {
                      console.error(`Error loading products for recommendation ${rec.id}:`, err);
                    });
                }, (idx + 1) * 200); // Stagger requests to avoid overwhelming the server
              }
            });
          }
        }
        
        // Recommendations are set in the Promise.all block above
      } catch (err) {
        console.error('Error loading recommendations:', err);
        setError(getApiErrorMessage(err));
        setIsLoading(false);
      }
    };

    loadRecommendations();
  }, [customerId, contextLoading]);

  // Group recommendations by business
  const recommendationsByBusiness = recommendations.reduce((acc, rec) => {
    if (!acc[rec.businessId]) {
      acc[rec.businessId] = {
        businessId: rec.businessId,
        businessName: rec.businessName,
        recommendations: [],
      };
    }
    acc[rec.businessId].recommendations.push(rec);
    return acc;
  }, {} as Record<string, { businessId: string; businessName: string; recommendations: Recommendation[] }>);

  if (contextLoading || isLoading) {
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
            <p className="text-red-700">Error loading recommendations: {error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-gray-900 mb-2 text-3xl font-bold">My Recommendations</h1>
        <p className="text-gray-600">
          View all your product recommendations organized by business
        </p>
      </div>

      {Object.keys(recommendationsByBusiness).length === 0 ? (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-gray-900 mb-2 text-xl">No recommendations yet</h2>
            <p className="text-gray-600 mb-6">
              Complete questionnaires to see your personalized product recommendations here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.values(recommendationsByBusiness).map((group) => (
            <Card key={group.businessId}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-blue-600" />
                    <div>
                      <CardTitle>{group.businessName}</CardTitle>
                      <CardDescription>
                        {group.recommendations.length} recommendation{group.recommendations.length !== 1 ? 's' : ''}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {group.recommendations.map((rec) => (
                    <div
                      key={rec.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-center gap-4">
                        <Calendar className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-gray-900 font-medium">
                            {new Date(rec.completedAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </p>
                          <p className="text-gray-600 text-sm">
                            {rec.recommendedProductIds.length} product{rec.recommendedProductIds.length !== 1 ? 's' : ''} recommended
                          </p>
                          {rec.products && rec.products.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {rec.products.slice(0, 3).map((product) => {
                                const name = product.attributes.name as string ||
                                            product.attributes.productName as string ||
                                            product.attributes.title as string ||
                                            product.id;
                                return (
                                  <span
                                    key={product.id}
                                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs"
                                  >
                                    <Package className="w-3 h-3" />
                                    {name.length > 20 ? `${name.substring(0, 20)}...` : name}
                                  </span>
                                );
                              })}
                              {rec.products.length > 3 && (
                                <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                                  +{rec.products.length - 3} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <Link to={`/recommendations/${rec.id}`}>
                        <Button variant="outline" size="sm">
                          View Details
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

