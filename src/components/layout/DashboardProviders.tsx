'use client';

import { ConfigDataProvider } from '@/contexts/ConfigDataContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { ConfirmDialogProvider } from '@/components/ui/ConfirmDialog';
import { UserProvider } from '@/contexts/UserContext';

interface DashboardProvidersProps {
  children: React.ReactNode;
  user: {
    id?: string;
    email?: string;
  } | null;
}

export function DashboardProviders({ children, user }: DashboardProvidersProps) {
  return (
    <UserProvider user={user}>
      <ToastProvider>
        <ConfirmDialogProvider>
          <ConfigDataProvider>
            {children}
          </ConfigDataProvider>
        </ConfirmDialogProvider>
      </ToastProvider>
    </UserProvider>
  );
}
