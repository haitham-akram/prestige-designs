/**
 * User Registration API Route
 * 
 * This file handles user registration for the design store.
 * It creates new user accounts with email/password authentication.
 * 
 * Features:
 * - User registration with email validation
 * - Password hashing and security
 * - Duplicate email prevention
 * - Email verification token generation
 * - Input validation and sanitization
 * - Error handling and response formatting
 * 
 * Route: /api/users/register
 * Method: POST
 * Body: { name, email, password, role? }
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import User from '@/lib/db/models/User';
import { z, ZodError } from 'zod';

// Validation schema for registration
const registerSchema = z.object({
    name: z.string()
        .min(2, 'Name must be at least 2 characters')
        .max(50, 'Name cannot exceed 50 characters')
        .trim(),
    email: z.string()
        .email('Invalid email address')
        .toLowerCase()
        .trim(),
    password: z.string()
        .min(6, 'Password must be at least 6 characters')
        .max(100, 'Password cannot exceed 100 characters'),
    role: z.enum(['customer', 'admin']).optional().default('customer')
});

/**
 * POST /api/users/register
 * Creates a new user account
 */
export async function POST(request: NextRequest) {
    try {
        // Connect to database
        await connectDB();

        // Parse and validate request body
        const body = await request.json();
        const validatedData = registerSchema.parse(body);

        const { name, email, password, role } = validatedData;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'User with this email already exists'
                },
                { status: 400 }
            );
        }

        // Generate email verification token
        const emailVerificationToken = Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15);

        // Create new user
        const newUser = new User({
            name,
            email,
            password,
            role,
            emailVerificationToken,
            isEmailVerified: false
        });

        // Save user to database
        await newUser.save();

        // Remove password from response
        const userResponse = newUser.toJSON();

        // TODO: Send verification email
        // await sendVerificationEmail(email, emailVerificationToken);

        return NextResponse.json(
            {
                success: true,
                message: 'User registered successfully. Please check your email to verify your account.',
                user: userResponse
            },
            { status: 201 }
        );

    } catch (error) {
        console.error('Registration error:', error);

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

        // Handle MongoDB duplicate key error
        if (error instanceof Error && error.message.includes('duplicate key')) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'User with this email already exists'
                },
                { status: 400 }
            );
        }

        return NextResponse.json(
            {
                success: false,
                message: 'Internal server error. Please try again later.'
            },
            { status: 500 }
        );
    }
}

/**
 * GET /api/users/register
 * Returns registration form requirements and validation rules
 */
export async function GET() {
    return NextResponse.json({
        success: true,
        requirements: {
            name: {
                minLength: 2,
                maxLength: 50,
                required: true
            },
            email: {
                format: 'email',
                required: true
            },
            password: {
                minLength: 6,
                maxLength: 100,
                required: true
            },
            role: {
                options: ['customer', 'admin'],
                default: 'customer',
                required: false
            }
        },
        message: 'User registration endpoint. POST to create account.'
    });
}
