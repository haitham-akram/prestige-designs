const mongoose = require('mongoose')

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/prestige-designs')

// Test the cart structure by simulating what would be sent from checkout
async function testCartStructure() {
  try {
    console.log('🔍 Testing typical cart item structure that would be sent to promo validation...')

    // This is what a typical cart item should look like based on CartContext interface
    const simulatedCartItems = [
      {
        id: '688f45f59703bfe0ab925550', // Product ID for "منتج جديد"
        cartItemId: 'cart-item-123',
        name: 'منتج جديد',
        price: 50,
        image: 'some-image-url',
        quantity: 1,
        EnableCustomizations: true,
      },
      {
        id: '68a05cee53797a6f2cee5d17', // Product ID for "منتج جديد تست"
        cartItemId: 'cart-item-456',
        name: 'منتج جديد تست',
        price: 30,
        image: 'some-image-url',
        quantity: 2,
        EnableCustomizations: false,
      },
    ]

    console.log('📦 Simulated cart items structure:')
    console.log(JSON.stringify(simulatedCartItems, null, 2))

    // Test the ID extraction logic
    simulatedCartItems.forEach((item, index) => {
      const extractedId = item.productId || item._id || item.id
      console.log(`Item ${index + 1}: ${item.name} -> Extracted ID: ${extractedId}`)
    })
  } catch (error) {
    console.error('Error:', error)
  } finally {
    mongoose.disconnect()
  }
}

testCartStructure()
