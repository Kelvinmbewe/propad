import { NextResponse } from 'next/server';
import { auth } from '@/auth-edge';

const protectedRoutes = ['/dashboard'];

export default auth((request) => {
  // STRICT SECURITY GUARD
  if (request.nextUrl.searchParams.has('password')) {
    return NextResponse.json(
      { error: 'Security Alert: Credentials in URL detected. Request blocked.' },
      { status: 400 }
    );
  }

  if (!protectedRoutes.some((route) => request.nextUrl.pathname.startsWith(route)) || request.nextUrl.pathname.startsWith('/auth')) {
    return NextResponse.next();
  }

  if (!request.auth) {
    const loginUrl = new URL('/auth/signin', request.url);
    loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/dashboard/:path*']
};
