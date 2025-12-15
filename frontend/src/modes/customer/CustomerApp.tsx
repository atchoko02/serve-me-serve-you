// Customer Mode App - Wrapper for all customer-facing pages
// Customer routes are public (no auth required), but we ensure customer role is set
// This allows seamless switching between business and customer modes
import { Outlet } from 'react-router-dom';
import { CustomerNavigation } from '../../components/customer/CustomerNavigation';
import { useAuth } from '../../contexts/AuthContext';
import { ProtectedRoute } from '../../components/auth/ProtectedRoute';

export function CustomerApp() {
  const { isLoading } = useAuth();

  return (
    <ProtectedRoute role="customer" redirectTo="/customer/login">
      <div className="min-h-screen bg-background text-foreground transition-colors">
        <CustomerNavigation />
        <main className="max-w-7xl mx-auto px-6 py-8">
          <Outlet />
        </main>
      </div>
    </ProtectedRoute>
  );
}

