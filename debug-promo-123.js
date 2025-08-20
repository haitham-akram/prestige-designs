const mongoose = require('mongoose')
require('dotenv').config({ path: '.env.local' })

// Import the PromoCode model
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('MongoDB connected')
  } catch (error) {
    console.error('MongoDB connection error:', error)
    process.exit(1)
  }
}

const PromoCodeSchema = new mongoose.Schema({
  code: String,
  productIds: [String],
  productId: String, // Legacy field
  applyToAllProducts: Boolean,
  discountType: String,
  discountValue: Number,
  isActive: Boolean,
})

const PromoCode = mongoose.model('PromoCode', PromoCodeSchema)

const debugPromo = async () => {
  await connectDB()

  // Find promo code "123"
  const promoCode = await PromoCode.findOne({ code: '123' })

  console.log('🔍 Promo code "123" details:', {
    code: promoCode?.code,
    productIds: promoCode?.productIds,
    productId: promoCode?.productId, // Check if this exists
    applyToAllProducts: promoCode?.applyToAllProducts,
    discountType: promoCode?.discountType,
    discountValue: promoCode?.discountValue,
    isActive: promoCode?.isActive,
    fullDocument: JSON.stringify(promoCode, null, 2),
  })

  // Also check all products to see their IDs
  const Product = mongoose.model(
    'Product',
    new mongoose.Schema({
      name: String,
      _id: mongoose.Schema.Types.ObjectId,
    })
  )

  const products = await Product.find({}).select('_id name').limit(5)
  console.log(
    '🔍 Sample product IDs:',
    products.map((p) => ({ id: p._id.toString(), name: p.name }))
  )

  mongoose.connection.close()
}

debugPromo().catch(console.error)
