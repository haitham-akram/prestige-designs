import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db/connection'
import { User } from '@/lib/db/models'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
    try {
        // Security check - only allow in development or with special header
        const authHeader = request.headers.get('x-admin-setup-key')
        const isDevelopment = process.env.NODE_ENV === 'development'
        const isAuthorized = authHeader === process.env.ADMIN_SETUP_KEY || isDevelopment

        if (!isAuthorized) {
            return NextResponse.json(
                { error: 'Unauthorized - Invalid setup key' },
                { status: 401 }
            )
        }

        await dbConnect()

        // Check if admin user already exists
        const existingAdmin = await User.findOne({
            email: 'vip.nasser2021@gmail.com'
        })

        if (existingAdmin) {
            // Update role to admin if not already
            if (existingAdmin.role !== 'admin') {
                existingAdmin.role = 'admin'
                existingAdmin.isActive = true
                await existingAdmin.save()

                return NextResponse.json({
                    message: 'Existing user updated to admin role',
                    user: {
                        id: existingAdmin._id,
                        email: existingAdmin.email,
                        role: existingAdmin.role,
                        isActive: existingAdmin.isActive
                    }
                })
            }

            return NextResponse.json({
                message: 'Admin user already exists',
                user: {
                    id: existingAdmin._id,
                    email: existingAdmin.email,
                    role: existingAdmin.role,
                    isActive: existingAdmin.isActive
                }
            })
        }

        // Create new admin user
        const hashedPassword = await bcrypt.hash('AdminPrestige2025!', 12)

        const adminUser = new User({
            email: 'vip.nasser2021@gmail.com',
            name: 'Admin User',
            role: 'admin',
            isActive: true,
            password: hashedPassword,
            emailVerified: new Date(),
            provider: 'credentials'
        })

        await adminUser.save()

        return NextResponse.json({
            message: 'Admin user created successfully',
            user: {
                id: adminUser._id,
                email: adminUser.email,
                role: adminUser.role,
                isActive: adminUser.isActive
            },
            credentials: {
                email: 'vip.nasser2021@gmail.com',
                password: 'AdminPrestige2025!'
            },
            warning: 'Please change the password after first login!'
        })

    } catch (error) {
        console.error('Error creating admin user:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        return NextResponse.json(
            { error: 'Failed to create admin user', details: errorMessage },
            { status: 500 }
        )
    }
}

export async function GET() {
    return NextResponse.json({
        message: 'Admin setup endpoint',
        instructions: 'Send POST request with x-admin-setup-key header to create admin user'
    })
}
