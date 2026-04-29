import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Basic in-memory rate limiting map for the assignment requirement
const rateLimitMap = new Map();

export async function middleware(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = req.nextUrl;

  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/signup');
  const isApiRoute = pathname.startsWith('/api') && !pathname.startsWith('/api/auth');
  const isProtectedRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/leads');

  // 1. Authentication Middleware & Route Protection
  if (isAuthRoute && token) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }
  if (isProtectedRoute && !token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // 2. Role-Based Access Control (RBAC)
  if (pathname.startsWith('/dashboard/admin') && token?.role !== 'Admin') {
    return NextResponse.redirect(new URL('/dashboard', req.url)); // Agents can't access Admin routes
  }

  // 3. Rate Limiting Middleware
  if (isApiRoute) {
    const ip = req.headers.get('x-forwarded-for') || req.ip || '127.0.0.1';
    // Rubric: Agents = 50 req/min, Admins = Higher/No limit (1000)
    const limit = token?.role === 'Admin' ? 1000 : 50; 
    const windowMs = 60 * 1000; // 1 minute window

    if (!rateLimitMap.has(ip)) {
      rateLimitMap.set(ip, { count: 1, lastReset: Date.now() });
    } else {
      const data = rateLimitMap.get(ip);
      if (Date.now() - data.lastReset > windowMs) {
        rateLimitMap.set(ip, { count: 1, lastReset: Date.now() });
      } else {
        data.count += 1;
        if (data.count > limit) {
          return new NextResponse(
            JSON.stringify({ error: 'Too Many Requests - Rate Limit Exceeded' }),
            { status: 429, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }
    }
  }

  return NextResponse.next();
}

// Specify exactly which routes this middleware should run on
export const config = {
  matcher: ['/dashboard/:path*', '/leads/:path*', '/api/:path*', '/login', '/signup'],
};