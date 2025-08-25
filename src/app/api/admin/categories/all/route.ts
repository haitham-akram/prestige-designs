/**
 * GET /api/admin/categories/all
 * Returns all categories without pagination (for select inputs, etc.)
 * Admin-only access
 */
import { NextRequest, NextResponse } from 'next/server';
import { withAdmin } from '@/lib/auth/middleware';
import connectDB from '@/lib/db/connection';
import { Category } from '@/lib/db/models';

async function getAllCategories(_req: NextRequest) {
    try {
        await connectDB();
        const categories = await Category.find({}).sort({ order: 1, name: 1 });
        return NextResponse.json({
            success: true,
            data: categories
        });
    } catch (error) {
        console.error('Get all categories error:', error);
        return NextResponse.json({
            success: false,
            message: 'Failed to fetch categories'
        }, { status: 500 });
    }
}

export const GET = withAdmin(getAllCategories);
