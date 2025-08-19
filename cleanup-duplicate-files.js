const mongoose = require('mongoose')

// Define the DesignFile schema directly
const designFileSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    fileUrl: {
      type: String,
      required: true,
      trim: true,
    },
    fileType: {
      type: String,
      required: true,
      enum: [
        'psd',
        'ai',
        'eps',
        'pdf',
        'svg',
        'zip',
        'rar',
        'png',
        'jpg',
        'jpeg',
        'gif',
        'webp',
        'mp4',
        'avi',
        'mov',
        'wmv',
        'flv',
        'webm',
        'mkv',
      ],
      lowercase: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
)

const DesignFile = mongoose.model('DesignFile', designFileSchema)

// MongoDB connection string
const MONGODB_URI = 'mongodb://localhost:27017/prestige-designs'

async function cleanupDuplicateFiles() {
  try {
    await mongoose.connect(MONGODB_URI)
    console.log('Connected to MongoDB')

    // Find all design files grouped by productId, fileName, and fileUrl
    const duplicates = await DesignFile.aggregate([
      {
        $group: {
          _id: {
            productId: '$productId',
            fileName: '$fileName',
            fileUrl: '$fileUrl',
          },
          count: { $sum: 1 },
          docs: { $push: '$$ROOT' },
        },
      },
      {
        $match: {
          count: { $gt: 1 },
        },
      },
    ])

    console.log(`Found ${duplicates.length} sets of duplicate files`)

    let totalRemoved = 0

    for (const duplicate of duplicates) {
      const { productId, fileName, fileUrl } = duplicate._id
      const docs = duplicate.docs

      console.log(`\nProcessing duplicates for: ${fileName}`)
      console.log(`Product ID: ${productId}`)
      console.log(`File URL: ${fileUrl}`)
      console.log(`Duplicates found: ${docs.length}`)

      // Keep the first one (oldest), remove the rest
      const docsToRemove = docs.slice(1)

      for (const doc of docsToRemove) {
        await DesignFile.findByIdAndDelete(doc._id)
        console.log(`Removed duplicate: ${doc._id}`)
        totalRemoved++
      }
    }

    console.log(`\n✅ Cleanup completed!`)
    console.log(`Total duplicate files removed: ${totalRemoved}`)

    // Show final counts
    const finalCount = await DesignFile.countDocuments()
    console.log(`Remaining design files: ${finalCount}`)

    await mongoose.disconnect()
    console.log('Disconnected from MongoDB')
  } catch (error) {
    console.error('Error during cleanup:', error)
    process.exit(1)
  }
}

// Run the cleanup
cleanupDuplicateFiles()
