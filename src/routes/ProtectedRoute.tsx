// src/routes/ProtectedRoute.tsx
import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Box, CircularProgress } from "@mui/material";

interface ProtectedRouteProps {
  children: ReactNode;
  redirectPath?: string;
  allowedRoles?: string[]; // Optional: for role-based access control
}

/**
 * A wrapper for routes that should only be accessible to authenticated users
 * Redirects to login page if user is not authenticated
 */
const ProtectedRoute = ({
  children,
  redirectPath = "/login",
  allowedRoles = [],
}: ProtectedRouteProps) => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  // If still loading auth state, show loading indicator
  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // If not authenticated, redirect to login
  if (!currentUser) {
    return <Navigate to={redirectPath} state={{ from: location }} replace />;
  }

  // Optional: Check user roles
  if (allowedRoles.length > 0) {
    // If you store roles in Firebase Auth custom claims or in Firestore
    // Here's a placeholder implementation assuming you have user role info
    const userRole = currentUser.email?.includes("admin") ? "admin" : "user";

    if (!allowedRoles.includes(userRole)) {
      // User doesn't have the required role
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // If authenticated and has proper role, render the protected content
  return <>{children}</>;
};

export default ProtectedRoute;
