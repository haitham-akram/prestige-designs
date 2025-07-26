/**
 * Authentication Types
 * 
 * This file defines TypeScript types and interfaces for authentication
 * and authorization throughout the application.
 */

import { NextRequest, NextResponse } from 'next/server';

// User session type (extends the User model for session context)
export interface SessionUser {
    id: string;
    name: string;
    email: string;
    role: 'customer' | 'admin';
    avatar?: string;
    isEmailVerified: boolean;
}

// API Route context type
export interface ApiRouteContext {
    params?: Record<string, string | string[]>;
    searchParams?: Record<string, string | string[]>;
}

// Middleware handler types
export type ProtectedApiHandler = (
    req: NextRequest,
    context: ApiRouteContext,
    user: SessionUser
) => Promise<NextResponse>;

export type OptionalAuthApiHandler = (
    req: NextRequest,
    context: ApiRouteContext,
    user?: SessionUser
) => Promise<NextResponse>;

export type PublicApiHandler = (
    req: NextRequest,
    context: ApiRouteContext
) => Promise<NextResponse>;

// Middleware function types
export type AuthMiddleware = (handler: ProtectedApiHandler) => PublicApiHandler;
export type OptionalAuthMiddleware = (handler: OptionalAuthApiHandler) => PublicApiHandler;
export type RateLimitMiddleware = (
    maxRequests: number,
    windowMs: number,
    handler: PublicApiHandler
) => PublicApiHandler;

// Role types
export type UserRole = 'customer' | 'admin';
export type AllowedRoles = UserRole[];
