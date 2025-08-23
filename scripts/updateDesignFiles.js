// scripts/updateDesignFiles.ts

const mongoose = require('mongoose');
import connectDB from '../src/lib/db/connection.js';
const { DesignFile } = require('../src/lib/db/models');

/**
 * This script updates all documents in the 'designfiles' collection
 * to add the field `isForOrder: false` where it does not already exist.
 */
const updateDesignFiles = async () => {
  console.log('Connecting to the database...');
  await connectDB();
  console.log('Database connected.');

  try {
    console.log('Starting update process for Design Files...');

    // Find all documents where 'isForOrder' does not exist and update them
    const result = await DesignFile.updateMany(
      { isForOrder: { $exists: false } }, // Filter: only update documents that don't have this field
      { $set: { isForOrder: false } }     // Update: set the new field and value
    );

    console.log('Update process completed.');
    console.log(`- Documents matched: ${result.matchedCount}`);
    console.log(`- Documents updated: ${result.modifiedCount}`);

  } catch (error) {
    console.error('An error occurred during the update process:', error);
  } finally {
    // Ensure the database connection is closed
    await mongoose.disconnect();
    console.log('Database connection closed.');
  }
};

// Run the script
updateDesignFiles();
