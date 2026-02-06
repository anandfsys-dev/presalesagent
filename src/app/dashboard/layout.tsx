import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Sidebar, MobileNav } from '@/components/layout/Sidebar';
import { DashboardProviders } from '@/components/layout/DashboardProviders';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      {/* Sidebar - hidden on mobile */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardProviders user={user}>
          {children}
        </DashboardProviders>
      </div>

      {/* Mobile Navigation */}
      <MobileNav />
    </div>
  );
}
