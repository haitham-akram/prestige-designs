/**
 * NextAuth Configuration
 * 
 * This file configures NextAuth.js for authentication handling.
 * It sets up multiple authentication providers and manages user sessions.
 * 
 * Features:
 * - Google OAuth integration
 * - Twitter OAuth integration
 * - Credentials provider for email/password login
 * - MongoDB adapter for session storage
 * - Custom sign-in and sign-up callbacks
 * - JWT and session management
 * - User profile synchronization
 * 
 * Providers Supported:
 * - Google (OAuth 2.0)
 * - Twitter (OAuth 1.0a & 2.0)
 * - Email/Password (Credentials)
 */

import NextAuth, { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import TwitterProvider from 'next-auth/providers/twitter';
import CredentialsProvider from 'next-auth/providers/credentials';
import { MongoDBAdapter } from '@next-auth/mongodb-adapter';
import { MongoClient } from 'mongodb';
import connectDB from '@/lib/db/connection';
import User from '@/lib/db/models/User';

// MongoDB client for NextAuth adapter
const client = new MongoClient(process.env.MONGODB_URI!);
const clientPromise = client.connect();

// Extend NextAuth types
declare module 'next-auth' {
    interface Session {
        user: {
            id: string;
            email: string;
            name: string;
            image?: string;
            role: 'customer' | 'admin';
            isEmailVerified: boolean;
        };
    }

    interface User {
        id: string;
        email: string;
        name: string;
        image?: string;
        role: 'customer' | 'admin';
        isEmailVerified: boolean;
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        id: string;
        role: 'customer' | 'admin';
        isEmailVerified: boolean;
    }
} export const authOptions: NextAuthOptions = {
    // MongoDB adapter for storing sessions and users
    adapter: MongoDBAdapter(clientPromise),

    // Authentication providers
    providers: [
        // Google OAuth Provider
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            authorization: {
                params: {
                    scope: 'openid email profile',
                    prompt: 'consent',
                    access_type: 'offline',
                    response_type: 'code'
                }
            }
        }),

        // Twitter OAuth Provider
        TwitterProvider({
            clientId: process.env.TWITTER_CLIENT_ID!,
            clientSecret: process.env.TWITTER_CLIENT_SECRET!,
            version: '2.0' // Use Twitter API v2
        }),

        // Email/Password Credentials Provider
        CredentialsProvider({
            id: 'credentials',
            name: 'Email and Password',
            credentials: {
                email: {
                    label: 'Email',
                    type: 'email',
                    placeholder: 'your-email@example.com'
                },
                password: {
                    label: 'Password',
                    type: 'password'
                }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error('Email and password required');
                }

                try {
                    await connectDB();

                    // Find user with password field included
                    const user = await User.findOne({
                        email: credentials.email
                    }).select('+password');

                    if (!user || !user.password) {
                        throw new Error('Invalid email or password');
                    }

                    // Check password
                    const isValidPassword = await user.comparePassword(credentials.password);

                    if (!isValidPassword) {
                        throw new Error('Invalid email or password');
                    }

                    // Update last login
                    user.lastLoginAt = new Date();
                    await user.save();

                    return {
                        id: user._id.toString(),
                        email: user.email,
                        name: user.name,
                        image: user.avatar,
                        role: user.role,
                        isEmailVerified: user.isEmailVerified
                    };
                } catch (error) {
                    console.error('Auth error:', error);
                    throw new Error('Authentication failed');
                }
            }
        })
    ],

    // Session configuration
    session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60, // 30 days
        updateAge: 24 * 60 * 60 // 24 hours
    },

    // JWT configuration
    jwt: {
        maxAge: 30 * 24 * 60 * 60 // 30 days
    },

    // Custom pages
    pages: {
        signIn: '/auth/signin',
        error: '/auth/error',
        verifyRequest: '/auth/verify-request'
    },

    // Callbacks
    callbacks: {
        // Sign in callback
        async signIn({ user, account }) {
            try {
                await connectDB();

                if (account?.provider === 'google' || account?.provider === 'twitter') {
                    // Check if user exists
                    const existingUser = await User.findOne({ email: user.email });

                    if (!existingUser) {
                        // Create new user for social login
                        const newUser = new User({
                            name: user.name,
                            email: user.email,
                            avatar: user.image,
                            isEmailVerified: true, // Social accounts are pre-verified
                            googleId: account.provider === 'google' ? account.providerAccountId : undefined,
                            twitterId: account.provider === 'twitter' ? account.providerAccountId : undefined,
                            lastLoginAt: new Date()
                        });

                        await newUser.save();
                        console.log(`✅ New ${account.provider} user created:`, user.email);
                    } else {
                        // Update existing user with social ID if not set
                        if (account.provider === 'google' && !existingUser.googleId) {
                            existingUser.googleId = account.providerAccountId;
                        }
                        if (account.provider === 'twitter' && !existingUser.twitterId) {
                            existingUser.twitterId = account.providerAccountId;
                        }

                        existingUser.lastLoginAt = new Date();
                        await existingUser.save();
                    }
                }

                return true;
            } catch (error) {
                console.error('Sign in error:', error);
                return false;
            }
        },

        // JWT callback
        async jwt({ token, user, trigger, session }) {
            if (user) {
                token.id = user.id;
                token.role = user.role;
                token.isEmailVerified = user.isEmailVerified;
            }            // Update token when session is updated
            if (trigger === 'update' && session) {
                token.name = session.name;
                token.email = session.email;
            }

            return token;
        },

        // Session callback
        async session({ session, token }) {
            if (token) {
                session.user.id = token.id;
                session.user.role = token.role;
                session.user.isEmailVerified = token.isEmailVerified;
            } return session;
        }
    },

    // Events
    events: {
        async signIn({ user, account }) {
            console.log(`✅ User signed in: ${user.email} via ${account?.provider || 'credentials'}`);
        },
        async signOut({ session }) {
            console.log(`👋 User signed out: ${session?.user?.email}`);
        },
        async createUser({ user }) {
            console.log(`🆕 New user created: ${user.email}`);
        }
    },

    // Enable debug messages in development
    debug: process.env.NODE_ENV === 'development'
};

export default NextAuth(authOptions);
