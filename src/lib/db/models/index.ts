/**
 * Database Models Index
 * 
 * This file exports all database models for easy importing.
 * It provides a centralized location for all Mongoose models
 * used throughout the application.
 * 
 * Features:
 * - Centralized model exports
 * - Easy model importing
 * - Type-safe model access
 * - Future model additions
 */

// Export all database models
export { default as User } from './User';

// Type exports for better TypeScript support
export type { IUser } from './User';

// Re-export commonly used Mongoose types
export type { Document, Schema, Model } from 'mongoose';
