
import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const ProtectedRoute = () => {
  const { user, isLoading } = useAuth();

  // Show loading or spinner while checking authentication status
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
      </div>
    );
  }

  // If not logged in, redirect to auth page
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // If logged in, render the child routes
  return <Outlet />;
};

export default ProtectedRoute;
