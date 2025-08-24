// scripts/updateDesignFiles.js

const { MongoClient } = require('mongodb')

/**
 * This script updates all documents in the 'designfiles' collection
 * to add the field `isForOrder: false` where it does not already exist,
 * and `orderId: null` where it does not already exist.
 */
async function updateDesignFiles() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/prestige-designs';

  if (!mongoUri) {
    console.error('MONGO_URI environment variable is not set. Please check your .env file.');
    process.exit(1);
  }

  console.log('Connecting to the database...');
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    console.log('✅ Database connected.');

    const db = client.db(); // This will use the database from your connection string
    const designFilesCollection = db.collection('designfiles');

    console.log('Starting update process for Design Files...');

    // Find all documents where 'isForOrder' OR 'orderId' does not exist and update them
    const result = await designFilesCollection.updateMany(
      { 
        $or: [
          { isForOrder: { $exists: false } },
          { orderId: { $exists: false } }
        ]
      },
      { 
        $set: { 
          isForOrder: false,
          orderId: null 
        } 
      }
    );

    console.log('Update process completed.');
    console.log(`- Documents matched: ${result.matchedCount}`);
    console.log(`- Documents updated: ${result.modifiedCount}`);

  } catch (error) {
    console.error('❌ An error occurred during the update process:', error);
  } finally {
    // Ensure the database connection is closed
    await client.close();
    console.log('📦 Database connection closed.');
  }
}

// Run the script
updateDesignFiles();
