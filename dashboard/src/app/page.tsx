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
          <img
            src="https://cdn.prod.website-files.com/69066945678413d777151176/698493e5d5a63466f390dfee_NEWSuppliedFullLogoWhite.png"
            alt="Supplied"
            className="h-10"
          />
        </div>

        <p className="mb-8" style={{ color: 'var(--text-muted)' }}>
          Operations Dashboard
        </p>

        <a
          href="/auth/login"
          className="inline-block px-6 py-3 rounded-md font-medium transition-colors"
          style={{
            background: 'var(--accent)',
            color: 'white',
          }}
        >
          Log in
        </a>
      </div>
    </div>
  );
}
