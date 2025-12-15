// Standalone Questionnaire Page for Customer Mode
import { useParams, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Questionnaire } from '../../components/customer/Questionnaire';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export function QuestionnairePage() {
  const { link } = useParams<{ link: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { customerId, role, isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-foreground transition-colors">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!link) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-700">Invalid questionnaire link</p>
        </div>
      </div>
    );
  }

  // If not authenticated, require customer login first
  if (!isAuthenticated) {
    return <Navigate to="/customer/login" state={{ from: location }} replace />;
  }

  const isBusinessSim = role === 'business';

  const handleBack = () => {
    navigate(isBusinessSim ? '/business' : '/recommendations');
  };

  const simulationNotice = isBusinessSim
    ? 'You are viewing this questionnaire in business test mode. Responses from this session will not be saved to analytics.'
    : undefined;

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Questionnaire 
          data={{ shareableLink: link }} 
          onBack={handleBack}
          customerId={isBusinessSim ? undefined : customerId || user?.uid || undefined}
          disablePersistence={isBusinessSim}
          simulationNotice={simulationNotice}
        />
      </div>
    </div>
  );
}

