/**
 * NextAuth API Route Handler
 * 
 * This file serves as the main entry point for all NextAuth.js authentication requests.
 * It handles all authentication-related API calls including sign-in, sign-out, 
 * callbacks, and session management.
 * 
 * Features:
 * - Handles all OAuth flows (Google, Twitter)
 * - Processes credentials-based authentication
 * - Manages session lifecycle
 * - Handles authentication callbacks
 * - Provides CSRF protection
 * 
 * Route: /api/auth/[...nextauth]
 * Methods: GET, POST (automatically handled by NextAuth)
 */

import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth/config';

/**
 * NextAuth handler for all authentication routes
 * This handles:
 * - /api/auth/signin - Sign in page and processing
 * - /api/auth/signout - Sign out processing
 * - /api/auth/callback/[provider] - OAuth callbacks
 * - /api/auth/session - Session information
 * - /api/auth/csrf - CSRF token
 * - /api/auth/providers - Available providers
 */
const handler = NextAuth(authOptions);

// Export handler for both GET and POST requests
export { handler as GET, handler as POST };
