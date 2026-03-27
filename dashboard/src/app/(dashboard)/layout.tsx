'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { isAdmin } from '@/lib/auth';
import { LogOut } from 'lucide-react';

const tabs = [
  { name: 'TO DOs', href: '/dashboard', adminOnly: false },
  { name: 'ROADMAP', href: '/roadmap', adminOnly: false },
  { name: 'SALES', href: '/sales', adminOnly: false },
  { name: 'ACCOUNTS', href: '/accounts', adminOnly: true },
  { name: 'KPIs', href: '/kpis', adminOnly: true },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useUser();
  const pathname = usePathname();

  if (isLoading) {
    return (
      <div style={{ background: 'var(--bg)', color: 'var(--text)' }} className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  const userIsAdmin = isAdmin(user?.email);

  // Filter tabs based on admin status
  const visibleTabs = tabs.filter((tab) => !tab.adminOnly || userIsAdmin);

  // Helper to determine if a tab is active
  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  return (
    <div style={{ background: 'var(--bg)', color: 'var(--text)' }} className="min-h-screen flex flex-col">
      {/* Header */}
      <header
        style={{
          background: 'var(--surface)',
          borderBottomColor: 'var(--border)',
        }}
        className="border-b"
      >
        <div className="px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <svg
              width="32"
              height="32"
              viewBox="0 0 64 64"
              className="text-indigo-500"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <circle cx="32" cy="32" r="28" />
              <circle cx="32" cy="32" r="18" />
              <circle cx="32" cy="32" r="8" />
            </svg>
            <span className="text-xl font-bold" style={{ color: 'var(--accent)' }}>
              Supplied
            </span>
          </div>

          {/* User info & logout */}
          <div className="flex items-center gap-4">
            {user && (
              <>
                <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {user.name || user.email}
                </div>
                {user.picture && (
                  <img
                    src={user.picture}
                    alt={user.name || 'User'}
                    className="w-8 h-8 rounded-full"
                  />
                )}
              </>
            )}
            <Link
              href="/api/auth/logout"
              className="p-2 rounded-md transition-colors"
              style={{
                background: 'var(--surface2)',
                color: 'var(--text-muted)',
              }}
              title="Logout"
            >
              <LogOut size={18} />
            </Link>
          </div>
        </div>

        {/* Tab navigation */}
        <nav
          style={{
            borderTopColor: 'var(--border)',
          }}
          className="border-t px-6 flex gap-0"
        >
          {visibleTabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className="px-4 py-3 text-sm font-medium transition-colors border-b-2 border-transparent"
              style={{
                color: isActive(tab.href) ? 'var(--accent)' : 'var(--text-muted)',
                borderBottomColor: isActive(tab.href) ? 'var(--accent)' : 'transparent',
              }}
            >
              {tab.name}
            </Link>
          ))}
        </nav>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
