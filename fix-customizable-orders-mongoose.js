/**
 * Fix Orders with Customiza        for (const order of orders) {
            let hasCustomizableProducts = false;
            let requiresCustomWork = false;

            // Check each item in the order
            for (const item of order.items || []) {
                if (item.productId) {
                    // First check if order item already has EnableCustomizations flag (from updated cart logic)
                    if (item.EnableCustomizations === true) {
                        hasCustomizableProducts = true;
                        
                        // If the item has customization data, it requires custom work
                        if (item.customizations && Object.keys(item.customizations).length > 0) {
                            // Check if any actual customization data exists (not empty arrays)
                            const hasRealCustomizations = 
                                (item.customizations.colors && item.customizations.colors.length > 0) ||
                                (item.customizations.textChanges && item.customizations.textChanges.length > 0) ||
                                (item.customizations.uploadedImages && item.customizations.uploadedImages.length > 0) ||
                                (item.customizations.uploadedLogo) ||
                                (item.customizations.customizationNotes && item.customizations.customizationNotes.trim().length > 0);
                                
                            if (hasRealCustomizations) {
                                requiresCustomWork = true;
                            }
                        }
                    } else {
                        // Fallback: Get the product details manually
                        const product = await Product.findById(item.productId);
                        
                        if (product && product.EnableCustomizations === true) {
                            hasCustomizableProducts = true;
                            
                            // If the item has customization data, it requires custom work
                            if (item.customizations && Object.keys(item.customizations).length > 0) {
                                // Check if any actual customization data exists (not empty arrays)
                                const hasRealCustomizations = 
                                    (item.customizations.colors && item.customizations.colors.length > 0) ||
                                    (item.customizations.textChanges && item.customizations.textChanges.length > 0) ||
                                    (item.customizations.uploadedImages && item.customizations.uploadedImages.length > 0) ||
                                    (item.customizations.uploadedLogo) ||
                                    (item.customizations.customizationNotes && item.customizations.customizationNotes.trim().length > 0);
                                    
                                if (hasRealCustomizations) {
                                    requiresCustomWork = true;
                                }
                            }
                        }
                    }
                }
            } script fixes orders that have customizable products but incorrect flags
 */

const mongoose = require('mongoose')

// MongoDB connection URI
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/prestige-designs'

// Define schemas
const OrderSchema = new mongoose.Schema({}, { strict: false, collection: 'orders' })
const ProductSchema = new mongoose.Schema({}, { strict: false, collection: 'products' })

const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema)
const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema)

async function fixCustomizableOrders() {
  try {
    console.log('🔄 Connecting to MongoDB...')
    await mongoose.connect(MONGODB_URI)
    console.log('✅ Connected to MongoDB')

    // Find all orders
    console.log('\n🔍 Finding orders with customizable products...')

    const orders = await Order.find({})
    console.log(`📋 Found ${orders.length} total orders to check`)

    let fixedCount = 0
    let needsFixingCount = 0

    for (const order of orders) {
      let hasCustomizableProducts = false
      let requiresCustomWork = false

      // Check each item in the order
      for (const item of order.items || []) {
        if (item.productId) {
          // Get the product details manually
          const product = await Product.findById(item.productId)

          if (product && product.EnableCustomizations === true) {
            hasCustomizableProducts = true

            // If the item has customization data, it requires custom work
            if (item.customization && Object.keys(item.customization).length > 0) {
              requiresCustomWork = true
            }
          }
        }
      }

      // Check if order needs fixing
      const needsFix =
        order.hasCustomizableProducts !== hasCustomizableProducts || order.requiresCustomWork !== requiresCustomWork

      if (needsFix) {
        needsFixingCount++
        console.log(`\n🔧 Fixing order ${order.orderNumber}:`)
        console.log(
          `   Current: hasCustomizableProducts=${order.hasCustomizableProducts}, requiresCustomWork=${order.requiresCustomWork}`
        )
        console.log(
          `   Should be: hasCustomizableProducts=${hasCustomizableProducts}, requiresCustomWork=${requiresCustomWork}`
        )

        // Update the order
        await Order.findByIdAndUpdate(order._id, {
          hasCustomizableProducts,
          requiresCustomWork,
        })

        fixedCount++
        console.log(`   ✅ Fixed`)
      }
    }

    console.log(`\n📊 Summary:`)
    console.log(`   Total orders checked: ${orders.length}`)
    console.log(`   Orders that needed fixing: ${needsFixingCount}`)
    console.log(`   Orders successfully fixed: ${fixedCount}`)

    console.log('\n✅ Migration completed successfully!')
  } catch (error) {
    console.error('❌ Error during migration:', error)
    throw error
  } finally {
    await mongoose.disconnect()
    console.log('🔌 Disconnected from MongoDB')
  }
}

// Run the migration
fixCustomizableOrders()
  .then(() => {
    console.log('\n🎉 All done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error)
    process.exit(1)
  })
