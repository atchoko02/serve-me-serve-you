// Business App - Wrapper for business routes with role-based protection
// All routes under /business require business role authentication
import { Outlet } from 'react-router-dom';
import { ProtectedRoute } from '../../components/auth/ProtectedRoute';
import { Navigation } from '../../components/shared/Navigation';
import { BusinessProvider } from '../../contexts/BusinessContext';

export function BusinessApp() {
  return (
    <ProtectedRoute role="business" redirectTo="/business/login">
      <BusinessProvider>
        <div className="min-h-screen bg-background text-foreground transition-colors">
          <Navigation />
          <main className="container mx-auto px-4 py-8">
            <Outlet />
          </main>
        </div>
      </BusinessProvider>
    </ProtectedRoute>
  );
}
