const mongoose = require('mongoose')

// Define schema inline
const designFileSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    fileName: { type: String, required: true },
    fileUrl: { type: String, required: true },
    fileType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    mimeType: { type: String, required: true },
    description: String,
    isActive: { type: Boolean, default: true },
    isPublic: { type: Boolean, default: false },
    downloadCount: { type: Number, default: 0 },
    maxDownloads: { type: Number, default: null },
    expiresAt: { type: Date, default: null },
    downloadUrl: { type: String, default: null },
    downloadUrlExpiresAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    colorVariantName: String,
    colorVariantHex: String,
    isColorVariant: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
)

const DesignFile = mongoose.model('DesignFile', designFileSchema)

async function verifyCleanup() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/prestige-designs')

    console.log('Verifying cleanup results...')

    // Get all design files
    const allFiles = await DesignFile.find({}).sort({ createdAt: -1 })
    console.log(`\nTotal design files in database: ${allFiles.length}`)

    // Group by filename and productId to see if there are any remaining duplicates
    const fileGroups = {}
    allFiles.forEach((file) => {
      const key = `${file.fileName}_${file.productId}`
      if (!fileGroups[key]) {
        fileGroups[key] = []
      }
      fileGroups[key].push(file)
    })

    console.log('\nFile breakdown:')
    Object.keys(fileGroups).forEach((key, index) => {
      const [fileName, productId] = key.split('_')
      const files = fileGroups[key]
      console.log(`${index + 1}. ${fileName} (Product: ${productId}) - Count: ${files.length}`)

      if (files.length > 1) {
        console.log('   ❌ Still has duplicates!')
        files.forEach((f, i) => {
          console.log(`      ${i + 1}. ID: ${f._id}, Created: ${f.createdAt}`)
        })
      } else {
        console.log('   ✅ No duplicates')
      }
    })

    // Check the specific product that was causing issues
    const prestigePackagesId = '68a2d9c8705a00b3e98a8403'
    const prestigeFiles = await DesignFile.find({ productId: prestigePackagesId }).sort({ createdAt: -1 })
    console.log(`\nPrestige Packages product files: ${prestigeFiles.length}`)
    prestigeFiles.forEach((file, index) => {
      console.log(`${index + 1}. ${file.fileName} - ID: ${file._id} - Created: ${file.createdAt}`)
    })

    await mongoose.disconnect()
    console.log('\nDisconnected from MongoDB')
  } catch (error) {
    console.error('Error:', error)
  }
}

verifyCleanup()
