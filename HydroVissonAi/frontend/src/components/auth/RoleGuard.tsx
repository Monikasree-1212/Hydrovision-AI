import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { AccessDeniedPage } from '../../pages/AccessDeniedPage';
import { useLocation } from 'react-router-dom';
import { isRouteAllowed } from '../../utils/permissions';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ children, allowedRoles }) => {
  const { role, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="min-h-[50vh] flex items-center justify-center text-xs font-bold text-govt-navy">Verifying Authorization...</div>;
  }

  if (!isAuthenticated || !role) {
    return <AccessDeniedPage />;
  }

  // Check path route guard
  if (!isRouteAllowed(role, location.pathname)) {
    return <AccessDeniedPage />;
  }

  // Check specific allowed roles parameter if provided
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <AccessDeniedPage />;
  }

  return <>{children}</>;
};
