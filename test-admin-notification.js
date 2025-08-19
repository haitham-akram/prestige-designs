// Test admin notification system
const { MongoClient } = require('mongodb')

async function testAdminNotification() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/prestige-designs'
  const client = new MongoClient(uri)

  try {
    await client.connect()
    const db = client.db()

    // Check for admin users
    console.log('🔍 Checking for admin users...')
    const adminUsers = await db
      .collection('users')
      .find({
        role: 'admin',
        isActive: true,
        isEmailVerified: true,
      })
      .toArray()

    console.log(`📧 Found ${adminUsers.length} admin users:`)
    adminUsers.forEach((admin) => {
      console.log(`   - ${admin.name} (${admin.email})`)
      console.log(`     Active: ${admin.isActive}`)
      console.log(`     Email Verified: ${admin.isEmailVerified}`)
      console.log(`     Email Notifications: ${admin.preferences?.emailNotifications || 'not set'}`)
      console.log('')
    })

    // Check recent orders
    console.log('🔍 Checking recent orders...')
    const recentOrders = await db.collection('orders').find({}).sort({ createdAt: -1 }).limit(3).toArray()

    console.log(`📋 Found ${recentOrders.length} recent orders:`)
    recentOrders.forEach((order) => {
      console.log(`   - ${order.orderNumber} (${order.paymentStatus}, $${order.totalPrice})`)
      console.log(`     Created: ${order.createdAt}`)
      console.log(`     History length: ${order.orderHistory?.length || 0}`)
      console.log('')
    })
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await client.close()
  }
}

testAdminNotification()
