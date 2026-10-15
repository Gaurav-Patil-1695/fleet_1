import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import type { UserRole } from '../../types/auth';

interface RoleGuardProps {
  roles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

function RoleGuard({ roles, children, fallback = null }: RoleGuardProps): React.ReactElement {
  const { user } = useAuth();

  const userRole = user?.role as UserRole | undefined;

  if (!userRole || !roles.includes(userRole)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

export default RoleGuard;
