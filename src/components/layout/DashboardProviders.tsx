'use client';

import { ConfigDataProvider } from '@/contexts/ConfigDataContext';

export function DashboardProviders({ children }: { children: React.ReactNode }) {
  return (
    <ConfigDataProvider>
      {children}
    </ConfigDataProvider>
  );
}
