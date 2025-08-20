/**
 * Test the customizable product flags
 */
const mongoose = require('mongoose')

// MongoDB connection URI
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/prestige-designs'

// Define schemas
const ProductSchema = new mongoose.Schema({}, { strict: false, collection: 'products' })
const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema)

async function testCustomizableProduct() {
  try {
    console.log('🔄 Connecting to MongoDB...')
    await mongoose.connect(MONGODB_URI)
    console.log('✅ Connected to MongoDB')

    // Check the testDB product that was mentioned in the issue
    const product = await Product.findById('688f43b79703bfe0ab92551f')

    if (product) {
      console.log('🔍 Product Details:')
      console.log('   Name:', product.name)
      console.log('   EnableCustomizations:', product.EnableCustomizations)
      console.log('   allowColorChanges:', product.allowColorChanges)
      console.log('   allowTextEditing:', product.allowTextEditing)
      console.log('   allowImageReplacement:', product.allowImageReplacement)
      console.log('   allowLogoUpload:', product.allowLogoUpload)
      console.log('')

      if (product.EnableCustomizations === true) {
        console.log('✅ This product SHOULD create orders with hasCustomizableProducts: true')
      } else {
        console.log('❌ This product should NOT create customizable orders')
      }
    } else {
      console.log('❌ Product not found')
    }
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await mongoose.disconnect()
    console.log('🔌 Disconnected from MongoDB')
  }
}

// Run the test
testCustomizableProduct()
  .then(() => {
    console.log('\n🎉 Test completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Test failed:', error)
    process.exit(1)
  })
