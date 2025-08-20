/**
 * Fix Order PD-2025-058 - Update status and deliveryType
 */

import mongoose from 'mongoose'

// Database connection
const connectDB = async () => {
  try {
    if (mongoose.connection.readyState >= 1) {
      return
    }
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/prestige_designs', {
      serverSelectionTimeoutMS: 30000,
    })
    console.log(`🔗 MongoDB connected: ${conn.connection.host}`)
  } catch (error) {
    console.error('❌ Database connection error:', error.message)
    process.exit(1)
  }
}

// Order schema
const orderSchema = new mongoose.Schema(
  {
    orderNumber: String,
    customerId: String,
    orderStatus: String,
    paymentStatus: String,
    deliveryType: String,
    requiresCustomWork: Boolean,
    hasCustomizableProducts: Boolean,
    orderHistory: [
      {
        status: String,
        timestamp: Date,
        note: String,
        changedBy: String,
      },
    ],
    items: [
      {
        productName: String,
        EnableCustomizations: Boolean,
        hasCustomizations: Boolean,
        customizations: Object,
      },
    ],
  },
  {
    collection: 'orders',
    timestamps: true,
  }
)

const Order = mongoose.models.Order || mongoose.model('Order', orderSchema)

async function fixOrder() {
  await connectDB()

  console.log('🔧 Finding order PD-2025-058...')

  const order = await Order.findOne({ orderNumber: 'PD-2025-058' })

  if (!order) {
    console.log('❌ Order PD-2025-058 not found')
    return
  }

  console.log('📋 Current order state:', {
    orderNumber: order.orderNumber,
    orderStatus: order.orderStatus,
    paymentStatus: order.paymentStatus,
    deliveryType: order.deliveryType,
    requiresCustomWork: order.requiresCustomWork,
    hasCustomizableProducts: order.hasCustomizableProducts,
  })

  // Update the order
  order.orderStatus = 'processing'
  order.deliveryType = 'custom_work'
  order.requiresCustomWork = true

  // Add to order history
  order.orderHistory.push({
    status: 'processing',
    timestamp: new Date(),
    note: 'تم تحديث حالة الطلب إلى processing مع deliveryType: custom_work - تصحيح تلقائي',
    changedBy: 'system-fix',
  })

  await order.save()

  console.log('✅ Order PD-2025-058 fixed successfully:', {
    orderNumber: order.orderNumber,
    orderStatus: order.orderStatus,
    paymentStatus: order.paymentStatus,
    deliveryType: order.deliveryType,
    requiresCustomWork: order.requiresCustomWork,
    hasCustomizableProducts: order.hasCustomizableProducts,
  })

  mongoose.connection.close()
}

// Run the fix
fixOrder().catch(console.error)
