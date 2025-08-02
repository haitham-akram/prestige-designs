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
export { default as Category } from './Category';
export { default as Product } from './Product';
export { default as DesignFile } from './DesignFile';
export { default as OrderDesignFile } from './OrderDesignFile';
export { default as PromoCode } from './PromoCode';
export { default as Order } from './Order';
export { default as Review } from './Review';

// Type exports for better TypeScript support
export type { IUser } from './User';
export type { ICategory } from './Category';
export type { IProduct } from './Product';
export type { IDesignFile } from './DesignFile';
export type { IOrderDesignFile } from './OrderDesignFile';
export type { IPromoCode } from './PromoCode';
export type { IOrder } from './Order';
export type { IReview } from './Review';

// Re-export commonly used Mongoose types
export type { Document, Schema, Model } from 'mongoose';
