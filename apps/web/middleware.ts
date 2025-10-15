import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const protectedRoutes = ['/dashboard'];

export async function middleware(request: NextRequest) {
  if (!protectedRoutes.some((route) => request.nextUrl.pathname.startsWith(route))) {
    return NextResponse.next();
  }

  const token = await getToken({ req: request });

  if (!token) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*']
};
