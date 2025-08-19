/**
 * Test script to verify promo code fix
 * This script simulates the promo code preservation during PayPal order completion
 */

const mongoose = require('mongoose')
require('dotenv').config({ path: '.env.local' })

async function testPromoCodeFix() {
  try {
    // Connect to MongoDB
    console.log('🔗 Connecting to MongoDB...')
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB')

    // Import Order model
    const { Order } = require('./src/lib/db/models')

    // Find a recent order with promo codes (if any)
    const testOrder = await Order.findOne({
      appliedPromoCodes: { $exists: true, $not: { $size: 0 } },
      paymentStatus: 'paid',
    }).sort({ createdAt: -1 })

    if (!testOrder) {
      console.log('❌ No paid orders with promo codes found for testing')
      return
    }

    console.log('🔍 Found test order:', {
      orderNumber: testOrder.orderNumber,
      appliedPromoCodes: testOrder.appliedPromoCodes,
      totalPromoDiscount: testOrder.totalPromoDiscount,
      totalPrice: testOrder.totalPrice,
      paymentStatus: testOrder.paymentStatus,
    })

    // Simulate updating the order (like PayPal completion would do)
    console.log('🔄 Simulating order update...')

    // First, save the order normally (should trigger middleware)
    testOrder.orderStatus = 'processing'

    console.log('💰 Promo data before save:', {
      appliedPromoCodes: testOrder.appliedPromoCodes,
      totalPromoDiscount: testOrder.totalPromoDiscount,
    })

    await testOrder.save()

    console.log('💰 Promo data after normal save:', {
      appliedPromoCodes: testOrder.appliedPromoCodes,
      totalPromoDiscount: testOrder.totalPromoDiscount,
    })

    // Now test with skipPromoRecalculation flag
    testOrder.orderStatus = 'completed'
    testOrder.skipPromoRecalculation = true

    console.log('💰 Promo data before save with skip flag:', {
      appliedPromoCodes: testOrder.appliedPromoCodes,
      totalPromoDiscount: testOrder.totalPromoDiscount,
    })

    await testOrder.save()

    console.log('💰 Promo data after save with skip flag:', {
      appliedPromoCodes: testOrder.appliedPromoCodes,
      totalPromoDiscount: testOrder.totalPromoDiscount,
    })

    console.log('✅ Test completed successfully')
  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await mongoose.disconnect()
    console.log('🔌 Disconnected from MongoDB')
  }
}

testPromoCodeFix()
