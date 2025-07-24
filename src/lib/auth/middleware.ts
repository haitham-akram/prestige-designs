/**
 * Authentication Middleware
 * 
 * This file provides middleware functions for protecting API routes
 * and enforcing authentication and authorization requirements.
 * 
 * Features:
 * - Route protection middleware
 * - Role-based access control
 * - Session validation
 * - Error handling
 * - Request context management
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from './config';

/**
 * Authentication middleware for API routes
 * @param handler - The API route handler to protect
 * @returns Protected route handler
 */
export function withAuth(
    handler: (req: NextRequest, context: any, user: any) => Promise<NextResponse>
) {
    return async (req: NextRequest, context: any) => {
        try {
            const session = await getServerSession(authOptions);

            if (!session?.user) {
                return NextResponse.json(
                    { success: false, message: 'Authentication required' },
                    { status: 401 }
                );
            }

            return handler(req, context, session.user);
        } catch (error) {
            console.error('Auth middleware error:', error);
            return NextResponse.json(
                { success: false, message: 'Authentication failed' },
                { status: 401 }
            );
        }
    };
}

/**
 * Role-based authorization middleware
 * @param roles - Required roles for access
 * @param handler - The API route handler to protect
 * @returns Protected route handler with role checking
 */
export function withRoles(
    roles: ('customer' | 'seller' | 'admin')[],
    handler: (req: NextRequest, context: any, user: any) => Promise<NextResponse>
) {
    return withAuth(async (req: NextRequest, context: any, user: any) => {
        if (!roles.includes(user.role)) {
            return NextResponse.json(
                {
                    success: false,
                    message: `Access denied. Required roles: ${roles.join(', ')}`
                },
                { status: 403 }
            );
        }

        return handler(req, context, user);
    });
}

/**
 * Admin-only middleware
 * @param handler - The API route handler to protect
 * @returns Protected route handler for admin access only
 */
export function withAdmin(
    handler: (req: NextRequest, context: any, user: any) => Promise<NextResponse>
) {
    return withRoles(['admin'], handler);
}

/**
 * Seller or Admin middleware
 * @param handler - The API route handler to protect
 * @returns Protected route handler for seller/admin access
 */
export function withSellerOrAdmin(
    handler: (req: NextRequest, context: any, user: any) => Promise<NextResponse>
) {
    return withRoles(['seller', 'admin'], handler);
}

/**
 * Verified seller middleware
 * @param handler - The API route handler to protect
 * @returns Protected route handler for verified sellers only
 */
export function withVerifiedSeller(
    handler: (req: NextRequest, context: any, user: any) => Promise<NextResponse>
) {
    return withAuth(async (req: NextRequest, context: any, user: any) => {
        if (user.role !== 'seller' || !user.isSellerVerified) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Verified seller account required'
                },
                { status: 403 }
            );
        }

        return handler(req, context, user);
    });
}

/**
 * Optional authentication middleware
 * Provides user context if authenticated, but doesn't require it
 * @param handler - The API route handler
 * @returns Route handler with optional user context
 */
export function withOptionalAuth(
    handler: (req: NextRequest, context: any, user?: any) => Promise<NextResponse>
) {
    return async (req: NextRequest, context: any) => {
        try {
            const session = await getServerSession(authOptions);
            return handler(req, context, session?.user || undefined);
        } catch (error) {
            console.error('Optional auth middleware error:', error);
            return handler(req, context, undefined);
        }
    };
}

/**
 * Rate limiting middleware (basic implementation)
 * @param maxRequests - Maximum requests per time window
 * @param windowMs - Time window in milliseconds
 * @param handler - The API route handler
 * @returns Rate-limited route handler
 */
export function withRateLimit(
    maxRequests: number,
    windowMs: number,
    handler: (req: NextRequest, context: any) => Promise<NextResponse>
) {
    const requests = new Map<string, { count: number; resetTime: number }>();

    return async (req: NextRequest, context: any) => {
        const ip = req.headers.get('x-forwarded-for') ||
            req.headers.get('x-real-ip') ||
            'unknown';

        const now = Date.now();
        const userRequests = requests.get(ip);

        if (!userRequests || now > userRequests.resetTime) {
            requests.set(ip, { count: 1, resetTime: now + windowMs });
            return handler(req, context);
        }

        if (userRequests.count >= maxRequests) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Too many requests. Please try again later.'
                },
                { status: 429 }
            );
        }

        userRequests.count++;
        return handler(req, context);
    };
}

/**
 * Combine multiple middleware functions
 * @param middlewares - Array of middleware functions to apply
 * @param handler - The final API route handler
 * @returns Combined middleware chain
 */
export function combineMiddleware(
    middlewares: Array<(handler: any) => any>,
    handler: (req: NextRequest, context: any, user?: any) => Promise<NextResponse>
) {
    return middlewares.reduceRight(
        (acc, middleware) => middleware(acc),
        handler
    );
}
