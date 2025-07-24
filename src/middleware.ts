/**
 * Next.js Middleware for Route Protection
 * 
 * This file handles route-level protection and access control.
 * It runs before pages are loaded to check authentication and authorization.
 * 
 * Features:
 * - Dashboard route protection (admin only)
 * - Authentication checks
 * - Role-based access control
 * - Automatic redirects for unauthorized access
 * - Session validation
 * 
 * Protected Routes:
 * - /dashboard/* - Admin only access
 * - Any other admin-specific routes can be added here
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Define protected routes
const ADMIN_ONLY_ROUTES = [
    '/dashboard'
];

const PUBLIC_ROUTES = [
    '/',
    '/auth/signin',
    '/auth/signup',
    '/auth/error',
    '/api/auth',
    '/api/users/register'
];

/**
 * Middleware function that runs on every request
 * @param request - The incoming request
 * @returns NextResponse with redirect or continuation
 */
export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Skip middleware for static files and API routes (except protected ones)
    if (
        pathname.startsWith('/_next/') ||
        pathname.startsWith('/favicon.ico') ||
        pathname.startsWith('/api/') && !pathname.startsWith('/api/dashboard')
    ) {
        return NextResponse.next();
    }

    // Get the user's token/session
    const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET
    });

    // Check if route requires admin access
    const isAdminRoute = ADMIN_ONLY_ROUTES.some(route =>
        pathname.startsWith(route)
    );

    // Check if it's a public route
    const isPublicRoute = PUBLIC_ROUTES.some(route =>
        pathname.startsWith(route)
    );

    // If it's a public route, allow access
    if (isPublicRoute) {
        return NextResponse.next();
    }

    // If user is not authenticated
    if (!token) {
        // Redirect to signin page with callback URL
        const signInUrl = new URL('/auth/signin', request.url);
        signInUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(signInUrl);
    }

    // If route requires admin access
    if (isAdminRoute) {
        // Check if user is admin
        if (token.role !== 'admin') {
            // Redirect to access denied page or home
            const accessDeniedUrl = new URL('/access-denied', request.url);
            return NextResponse.redirect(accessDeniedUrl);
        }
    }

    // Allow access
    return NextResponse.next();
}

/**
 * Configure which routes the middleware should run on
 */
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
}
