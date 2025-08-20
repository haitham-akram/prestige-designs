const mongoose = require('mongoose')

// MongoDB connection - using hardcoded URI for testing
mongoose.connect(
  'mongodb+srv://Motaz:MotazGm3881@prestige-designs.9bctv.mongodb.net/prestige-designs?retryWrites=true&w=majority'
)

// Define PromoCode schema inline
const promoCodeSchema = new mongoose.Schema(
  {
    code: String,
    applyToAllProducts: Boolean,
    products: [String],
    productIds: [String],
    productId: String,
  },
  { collection: 'promocodes' }
)

const PromoCode = mongoose.model('PromoCode', promoCodeSchema)

async function checkPromoCode123() {
  try {
    console.log('🔍 Checking promo code "123" structure...')

    const promoCode = await PromoCode.findOne({ code: '123' })

    if (!promoCode) {
      console.log('❌ Promo code "123" not found')
      return
    }

    console.log('✅ Found promo code "123":')
    console.log('📋 Full structure:', JSON.stringify(promoCode, null, 2))
    console.log('🎯 Key fields:')
    console.log('- applyToAllProducts:', promoCode.applyToAllProducts)
    console.log('- products:', promoCode.products)
    console.log('- productIds:', promoCode.productIds)
    console.log('- productId (legacy):', promoCode.productId)

    if (promoCode.products && Array.isArray(promoCode.products)) {
      console.log('📦 Products list (length:', promoCode.products.length, '):', promoCode.products)
    }

    if (promoCode.productIds && Array.isArray(promoCode.productIds)) {
      console.log('📦 ProductIds list (length:', promoCode.productIds.length, '):', promoCode.productIds)
    }
  } catch (error) {
    console.error('Error:', error)
  } finally {
    mongoose.disconnect()
  }
}

checkPromoCode123()
