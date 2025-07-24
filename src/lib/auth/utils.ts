/**
 * Authentication Utilities
 * 
 * This file contains utility functions for authentication and export async function requireRole(
  requiredRole: 'customer' | 'admin'
) {horization.
 * It provides reusable functions for session management, user verification,
 * and role-based access control.
 * 
 * Features:
 * - Session validation utilities
 * - User authentication helpers
 * - Role-based authorization checks
 * - Token generation and validation
 * - Password utilities
 * - Email verification helpers
 */

import { getServerSession } from 'next-auth';
import { authOptions } from './config';
import jwt, { JwtPayload } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

/**
 * Get the current user session
 * @returns The user session or null if not authenticated
 */
export async function getCurrentUser() {
    try {
        const session = await getServerSession(authOptions);
        return session?.user || null;
    } catch (error) {
        console.error('Error getting current user:', error);
        return null;
    }
}

/**
 * Check if the current user is authenticated
 * @returns True if user is authenticated, false otherwise
 */
export async function isAuthenticated(): Promise<boolean> {
    const user = await getCurrentUser();
    return !!user;
}

/**
 * Check if the current user has a specific role
 * @param requiredRole - The role to check for
 * @returns True if user has the required role, false otherwise
 */
export async function hasRole(requiredRole: 'customer' | 'admin'): Promise<boolean> {
    const user = await getCurrentUser();
    return user?.role === requiredRole;
}

/**
 * Check if the current user has any of the specified roles
 * @param roles - Array of roles to check
 * @returns True if user has any of the specified roles
 */
export async function hasAnyRole(roles: ('customer' | 'admin')[]): Promise<boolean> {
    const user = await getCurrentUser();
    return user ? roles.includes(user.role) : false;
}/**
 * Check if the current user is an admin
 * @returns True if user is admin, false otherwise
 */
export async function isAdmin(): Promise<boolean> {
    return hasRole('admin');
}

/**
 * Check if the current user is a customer
 * @returns True if user is customer, false otherwise
 */
export async function isCustomer(): Promise<boolean> {
    return hasRole('customer');
}

/**
 * Require authentication for API routes
 * @param request - The NextRequest object
 * @returns User session or throws error if not authenticated
 */
export async function requireAuth() {
    const user = await getCurrentUser();

    if (!user) {
        throw new Error('Authentication required');
    }

    return user;
}

/**
 * Require specific role for API routes
 * @param requiredRole - The required role
 * @param request - The NextRequest object
 * @returns User session or throws error if not authorized
 */
export async function requireRole(
    requiredRole: 'customer' | 'seller' | 'admin'
) {
    const user = await requireAuth();

    if (user.role !== requiredRole) {
        throw new Error(`Role '${requiredRole}' required`);
    }

    return user;
}

/**
 * Require admin role for API routes
 * @param request - The NextRequest object
 * @returns User session or throws error if not admin
 */
export async function requireAdmin() {
    return requireRole('admin');
}

/**
 * Generate a JWT token
 * @param payload - The payload to encode
 * @param expiresIn - Token expiration time (default: 1h)
 * @returns The generated JWT token
 */
export function generateToken(payload: object, expiresIn: string = '1h'): string {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
        throw new Error('JWT_SECRET not configured');
    }

    // Use type assertion for compatibility
    return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
}

/**
 * Verify a JWT token
 * @param token - The token to verify
 * @returns The decoded payload or null if invalid
 */
export function verifyToken(token: string): JwtPayload | null {
    try {
        const secret = process.env.JWT_SECRET;

        if (!secret) {
            throw new Error('JWT_SECRET not configured');
        }

        const decoded = jwt.verify(token, secret);
        return typeof decoded === 'object' ? decoded : null;
    } catch (error) {
        console.error('Token verification error:', error);
        return null;
    }
}

/**
 * Hash a password
 * @param password - The password to hash
 * @returns The hashed password
 */
export async function hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
}

/**
 * Compare a password with its hash
 * @param password - The plain text password
 * @param hashedPassword - The hashed password
 * @returns True if passwords match, false otherwise
 */
export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
}

/**
 * Generate a random token for email verification or password reset
 * @param length - The length of the token (default: 32)
 * @returns A random token string
 */
export function generateRandomToken(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';

    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return result;
}

/**
 * Generate an email verification token
 * @returns An object with token and expiry date
 */
export function generateEmailVerificationToken() {
    const token = generateRandomToken(32);
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    return { token, expires };
}

/**
 * Generate a password reset token
 * @returns An object with token and expiry date
 */
export function generatePasswordResetToken() {
    const token = generateRandomToken(32);
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    return { token, expires };
}

/**
 * Check if a token has expired
 * @param expiryDate - The expiry date to check
 * @returns True if token has expired, false otherwise
 */
export function isTokenExpired(expiryDate: Date): boolean {
    return new Date() > expiryDate;
}

/**
 * Validate email format
 * @param email - The email to validate
 * @returns True if email is valid, false otherwise
 */
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate password strength
 * @param password - The password to validate
 * @returns Object with validation result and requirements
 */
export function validatePassword(password: string) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const isValid = password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers;

    return {
        isValid,
        requirements: {
            minLength: password.length >= minLength,
            hasUpperCase,
            hasLowerCase,
            hasNumbers,
            hasSpecialChar
        },
        strength: calculatePasswordStrength(password)
    };
}

/**
 * Calculate password strength score
 * @param password - The password to evaluate
 * @returns Strength score from 0-4 (weak to very strong)
 */
function calculatePasswordStrength(password: string): number {
    let score = 0;

    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;

    return Math.min(score, 4);
}
