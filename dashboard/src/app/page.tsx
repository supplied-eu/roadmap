'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@auth0/nextjs-auth0/client';
import Link from 'next/link';
import { Lock } from 'lucide-react';

export default function HomePage() {
  const { user, isLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div style={{ color: 'var(--text-muted)' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div
        className="rounded-lg p-8 text-center w-full max-w-sm"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="mb-6 flex justify-center">
          {/* SVG circles logo */}
          <svg
            width="64"
            height="64"
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
        </div>

        <h1
          className="text-3xl font-bold mb-2"
          style={{ color: 'var(--accent)' }}
        >
          Supplied
        </h1>

        <p className="mb-8" style={{ color: 'var(--text-muted)' }}>
          Operations Dashboard
        </p>

        <div className="mb-6 flex justify-center">
          <Lock
            size={32}
            style={{ color: 'var(--accent)' }}
          />
        </div>

        <Link
          href="/api/auth/login"
          className="inline-block px-6 py-3 rounded-md font-medium transition-colors"
          style={{
            background: 'var(--accent)',
            color: 'white',
          }}
          onMouseEnter={(e) => {
            const el = e.target as HTMLElement;
            el.style.opacity = '0.9';
          }}
          onMouseLeave={(e) => {
            const el = e.target as HTMLElement;
            el.style.opacity = '1';
          }}
        >
          Log in
        </Link>
      </div>
    </div>
  );
}
