/**
 * Product Utilities
 * 
 * This file contains utility functions for product-related operations.
 * These functions can be reused across the application for consistency.
 * 
 * Features:
 * - Slug generation and validation
 * - Price calculations
 * - Image management
 * - Validation helpers
 * - SEO utilities
 * - Color theme management
 */

import { IProduct, IProductImage, IColorTheme } from '@/lib/db/models/Product';

/**
 * Generate a URL-friendly slug from a string
 * @param text - The text to convert to a slug
 * @returns A URL-friendly slug
 */
export function generateSlug(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
        .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Calculate final price based on base price and discount
 * @param price - Base price
 * @param discountAmount - Discount amount (optional)
 * @param discountPercentage - Discount percentage (optional)
 * @returns Final price after discount
 */
export function calculateFinalPrice(
    price: number,
    discountAmount?: number,
    discountPercentage?: number
): number {
    if (!price || price <= 0) return 0;

    let finalPrice = price;

    // Apply amount discount first
    if (discountAmount && discountAmount > 0) {
        finalPrice -= discountAmount;
    }

    // Apply percentage discount to the remaining price
    if (discountPercentage && discountPercentage > 0) {
        finalPrice -= (finalPrice * discountPercentage) / 100;
    }

    return Math.max(0, finalPrice);
}

/**
 * Calculate discount percentage from discount amount
 * @param price - Base price
 * @param discountAmount - Discount amount
 * @returns Discount percentage
 */
export function calculateDiscountPercentage(price: number, discountAmount: number): number {
    if (!price || price <= 0 || !discountAmount || discountAmount <= 0) return 0;
    return Math.round((discountAmount / price) * 100);
}

/**
 * Check if a product is on sale
 * @param product - Product object
 * @returns True if product has any discount
 */
export function isProductOnSale(product: IProduct): boolean {
    return !!(
        (product.discountAmount && product.discountAmount > 0) ||
        (product.discountPercentage && product.discountPercentage > 0)
    );
}

/**
 * Get the primary image from a product's image array
 * @param images - Array of product images
 * @returns Primary image or first image if no primary is set
 */
export function getPrimaryImage(images: IProductImage[]): IProductImage | null {
    if (!images || images.length === 0) return null;

    const primary = images.find(img => img.isPrimary);
    return primary || images[0];
}

/**
 * Get primary image URL from a product
 * @param product - Product object
 * @returns Primary image URL or null
 */
export function getPrimaryImageUrl(product: IProduct): string | null {
    const primaryImage = getPrimaryImage(product.images);
    return primaryImage?.url || null;
}

/**
 * Validate hex color code
 * @param hex - Hex color code to validate
 * @returns True if valid hex color
 */
export function isValidHexColor(hex: string): boolean {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex);
}

/**
 * Validate image URL
 * @param url - Image URL to validate
 * @returns True if valid image URL
 */
export function isValidImageUrl(url: string): boolean {
    return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url);
}

/**
 * Validate YouTube URL
 * @param url - YouTube URL to validate
 * @returns True if valid YouTube URL
 */
export function isValidYouTubeUrl(url: string): boolean {
    return /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/).+/.test(url);
}

/**
 * Extract YouTube video ID from URL
 * @param url - YouTube URL
 * @returns YouTube video ID or null
 */
