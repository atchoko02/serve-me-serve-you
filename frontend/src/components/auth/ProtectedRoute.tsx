// ProtectedRoute - Role-based route guard component
// Usage: Wrap routes that require specific authentication/role
// 
// Example:
//   <ProtectedRoute role="business" redirectTo="/recommendations">
//     <YourComponent />
//   </ProtectedRoute>

import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  role?: 'business' | 'customer';
  requireAuth?: boolean;
  redirectTo?: string;
}

export function ProtectedRoute({ 
  children, 
  role, 
  requireAuth = true,
  redirectTo 
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, role: userRole } = useAuth();
  const location = useLocation();

  // Show loading state while auth is being resolved
  // This prevents blank pages during auth state changes
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // If authentication is required but user is not authenticated
  if (requireAuth && !isAuthenticated) {
    // Redirect to appropriate login page based on intended role
    const loginPath = role === 'business' ? '/business/login' : '/customer/login';
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  // If specific role is required but user doesn't have it
  if (role && userRole !== role) {
    // Redirect based on user's actual role or default redirect
    const defaultRedirect = userRole === 'business' ? '/business' : '/recommendations';
    return <Navigate to={redirectTo || defaultRedirect} replace />;
  }

  // User is authorized - render the protected content
  return <>{children}</>;
}

