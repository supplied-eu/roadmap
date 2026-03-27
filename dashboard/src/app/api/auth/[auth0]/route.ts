import { NextRequest, NextResponse } from 'next/server';
import { Auth0Client } from '@auth0/nextjs-auth0/server';

// Extract domain from issuer URL (remove https:// and trailing slash)
const issuerUrl = process.env.AUTH0_ISSUER_BASE_URL || '';
const domain = issuerUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');

const auth0 = new Auth0Client({
  domain,
  clientId: process.env.AUTH0_CLIENT_ID || '',
  clientSecret: process.env.AUTH0_CLIENT_SECRET || '',
  secret: process.env.AUTH0_SECRET || '',
  appBaseUrl: process.env.AUTH0_BASE_URL || '',
});

export async function GET(req: NextRequest) {
  try {
    return await auth0.middleware(req);
  } catch (error) {
    console.error('Auth0 error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
