import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'member';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { user, firebaseUser, loading, isAuthReady } = useAuth();
  const location = useLocation();

  if (!isAuthReady || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#050505] text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-violet-500"></div>
      </div>
    );
  }

  if (!firebaseUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!user) {
    // User exists in Auth but not in Firestore yet (e.g., during signup)
    // Or they haven't submitted a join request yet
    if (location.pathname === '/join-request') {
      return <>{children}</>;
    }
    return <Navigate to="/join-request" replace />;
  }

  // Handle pending/rejected/new states
  if (user.approvalStatus === 'new' && location.pathname !== '/join-request') {
    return <Navigate to="/join-request" replace />;
  }
  if (user.approvalStatus === 'pending' && location.pathname !== '/pending') {
    return <Navigate to="/pending" replace />;
  }
  if (user.approvalStatus === 'rejected' && location.pathname !== '/rejected') {
    return <Navigate to="/rejected" replace />;
  }

  // Handle approved members
  if (user.approvalStatus === 'approved') {
    if (location.pathname === '/pending' || location.pathname === '/rejected' || location.pathname === '/join-request') {
      return <Navigate to="/dashboard" replace />;
    }
    
    if (requiredRole === 'admin' && user.role !== 'admin') {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
};
