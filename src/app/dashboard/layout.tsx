import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Header } from '@/components/layout/Header';
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
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      <Header user={user} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 pb-20 lg:pb-8">
          <div className="max-w-6xl mx-auto">
            <DashboardProviders>
              {children}
            </DashboardProviders>
          </div>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
