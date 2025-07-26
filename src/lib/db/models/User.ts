/**
 * User Model Schema
 * 
 * This file defines the User model schema for MongoDB using Mongoose.
 * It contains all user-related data structure and validations.
 * 
 * Features:
 * - User authentication fields (email, password)
 * - Social media login support (Google, Twitter)
 * - Profile information (name, avatar, bio)
 * - Account management (verification, roles, timestamps)
 * - Store-specific fields (seller profile, preferences)
 * - Secure password handling with bcrypt
 * - Email verification system
 * - User roles (customer, seller, admin)
 */

import mongoose, { Document, Schema, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

// Interface for User document
export interface IUser extends Document {
    _id: string;
    name: string;
    email: string;
    password?: string;
    avatar?: string;
    bio?: string;
    role: 'customer' | 'admin';
    isEmailVerified: boolean;
    emailVerificationToken?: string;
    resetPasswordToken?: string;
    resetPasswordExpires?: Date;

    // Social media login fields
    googleId?: string;
    twitterId?: string;

    // Preferences
    preferences: {
        emailNotifications: boolean;
        marketingEmails: boolean;
        theme: 'light' | 'dark' | 'system';
    };

    // Timestamps
    lastLoginAt?: Date;
    createdAt: Date;
    updatedAt: Date;

    // Methods
    comparePassword(candidatePassword: string): Promise<boolean>;
    generatePasswordResetToken(): string;
}

// User Schema definition
const UserSchema = new Schema<IUser>({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        maxlength: [50, 'Name cannot exceed 50 characters']
    },

    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [
            /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
            'Please enter a valid email address'
        ]
    },

    password: {
        type: String,
        minlength: [6, 'Password must be at least 6 characters'],
        select: false // Don't include password in queries by default
    },

    avatar: {
        type: String,
        default: ''
    },

    bio: {
        type: String,
        maxlength: [500, 'Bio cannot exceed 500 characters'],
        default: ''
    },

    role: {
        type: String,
        enum: ['customer', 'admin'],
        default: 'customer'
    },

    isEmailVerified: {
        type: Boolean,
        default: false
    },

    emailVerificationToken: String,
    resetPasswordToken: String,
    resetPasswordExpires: Date,

    // Social media login IDs
    googleId: String,
    twitterId: String,

    preferences: {
        emailNotifications: {
            type: Boolean,
            default: true
        },
        marketingEmails: {
            type: Boolean,
            default: false
        },
        theme: {
            type: String,
            enum: ['light', 'dark', 'system'],
            default: 'system'
        }
    },

    lastLoginAt: Date
}, {
    timestamps: true, // Automatically adds createdAt and updatedAt
    toJSON: {
        transform: function (doc, ret: Record<string, unknown>) {
            delete ret.password;
            delete ret.emailVerificationToken;
            delete ret.resetPasswordToken;
            delete ret.resetPasswordExpires;
            return ret;
        }
    }
});

// Index for better query performance
// Note: email index is automatically created by unique: true in schema
UserSchema.index({ googleId: 1 });
UserSchema.index({ twitterId: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ createdAt: -1 });

// Hash password before saving
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    if (this.password) {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
    }

    next();
});

// Compare password method
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
    if (!this.password) return false;
    return bcrypt.compare(candidatePassword, this.password);
};

// Generate password reset token
UserSchema.methods.generatePasswordResetToken = function (): string {
    const resetToken = Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);

    this.resetPasswordToken = bcrypt.hashSync(resetToken, 10);
    this.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    return resetToken;
};

// Prevent recompilation in development
const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
