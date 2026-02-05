'use client';

import { ConfigDataProvider } from '@/contexts/ConfigDataContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { ConfirmDialogProvider } from '@/components/ui/ConfirmDialog';

export function DashboardProviders({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ConfirmDialogProvider>
        <ConfigDataProvider>
          {children}
        </ConfigDataProvider>
      </ConfirmDialogProvider>
    </ToastProvider>
  );
}
