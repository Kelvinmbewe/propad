import { NextResponse } from 'next/server';
import { auth } from '@/auth-edge';

const protectedRoutes = ['/dashboard'];

const roleAccess: Record<string, string[]> = {
  '/dashboard/admin': ['ADMIN'],
  '/dashboard/advertiser': ['ADMIN', 'ADVERTISER'],
  '/dashboard/verifications': ['ADMIN', 'VERIFIER', 'MODERATOR', 'AGENT', 'LANDLORD'], // Agent/Landlord likely see their own
  '/dashboard/site-visits': ['ADMIN', 'MODERATOR', 'AGENT'], // Agents see their own
  '/dashboard/interests': ['ADMIN', 'AGENT', 'LANDLORD'],
  '/dashboard/listings': ['ADMIN', 'AGENT', 'LANDLORD'],
  '/dashboard/wallet': ['USER', 'AGENT', 'LANDLORD', 'ADMIN'], // Everyone has a wallet
  '/dashboard/reward-pool': ['ADMIN'],
  '/dashboard/referrals': ['USER', 'AGENT', 'ADMIN'], // Anyone can refer?
};

export default auth((request) => {
  return NextResponse.next();
  /*
  // STRICT SECURITY GUARD
  if (request.nextUrl.searchParams.has('password')) {
    return NextResponse.json(
      { error: 'Security Alert: Credentials in URL detected. Request blocked.' },
      { status: 400 }
    );
  }

  const { pathname } = request.nextUrl;

  // 1. Public Routes: /auth, /api/auth, / (landing), etc. handled by matcher or early return
  if (!protectedRoutes.some((route) => pathname.startsWith(route)) || pathname.startsWith('/auth')) {
    return NextResponse.next();
  }

  // 2. Authentication Check
  if (!request.auth) {
    const loginUrl = new URL('/auth/signin', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 3. Authorization (Role) Check
  const userRole = (request.auth.user as any)?.role || 'USER';

  // Find most specific matching route restriction
  // Sort by length desc to match "/dashboard/admin/users" before "/dashboard/admin"
  const matchedRestriction = Object.keys(roleAccess)
    .sort((a, b) => b.length - a.length)
    .find((route) => pathname.startsWith(route));

  if (matchedRestriction) {
    const allowedRoles = roleAccess[matchedRestriction];
    if (!allowedRoles.includes(userRole)) {
      // Allow specific overrides or just strict redirect
      // Redirect to their allowed dashboard home
      if (userRole === 'ADVERTISER') return NextResponse.redirect(new URL('/dashboard/advertiser', request.url));
      if (userRole === 'ADMIN') return NextResponse.next(); // Should be covered, but safety net

      // Default fallback for unauthorized acts
      return NextResponse.rewrite(new URL('/403', request.url)); // Use rewrite to show 403 page while keeping URL? Or redirect?
      // Better: Redirect to generic dashboard root which handles its own view, or just deny.
      // Requirements: "Unauthorized access MUST redirect or return 403 (never silent)"
      // Let's redirect to /dashboard which shows their allowed view, or show a toast? Middlewar cant show toast.
      // Let's redirect to /dashboard with error param?
      const errorUrl = new URL('/dashboard', request.url);
      errorUrl.searchParams.set('error', 'AccessDenied');
      return NextResponse.redirect(errorUrl);
    }
  }

  return NextResponse.next();
  */
});

export const config = {
  matcher: ['/dashboard/:path*']
};
