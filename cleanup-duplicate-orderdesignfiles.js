/**
 * Clean up duplicate OrderDesignFile records
 * This script removes duplicate OrderDesignFile entries for the same order and design file
 */

// Load environment variables manually from .env.local
const fs = require('fs')
const path = require('path')

try {
  const envPath = path.join(__dirname, '.env.local')
  const envFile = fs.readFileSync(envPath, 'utf8')
  const lines = envFile.split('\n')

  lines.forEach((line) => {
    const [key, value] = line.split('=')
    if (key && value) {
      process.env[key] = value.replace(/"/g, '')
    }
  })
} catch (error) {
  console.log('No .env.local file found, using system environment variables')
}

const mongoose = require('mongoose')

// Import database connection
const connectDB = require('./src/lib/db/connection')

// OrderDesignFile Schema
const OrderDesignFileSchema = new mongoose.Schema(
  {
    orderId: mongoose.Schema.Types.ObjectId,
    designFileId: mongoose.Schema.Types.ObjectId,
    downloadCount: { type: Number, default: 0 },
    canDownload: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    downloadLimit: Number,
    expiresAt: Date,
    firstDownloadedAt: Date,
    lastDownloadedAt: Date,
  },
  { timestamps: true }
)

const OrderDesignFile = mongoose.model('OrderDesignFile', OrderDesignFileSchema)

async function cleanupDuplicates() {
  try {
    console.log('🚀 Starting duplicate cleanup...')
    await connectDB()

    // Find all OrderDesignFile records
    const allRecords = await OrderDesignFile.find({}).lean()
    console.log(`📦 Found ${allRecords.length} total OrderDesignFile records`)

    // Group by orderId + designFileId combination
    const groupedRecords = {}

    for (const record of allRecords) {
      const key = `${record.orderId}_${record.designFileId}`

      if (!groupedRecords[key]) {
        groupedRecords[key] = []
      }

      groupedRecords[key].push(record)
    }

    let duplicatesFound = 0
    let duplicatesRemoved = 0

    // Check each group for duplicates
    for (const [key, records] of Object.entries(groupedRecords)) {
      if (records.length > 1) {
        duplicatesFound++
        console.log(`🔍 Found ${records.length} duplicates for key: ${key}`)

        // Sort by createdAt to keep the oldest record
        records.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))

        // Keep the first (oldest) record, remove the rest
        const recordsToRemove = records.slice(1)

        for (const record of recordsToRemove) {
          console.log(`🗑️ Removing duplicate record: ${record._id}`)
          await OrderDesignFile.findByIdAndDelete(record._id)
          duplicatesRemoved++
        }
      }
    }

    console.log(`✅ Cleanup completed:`)
    console.log(`   - Duplicate groups found: ${duplicatesFound}`)
    console.log(`   - Duplicate records removed: ${duplicatesRemoved}`)
    console.log(`   - Records remaining: ${allRecords.length - duplicatesRemoved}`)
  } catch (error) {
    console.error('❌ Cleanup failed:', error)
  } finally {
    await mongoose.connection.close()
    console.log('🔌 Database connection closed')
  }
}

// Run the cleanup
cleanupDuplicates()
