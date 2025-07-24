/**
 * User Profile API Route
 * 
 * This file handles user profile operations including fetching and updating user data.
 * It provides secure access to user information with proper authentication.
 * 
 * Features:
 * - Get user profile information
 * - Update user profile data
 * - Seller profile management
 * - Avatar upload handling
 * - Preference management
 * - Authentication verification
 * - Input validation and sanitization
 * 
 * Route: /api/users/profile
 * Methods: GET, PUT, PATCH
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import User from '@/lib/db/models/User';
import { z } from 'zod';

// Validation schema for profile updates
const updateProfileSchema = z.object({
    name: z.string()
        .min(2, 'Name must be at least 2 characters')
        .max(50, 'Name cannot exceed 50 characters')
        .trim()
        .optional(),
    bio: z.string()
        .max(500, 'Bio cannot exceed 500 characters')
        .optional(),
    avatar: z.string().url('Invalid avatar URL').optional(),
    preferences: z.object({
        emailNotifications: z.boolean().optional(),
        marketingEmails: z.boolean().optional(),
        theme: z.enum(['light', 'dark', 'system']).optional()
    }).optional()
});

/**
 * GET /api/users/profile
 * Retrieves the current user's profile information
 */
export async function GET() {
    try {
        // Get session
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, message: 'Unauthorized. Please log in.' },
                { status: 401 }
            );
        }

        // Connect to database
        await connectDB();

        // Find user by ID
        const user = await User.findById(session.user.id).select('-password');

        if (!user) {
            return NextResponse.json(
                { success: false, message: 'User not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            user: user.toJSON()
        });

    } catch (error) {
        console.error('Profile fetch error:', error);
        return NextResponse.json(
            { success: false, message: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/users/profile
 * Updates the current user's profile information
 */
export async function PUT(request: NextRequest) {
    try {
        // Get session
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, message: 'Unauthorized. Please log in.' },
                { status: 401 }
            );
        }

        // Parse and validate request body
        const body = await request.json();
        const validatedData = updateProfileSchema.parse(body);

        // Connect to database
        await connectDB();

        // Find and update user
        const user = await User.findById(session.user.id);

        if (!user) {
            return NextResponse.json(
                { success: false, message: 'User not found' },
                { status: 404 }
            );
        }

        // Update user fields
        if (validatedData.name) user.name = validatedData.name;
        if (validatedData.bio !== undefined) user.bio = validatedData.bio;
        if (validatedData.avatar) user.avatar = validatedData.avatar;

        // Update preferences
        if (validatedData.preferences) {
            user.preferences = { ...user.preferences, ...validatedData.preferences };
        }        // Save updated user
        await user.save();

        return NextResponse.json({
            success: true,
            message: 'Profile updated successfully',
            user: user.toJSON()
        });

    } catch (error) {
        console.error('Profile update error:', error);

        // Handle validation errors
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Validation failed',
                    errors: error.issues.map((err: z.ZodIssue) => ({
                        field: err.path.join('.'),
                        message: err.message
                    }))
                },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { success: false, message: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/users/profile
 * Partially updates specific profile fields
 */
export async function PATCH(request: NextRequest) {
    try {
        // Get session
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, message: 'Unauthorized. Please log in.' },
                { status: 401 }
            );
        }

        // Parse request body
        const body = await request.json();
        const { field, value } = body;

        if (!field) {
            return NextResponse.json(
                { success: false, message: 'Field name is required' },
                { status: 400 }
            );
        }

        // Connect to database
        await connectDB();

        // Find user
        const user = await User.findById(session.user.id);

        if (!user) {
            return NextResponse.json(
                { success: false, message: 'User not found' },
                { status: 404 }
            );
        }

        // Update specific field
        switch (field) {
            case 'emailNotifications':
                user.preferences.emailNotifications = Boolean(value);
                break;
            case 'marketingEmails':
                user.preferences.marketingEmails = Boolean(value);
                break;
            case 'theme':
                if (['light', 'dark', 'system'].includes(value)) {
                    user.preferences.theme = value;
                } else {
                    return NextResponse.json(
                        { success: false, message: 'Invalid theme value' },
                        { status: 400 }
                    );
                }
                break;
            default:
                return NextResponse.json(
                    { success: false, message: `Field '${field}' cannot be updated via PATCH` },
                    { status: 400 }
                );
        }

        // Save updated user
        await user.save();

        return NextResponse.json({
            success: true,
            message: `${field} updated successfully`,
            user: user.toJSON()
        });

    } catch (error) {
        console.error('Profile patch error:', error);
        return NextResponse.json(
            { success: false, message: 'Internal server error' },
            { status: 500 }
        );
    }
}
