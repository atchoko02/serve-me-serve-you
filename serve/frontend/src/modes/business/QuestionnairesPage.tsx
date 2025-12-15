// Business Questionnaires Management Page - View and manage questionnaires
import { useState, useEffect } from 'react';
import { useBusiness } from '../../contexts/BusinessContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { FileText, Copy, ExternalLink, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getQuestionnairesByBusiness } from '../../services/api/questionnaire';
import { getApiErrorMessage } from '../../services/api/client';
import { toast } from 'sonner';

interface Questionnaire {
  id: string;
  name: string;
  shareableLink: string;
  isActive: boolean;
  createdAt: string;
}

export function QuestionnairesPage() {
  const { businessId, isLoading: businessLoading } = useBusiness();
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadQuestionnaires = async () => {
      if (businessLoading || !businessId) {
        setIsLoading(true);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const response = await getQuestionnairesByBusiness(businessId);
        setQuestionnaires(response.questionnaires || []);
      } catch (err) {
        console.error('Error loading questionnaires:', err);
        setError(getApiErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    };

    loadQuestionnaires();
  }, [businessId, businessLoading]);

  const handleCopyLink = async (link: string) => {
    const fullLink = `${window.location.origin}/q/${link}`;
    try {
      await navigator.clipboard.writeText(fullLink);
      toast.success('Link copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy link:', err);
      toast.error('Failed to copy link');
    }
  };

  const handleOpenQuestionnaire = (link: string) => {
    const fullLink = `${window.location.origin}/q/${link}`;
    window.open(fullLink, '_blank');
  };

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
              <p>Error loading questionnaires: {error}</p>
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
        <h1 className="text-gray-900 mb-2 text-3xl font-bold">Questionnaires</h1>
        <p className="text-gray-600">
          View and manage your questionnaires. Share links with customers to collect responses.
        </p>
      </div>

      {questionnaires.length === 0 ? (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-gray-900 mb-2 text-xl">No questionnaires yet</h2>
            <p className="text-gray-600 mb-6">
              Upload a CSV file, build a decision tree, and generate a questionnaire to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {questionnaires.map((questionnaire) => {
            const fullLink = `${window.location.origin}/q/${questionnaire.shareableLink}`;
            return (
              <Card key={questionnaire.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-600" />
                        {questionnaire.name || 'Unnamed Questionnaire'}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        Created {new Date(questionnaire.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </CardDescription>
                    </div>
                    {questionnaire.isActive ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                        <CheckCircle2 className="w-3 h-3" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                        Inactive
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Shareable Link */}
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">
                        Shareable Link
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={fullLink}
                          readOnly
                          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md bg-gray-50 text-gray-600"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyLink(questionnaire.shareableLink)}
                          title="Copy link"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleOpenQuestionnaire(questionnaire.shareableLink)}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Open
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

