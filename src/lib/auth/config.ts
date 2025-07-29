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
import DiscordProvider from 'next-auth/providers/discord';
import CredentialsProvider from 'next-auth/providers/credentials';
// import { MongoDBAdapter } from '@next-auth/mongodb-adapter';
// import { MongoClient } from 'mongodb';
import connectDB from '@/lib/db/connection';
import User from '@/lib/db/models/User';

// MongoDB client for NextAuth adapter (currently disabled)
// const client = new MongoClient(process.env.MONGODB_URI!);
// const clientPromise = client.connect();

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
    // Use JWT strategy instead of database sessions for better OAuth compatibility
    // adapter: MongoDBAdapter(clientPromise), // Commented out to use JWT strategy

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

        // Twitter OAuth Provider (v1.0A for email access)
        TwitterProvider({
            clientId: process.env.TWITTER_API_KEY!,
            clientSecret: process.env.TWITTER_API_SECRET!,
            version: '1.0A',
            profile(profile) {
                return {
                    id: profile.id_str,
                    name: profile.name,
                    email: profile.email || null,
                    image: profile.profile_image_url_https?.replace('_normal', '_400x400') || null,
                    role: 'customer' as const,
                    isEmailVerified: !!profile.email
                }
            }
        }),

        // Discord OAuth Provider
        DiscordProvider({
            clientId: process.env.DISCORD_CLIENT_ID!,
            clientSecret: process.env.DISCORD_CLIENT_SECRET!,
            authorization: {
                params: {
                    scope: 'identify email',
                }
            }
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

                // Debug: Log user and account data
                console.log('🔍 SignIn Debug - User:', JSON.stringify(user, null, 2));
                console.log('🔍 SignIn Debug - Account:', JSON.stringify(account, null, 2));

                if (account?.provider === 'google' || account?.provider === 'twitter' || account?.provider === 'discord') {
                    // Handle Twitter OAuth - email might not be provided
                    let userEmail = user.email;
                    if (account.provider === 'twitter' && !userEmail) {
                        // Generate a fallback email for Twitter users without email
                        userEmail = `twitter_${account.providerAccountId}@prestige-designs.local`;
                        console.log('🐦 Twitter user without email, using fallback:', userEmail);
                    }

                    // Find existing user by email or social ID
                    let existingUser = null;
                    if (userEmail) {
                        existingUser = await User.findOne({ email: userEmail });
                    }

                    // Also check by social ID if email lookup failed
                    if (!existingUser) {
                        if (account.provider === 'google') {
                            existingUser = await User.findOne({ googleId: account.providerAccountId });
                        } else if (account.provider === 'twitter') {
                            existingUser = await User.findOne({ twitterId: account.providerAccountId });
                        } else if (account.provider === 'discord') {
                            existingUser = await User.findOne({ discordId: account.providerAccountId });
                        }
                    }

                    if (!existingUser) {
                        // Create new user for social login
                        const newUser = new User({
                            name: user.name || 'Social User',
                            email: userEmail,
                            avatar: user.image,
                            isEmailVerified: account.provider === 'google' || account.provider === 'discord' || account.provider === 'twitter', // Google and Discord emails are verified
                            googleId: account.provider === 'google' ? account.providerAccountId : undefined,
                            twitterId: account.provider === 'twitter' ? account.providerAccountId : undefined,
                            discordId: account.provider === 'discord' ? account.providerAccountId : undefined,
                            lastLoginAt: new Date()
                        });

                        await newUser.save();
                        console.log(`✅ New ${account.provider} user created:`, userEmail);
                    } else {
                        // Update existing user with social ID if not set
                        if (account.provider === 'google' && !existingUser.googleId) {
                            existingUser.googleId = account.providerAccountId;
                        }
                        if (account.provider === 'twitter' && !existingUser.twitterId) {
                            existingUser.twitterId = account.providerAccountId;
                        }
                        if (account.provider === 'discord' && !existingUser.discordId) {
                            existingUser.discordId = account.providerAccountId;
                        }

                        existingUser.lastLoginAt = new Date();
                        await existingUser.save();
                        console.log(`✅ Updated ${account.provider} user:`, existingUser.email);
                    }
                }

                return true;
            } catch (error) {
                console.error('Sign in error:', error);
                return false;
            }
        },

        // JWT callback
        async jwt({ token, user, trigger, session, account }) {
            // When user signs in, populate token with user data
            if (user) {
                token.id = user.id;
                token.role = user.role || 'customer';
                token.isEmailVerified = user.isEmailVerified || false;
                console.log('📋 Initial token from user:', {
                    isEmailVerified: token.isEmailVerified,
                    role: token.role
                });
            }

            // For social login or when we need to sync with database
            if (token.email && (!token.role || account?.provider === 'google' || account?.provider === 'twitter' || account?.provider === 'discord')) {
                try {
                    await connectDB();
                    const dbUser = await User.findOne({ email: token.email });
                    if (dbUser) {
                        // Use database user data instead of provider data
                        token.id = dbUser._id.toString();
                        token.role = dbUser.role;
                        token.isEmailVerified = dbUser.isEmailVerified;
                        token.name = dbUser.name;
                        token.picture = dbUser.avatar; // Sync avatar to picture for consistency
                        console.log('✅ Synced token with database:', {
                            isEmailVerified: token.isEmailVerified,
                            role: token.role,
                            provider: account?.provider
                        });
                    } else {
                        console.log('❌ No database user found for:', token.email);
                    }
                } catch (error) {
                    console.error('Error fetching user in JWT callback:', error);
                }
            }

            // Update token when session is updated
            if (trigger === 'update' && session) {
                token.name = session.name;
                token.email = session.email;
            }

            return token;
        },

        // Session callback
        async session({ session, token }) {
            if (token) {
                session.user.id = token.id as string;
                session.user.role = (token.role as 'customer' | 'admin') || 'customer';
                session.user.isEmailVerified = (token.isEmailVerified as boolean) || false;
                session.user.name = token.name as string;
                session.user.email = token.email as string;
                // Use picture from token if available, otherwise keep existing image
                if (token.picture) {
                    session.user.image = token.picture as string;
                }
            }

            return session;
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
