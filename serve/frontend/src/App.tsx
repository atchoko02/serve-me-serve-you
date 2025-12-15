// Main App with routing
// Wrapped with AuthProvider to provide unified authentication context
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CustomerApp } from './modes/customer/CustomerApp';
import { BusinessApp } from './modes/business/BusinessApp';
import { LoginPage } from './components/business/LoginPage';
import { CustomerLoginPage } from './components/customer/CustomerLoginPage';
import { LandingPage } from './pages/LandingPage';
import { Loader2 } from 'lucide-react';

// Lazy load route components for code splitting
const QuestionnairePage = lazy(() => import('./modes/customer/QuestionnairePage').then(m => ({ default: m.QuestionnairePage })));
const RecommendationsPage = lazy(() => import('./modes/customer/RecommendationsPage').then(m => ({ default: m.RecommendationsPage })));
const RecommendationDetailsPage = lazy(() => import('./modes/customer/RecommendationDetailsPage').then(m => ({ default: m.RecommendationDetailsPage })));
const DashboardPage = lazy(() => import('./modes/business/DashboardPage').then(m => ({ default: m.DashboardPage })));
const DecisionTreesPage = lazy(() => import('./modes/business/DecisionTreesPage').then(m => ({ default: m.DecisionTreesPage })));
const QuestionnairesPage = lazy(() => import('./modes/business/QuestionnairesPage').then(m => ({ default: m.QuestionnairesPage })));
const AnalyticsPage = lazy(() => import('./modes/business/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const ExportPage = lazy(() => import('./modes/business/ExportPage').then(m => ({ default: m.ExportPage })));
const Account = lazy(() => import('./components/business/Account').then(m => ({ default: m.Account })));

// Loading fallback component
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Landing & Login */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/business/login" element={<LoginPage />} />
          <Route path="/customer/login" element={<CustomerLoginPage />} />

          {/* Customer Mode Routes */}
          <Route path="/recommendations" element={<CustomerApp />}>
            <Route 
              index 
              element={
                <Suspense fallback={<PageLoader />}>
                  <RecommendationsPage />
                </Suspense>
              } 
            />
            <Route 
              path=":recommendationId" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <RecommendationDetailsPage />
                </Suspense>
              } 
            />
          </Route>
          
          {/* Standalone Questionnaire - role aware (customer required, business simulation allowed) */}
          <Route 
            path="/q/:link" 
            element={
              <Suspense fallback={<PageLoader />}>
                <QuestionnairePage />
              </Suspense>
            } 
          />

        {/* Business Mode Routes */}
        <Route path="/business" element={<BusinessApp />}>
          <Route 
            index 
            element={
              <Suspense fallback={<PageLoader />}>
                <DashboardPage />
              </Suspense>
            } 
          />
          <Route 
            path="trees" 
            element={
              <Suspense fallback={<PageLoader />}>
                <DecisionTreesPage />
              </Suspense>
            } 
          />
          <Route 
            path="questionnaires" 
            element={
              <Suspense fallback={<PageLoader />}>
                <QuestionnairesPage />
              </Suspense>
            } 
          />
          <Route 
            path="analytics" 
            element={
              <Suspense fallback={<PageLoader />}>
                <AnalyticsPage />
              </Suspense>
            } 
          />
          <Route 
            path="export" 
            element={
              <Suspense fallback={<PageLoader />}>
                <ExportPage />
              </Suspense>
            } 
          />
          <Route 
            path="account" 
            element={
              <Suspense fallback={<PageLoader />}>
                <Account />
              </Suspense>
            } 
          />
          {/* Legacy route for backward compatibility */}
          <Route path="questionnaires/preview" element={<Navigate to="/business" replace />} />
        </Route>

          {/* Fallback - redirect to landing */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
