/**
 * Test script for free order completion functionality
 * This script tests the OrderDesignFile creation for free orders
 */

require('dotenv').config({ path: '.env.local' })
const mongoose = require('mongoose')

// Import models directly
const connectDB = require('./src/lib/db/connection')

// Model schemas
const OrderSchema = new mongoose.Schema(
  {
    orderNumber: String,
    userId: mongoose.Schema.Types.ObjectId,
    items: [
      {
        productId: mongoose.Schema.Types.ObjectId,
        quantity: Number,
        price: Number,
        customization: Object,
      },
    ],
    totalPrice: Number,
    orderStatus: String,
    customizationStatus: String,
    orderHistory: Array,
    processedAt: Date,
    processedBy: String,
    actualDelivery: Date,
    downloadExpiry: Date,
    paypalTransactionId: String,
    paypalOrderId: String,
    paymentStatus: String,
    paidAt: Date,
  },
  { timestamps: true }
)

const DesignFileSchema = new mongoose.Schema(
  {
    productId: mongoose.Schema.Types.ObjectId,
    fileName: String,
    fileUrl: String,
    fileSize: Number,
    fileType: String,
    description: String,
  },
  { timestamps: true }
)

const OrderDesignFileSchema = new mongoose.Schema(
  {
    orderId: mongoose.Schema.Types.ObjectId,
    designFileId: mongoose.Schema.Types.ObjectId,
    downloadCount: { type: Number, default: 0 },
    canDownload: { type: Boolean, default: true },
  },
  { timestamps: true }
)

// Create models
const Order = mongoose.model('Order', OrderSchema)
const DesignFile = mongoose.model('DesignFile', DesignFileSchema)
const OrderDesignFile = mongoose.model('OrderDesignFile', OrderDesignFileSchema)

async function testFreeOrderCompletion() {
  try {
    console.log('🚀 Connecting to database...')
    await connectDB()

    // Find a recent order (or create a test one)
    const testOrder = await Order.findOne({
      orderStatus: { $in: ['processing', 'pending'] },
    }).sort({ createdAt: -1 })

    if (!testOrder) {
      console.log('❌ No test order found. Creating a mock order...')

      // Create a test product first
      const testProduct = new mongoose.Types.ObjectId()

      // Create a test design file for the product
      const testDesignFile = new DesignFile({
        productId: testProduct,
        fileName: 'test-design.png',
        fileUrl: '/uploads/designs/test-design.png',
        fileSize: 1024,
        fileType: 'image/png',
        description: 'Test design file for free order testing',
      })

      await testDesignFile.save()
      console.log('✅ Created test design file:', testDesignFile._id)

      // Create a test order
      const mockOrder = new Order({
        orderNumber: `TEST-FREE-${Date.now()}`,
        userId: new mongoose.Types.ObjectId(),
        items: [
          {
            productId: testProduct,
            quantity: 1,
            price: 0,
            customization: {},
          },
        ],
        totalPrice: 0,
        orderStatus: 'processing',
        customizationStatus: 'pending',
        orderHistory: [],
        paymentStatus: 'completed',
      })

      await mockOrder.save()
      console.log('✅ Created test order:', mockOrder.orderNumber)

      // Test the free order completion logic
      await testOrderCompletion(mockOrder)
    } else {
      console.log('✅ Found existing order:', testOrder.orderNumber)
      await testOrderCompletion(testOrder)
    }
  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await mongoose.connection.close()
    console.log('🔌 Database connection closed')
  }
}

async function testOrderCompletion(order) {
  try {
    console.log('\n🧪 Testing order completion logic...')
    console.log('📦 Order details:', {
      id: order._id,
      orderNumber: order.orderNumber,
      totalPrice: order.totalPrice,
      items: order.items.length,
    })

    const isFreeOrder = order.totalPrice === 0
    console.log('💰 Is free order:', isFreeOrder)

    // Check existing OrderDesignFiles
    const existingOrderDesignFiles = await OrderDesignFile.find({
      orderId: order._id,
    }).populate('designFileId')

    console.log('📁 Existing OrderDesignFiles:', existingOrderDesignFiles.length)

    if (existingOrderDesignFiles.length === 0 && isFreeOrder) {
      console.log('🆓 Free order with no design files, creating them...')

      // Get products from order
      const orderProducts = order.items.map((item) => item.productId)
      console.log('🛍️ Order products:', orderProducts)

      // Find design files for these products
      const availableDesignFiles = await DesignFile.find({
        productId: { $in: orderProducts },
      })

      console.log(`📂 Found ${availableDesignFiles.length} design files for products`)

      if (availableDesignFiles.length > 0) {
        const newOrderDesignFiles = []

        for (const designFile of availableDesignFiles) {
          console.log('📄 Creating OrderDesignFile for:', designFile.fileName)

          const orderDesignFile = new OrderDesignFile({
            orderId: order._id,
            designFileId: designFile._id,
            downloadCount: 0,
            canDownload: true,
          })

          const saved = await orderDesignFile.save()
          newOrderDesignFiles.push(saved)
        }

        console.log(`✅ Created ${newOrderDesignFiles.length} OrderDesignFile records`)

        // Verify the records were created
        const verifyFiles = await OrderDesignFile.find({
          orderId: order._id,
        }).populate('designFileId')

        console.log('🔍 Verification - OrderDesignFiles created:')
        verifyFiles.forEach((odf, index) => {
          console.log(`  ${index + 1}. ${odf.designFileId.fileName} (${odf.designFileId.fileType})`)
        })
      } else {
        console.log('⚠️ No design files found for order products')
      }
    } else {
      console.log('ℹ️ Order already has design files or is not free')
    }
  } catch (error) {
    console.error('❌ Order completion test failed:', error)
  }
}

// Run the test
testFreeOrderCompletion()
