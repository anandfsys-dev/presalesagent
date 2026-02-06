'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  user?: {
    email?: string;
  } | null;
  children?: React.ReactNode; // Action buttons
}

export function PageHeader({ title, subtitle, user, children }: PageHeaderProps) {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
  };

  // Get user initials for avatar
  const getInitials = (email?: string) => {
    if (!email) return 'U';
    const parts = email.split('@')[0].split(/[._-]/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex-shrink-0">
      <div className="flex items-center justify-between">
        {/* Title Section */}
        <div>
          <h1 className="text-lg font-bold text-gray-900 uppercase tracking-wide">{title}</h1>
          {subtitle && (
            <p className="text-xs text-gray-500">{subtitle}</p>
          )}
        </div>

        {/* Actions and User Info */}
        <div className="flex items-center gap-4">
          {/* Page Actions */}
          {children}

          {/* User Info */}
          {user && (
            <div className="flex items-center gap-3 ml-4 border-l border-gray-200 pl-4">
              <div className="text-right">
                <p className="text-sm text-gray-700">{user.email}</p>
                <button
                  onClick={handleSignOut}
                  className="text-xs text-red-500 hover:text-red-600 font-medium uppercase tracking-wide"
                >
                  Sign Out
                </button>
              </div>
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                {getInitials(user.email)}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