export function extractYouTubeVideoId(url: string): string | null {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
        /youtube\.com\/embed\/([^&\n?#]+)/,
        /youtube\.com\/v\/([^&\n?#]+)/
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }

    return null;
}

/**
 * Generate YouTube embed URL from video ID
 * @param videoId - YouTube video ID
 * @returns YouTube embed URL
 */
export function generateYouTubeEmbedUrl(videoId: string): string {
    return `https://www.youtube.com/embed/${videoId}`;
}

/**
 * Format price for display
 * @param price - Price to format
 * @param currency - Currency code (default: USD)
 * @returns Formatted price string
 */
export function formatPrice(price: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
    }).format(price);
}

/**
 * Format discount percentage for display
 * @param percentage - Discount percentage
 * @returns Formatted percentage string
 */
export function formatDiscountPercentage(percentage: number): string {
    return `${Math.round(percentage)}%`;
}

/**
 * Validate color theme object
 * @param colorTheme - Color theme to validate
 * @returns True if valid color theme
 */
export function isValidColorTheme(colorTheme: IColorTheme): boolean {
    return !!(
        colorTheme.name &&
        colorTheme.name.trim().length > 0 &&
        colorTheme.name.length <= 50 &&
        isValidHexColor(colorTheme.hex) &&
        (!colorTheme.description || colorTheme.description.length <= 100)
    );
}

/**
 * Validate product image object
 * @param image - Product image to validate
 * @returns True if valid product image
 */
export function isValidProductImage(image: IProductImage): boolean {
    return !!(
        image.url &&
        isValidImageUrl(image.url) &&
        image.order >= 0 &&
        (!image.alt || image.alt.length <= 200)
    );
}

/**
 * Sort product images by order
 * @param images - Array of product images
 * @returns Sorted array of images
 */
export function sortProductImages(images: IProductImage[]): IProductImage[] {
    return [...images].sort((a, b) => a.order - b.order);
}

/**
 * Get sorted product images with primary image first
 * @param images - Array of product images
 * @returns Sorted array with primary image first
 */
export function getSortedProductImages(images: IProductImage[]): IProductImage[] {
    const sorted = sortProductImages(images);
    const primaryIndex = sorted.findIndex(img => img.isPrimary);

    if (primaryIndex > 0) {
        // Move primary image to first position
        const primary = sorted.splice(primaryIndex, 1)[0];
        sorted.unshift(primary);
    }

    return sorted;
}

/**
 * Generate product URL path
 * @param slug - Product slug
 * @returns Product URL path
 */
export function generateProductUrl(slug: string): string {
    return `/products/${slug}`;
}

/**
 * Generate category URL path
 * @param slug - Category slug
 * @returns Category URL path
 */
export function generateCategoryUrl(slug: string): string {
    return `/categories/${slug}`;
}

/**
 * Calculate average rating from reviews
 * @param ratings - Array of rating numbers
 * @returns Average rating
 */
export function calculateAverageRating(ratings: number[]): number {
    if (!ratings || ratings.length === 0) return 0;

    const sum = ratings.reduce((acc, rating) => acc + rating, 0);
    return Math.round((sum / ratings.length) * 10) / 10; // Round to 1 decimal place
}

/**
 * Format rating for display
 * @param rating - Rating number
 * @returns Formatted rating string
 */
export function formatRating(rating: number): string {
    return rating.toFixed(1);
}

/**
 * Generate rating stars HTML (for display purposes)
 * @param rating - Rating number (0-5)
 * @param maxStars - Maximum number of stars (default: 5)
 * @returns HTML string for rating stars
 */
export function generateRatingStars(rating: number, maxStars: number = 5): string {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = maxStars - fullStars - (hasHalfStar ? 1 : 0);

    let stars = '';

    // Full stars
    for (let i = 0; i < fullStars; i++) {
        stars += '★';
    }

    // Half star
    if (hasHalfStar) {
        stars += '☆';
    }

    // Empty stars
    for (let i = 0; i < emptyStars; i++) {
        stars += '☆';
    }

    return stars;
}

/**
 * Validate product data before saving
 * @param productData - Product data to validate
 * @returns Validation result with errors if any
 */
export function validateProductData(productData: Partial<IProduct>): {
    isValid: boolean;
    errors: string[];
} {
    const errors: string[] = [];

    // Required fields
    if (!productData.name || productData.name.trim().length < 2) {
        errors.push('Product name must be at least 2 characters');
    }

    if (!productData.price || productData.price < 0) {
        errors.push('Product price must be a positive number');
    }

    if (!productData.categoryId) {
        errors.push('Product category is required');
    }

    // Images validation
    if (!productData.images || productData.images.length === 0) {
        errors.push('At least one product image is required');
    } else {
        productData.images.forEach((image, index) => {
            if (!isValidProductImage(image)) {
                errors.push(`Invalid image at index ${index}`);
            }
        });
    }

    // Color themes validation
    if (productData.colors) {
        productData.colors.forEach((color, index) => {
            if (!isValidColorTheme(color)) {
                errors.push(`Invalid color theme at index ${index}`);
            }
        });
    }

    // YouTube link validation
    if (productData.youtubeLink && !isValidYouTubeUrl(productData.youtubeLink)) {
        errors.push('Invalid YouTube URL');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Sanitize product data for API response
 * @param product - Product object
 * @returns Sanitized product data
 */
export function sanitizeProductForResponse(product: IProduct): Partial<IProduct> {
    return {
        _id: product._id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        images: product.images,
        youtubeLink: product.youtubeLink,
        EnableCustomizations: product.EnableCustomizations,
        allowColorChanges: product.allowColorChanges,
        allowTextEditing: product.allowTextEditing,
        allowImageReplacement: product.allowImageReplacement,
        allowLogoUpload: product.allowLogoUpload,
        colors: product.colors,
        categoryId: product.categoryId,
        tags: product.tags,
        price: product.price,
        discountAmount: product.discountAmount,
        discountPercentage: product.discountPercentage,
        finalPrice: product.finalPrice,
        isActive: product.isActive,
        isFeatured: product.isFeatured,
        rating: product.rating,
        reviewCount: product.reviewCount,
        purchaseCount: product.purchaseCount,

        createdAt: product.createdAt,
        updatedAt: product.updatedAt
    };
} 