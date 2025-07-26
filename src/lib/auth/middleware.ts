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
import {
    SessionUser,
    ApiRouteContext,
    ProtectedApiHandler,
    OptionalAuthApiHandler,
    PublicApiHandler,
    AllowedRoles
} from './types';

/**
 * Authentication middleware for API routes
 * @param handler - The API route handler to protect
 * @returns Protected route handler
 */
export function withAuth(handler: ProtectedApiHandler): PublicApiHandler {
    return async (req: NextRequest, context: ApiRouteContext) => {
        try {
            const session = await getServerSession(authOptions);

            if (!session?.user) {
                return NextResponse.json(
                    { success: false, message: 'Authentication required' },
                    { status: 401 }
                );
            }

            return handler(req, context, session.user as SessionUser);
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
    roles: AllowedRoles,
    handler: ProtectedApiHandler
): PublicApiHandler {
    return withAuth(async (req: NextRequest, context: ApiRouteContext, user: SessionUser) => {
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
export function withAdmin(handler: ProtectedApiHandler): PublicApiHandler {
    return withRoles(['admin'], handler);
}

/**
 * Customer or Admin middleware (authenticated users)
 * @param handler - The API route handler to protect
 * @returns Protected route handler for customer/admin access
 */
export function withCustomerOrAdmin(handler: ProtectedApiHandler): PublicApiHandler {
    return withRoles(['customer', 'admin'], handler);
}

/**
 * Customer-only middleware
 * @param handler - The API route handler to protect
 * @returns Protected route handler for customers only
 */
export function withCustomer(handler: ProtectedApiHandler): PublicApiHandler {
    return withRoles(['customer'], handler);
}

/**
 * Optional authentication middleware
 * Provides user context if authenticated, but doesn't require it
 * @param handler - The API route handler
 * @returns Route handler with optional user context
 */
export function withOptionalAuth(handler: OptionalAuthApiHandler): PublicApiHandler {
    return async (req: NextRequest, context: ApiRouteContext) => {
        try {
            const session = await getServerSession(authOptions);
            return handler(req, context, session?.user as SessionUser || undefined);
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
    handler: PublicApiHandler
): PublicApiHandler {
    const requests = new Map<string, { count: number; resetTime: number }>();

    return async (req: NextRequest, context: ApiRouteContext) => {
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
    middlewares: Array<(handler: PublicApiHandler) => PublicApiHandler>,
    handler: OptionalAuthApiHandler
): PublicApiHandler {
    return middlewares.reduceRight(
        (acc, middleware) => middleware(acc),
        handler as PublicApiHandler
    );
}
