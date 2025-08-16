import { MetadataRoute } from 'next'
import dbConnect from '@/lib/db/connection'
import { Category, Product } from '@/lib/db/models'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    await dbConnect()

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://yourdomain.com'

    // Static pages
    const staticPages = [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'daily' as const,
            priority: 1,
        },
        {
            url: `${baseUrl}/auth/signin`,
            lastModified: new Date(),
            changeFrequency: 'monthly' as const,
            priority: 0.8,
        },
        {
            url: `${baseUrl}/auth/signup`,
            lastModified: new Date(),
            changeFrequency: 'monthly' as const,
            priority: 0.8,
        }
    ]

    // Get all categories
    const categories = await Category.find({ isActive: true }).select('slug updatedAt')
    const categoryPages = categories.map((category) => ({
        url: `${baseUrl}/categories/${category.slug}`,
        lastModified: new Date(category.updatedAt),
        changeFrequency: 'weekly' as const,
        priority: 0.9,
    }))

    // Get all products
    const products = await Product.find({ isActive: true }).select('slug updatedAt')
    const productPages = products.map((product) => ({
        url: `${baseUrl}/products/${product.slug}`,
        lastModified: new Date(product.updatedAt),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
    }))

    return [...staticPages, ...categoryPages, ...productPages]
}
