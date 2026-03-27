import { NextRequest, NextResponse } from 'next/server';

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Allow Auth0 routes without any checks
  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // For protected routes, we check for auth session cookie
  // Auth0 uses __Secure-ajs-user-session cookie
  const isProtected = pathname.startsWith('/dashboard') || (pathname.startsWith('/api') && !pathname.startsWith('/api/auth'));

  if (isProtected) {
    // Check for session cookie
    const sessionCookie = req.cookies.get('__Secure-ajs-user-session') || req.cookies.get('ajs-user-session');
    if (!sessionCookie) {
      return NextResponse.redirect(new URL('/', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
};
