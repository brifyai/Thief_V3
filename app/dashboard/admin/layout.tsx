'use client';

import { ReactNode } from 'react';
import { AuthGuard } from '@/middleware/auth-guard';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <AuthGuard requiredRole="admin">
      {children}
    </AuthGuard>
  );
}
