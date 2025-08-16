const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

async function createAdminUser() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/prestige-designs';
  
  console.log('🔧 Setting up admin user for production...');
  console.log('MongoDB URI:', mongoUri.replace(/:[^:@]*@/, ':****@')); // Hide password in log
  
  const client = new MongoClient(mongoUri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    const usersCollection = db.collection('users');
    
    // Check if admin user already exists
    const existingAdmin = await usersCollection.findOne({ 
      email: 'vip.nasser2021@gmail.com' 
    });
    
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists');
      console.log('User ID:', existingAdmin._id);
      console.log('Email:', existingAdmin.email);
      console.log('Role:', existingAdmin.role);
      
      // Update role to admin if not already
      if (existingAdmin.role !== 'admin') {
        await usersCollection.updateOne(
          { email: 'vip.nasser2021@gmail.com' },
          { $set: { role: 'admin' } }
        );
        console.log('✅ Updated existing user role to admin');
      }
      return;
    }
    
    // Create new admin user
    const hashedPassword = await bcrypt.hash('AdminPrestige2025!', 12);
    
    const adminUser = {
      email: 'vip.nasser2021@gmail.com',
      name: 'Admin User',
      role: 'admin',
      isActive: true,
      password: hashedPassword,
      emailVerified: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      image: null,
      provider: 'credentials'
    };
    
    const result = await usersCollection.insertOne(adminUser);
    
    console.log('🎉 Admin user created successfully!');
    console.log('User ID:', result.insertedId);
    console.log('Email: vip.nasser2021@gmail.com');
    console.log('Password: AdminPrestige2025!');
    console.log('Role: admin');
    console.log('');
    console.log('⚠️  IMPORTANT: Change the password after first login!');
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('📦 Database connection closed');
  }
}

// Run the script
if (require.main === module) {
  createAdminUser()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = createAdminUser;
