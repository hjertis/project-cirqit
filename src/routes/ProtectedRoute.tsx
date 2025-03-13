// src/routes/ProtectedRoute.tsx
import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  children: ReactNode;
  redirectPath?: string;
}

/**
 * A wrapper for routes that should only be accessible to authenticated users
 * Redirects to login page if user is not authenticated
 */
const ProtectedRoute = ({ 
  children, 
  redirectPath = '/login' 
}: ProtectedRouteProps) => {
  // Here we would normally get the authentication state from a context
  // For now, we'll just use a dummy value
  const isAuthenticated = true;
  const location = useLocation();

  if (!isAuthenticated) {
    // Redirect to login page but save the attempted URL
    return <Navigate to={redirectPath} state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;