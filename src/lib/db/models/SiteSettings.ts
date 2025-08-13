import mongoose, { Document, Schema } from 'mongoose'

export interface ISiteSettings extends Document {
    branding: {
        logoUrl?: string
        logoPublicId?: string
        faviconUrl?: string
        faviconPublicId?: string
    }
    social: {
        telegram?: string
        discord?: string
        whatsapp?: string
        youtube?: string
        tiktok?: string
        text?: string
    }
    discordBanner?: {
        imageUrl?: string
        imagePublicId?: string
        title?: string
        description?: string
    }
    categoriesBanner?: {
        imageUrl?: string
        imagePublicId?: string
        alt?: string
    }
    updatedAt: Date
    updatedBy?: string
}

const SiteSettingsSchema = new Schema<ISiteSettings>(
    {
        branding: {
            logoUrl: String,
            logoPublicId: String,
            faviconUrl: String,
            faviconPublicId: String,
        },
        social: {
            telegram: String,
            discord: String,
            whatsapp: String,
            youtube: String,
            tiktok: String,
            text: String,
        },
        discordBanner: {
            imageUrl: String,
            imagePublicId: String,
            title: String,
            description: String,
        },
        categoriesBanner: {
            imageUrl: String,
            imagePublicId: String,
            alt: String,
        },
        updatedAt: { type: Date, default: Date.now },
        updatedBy: { type: String },
    },
    { collection: 'site_settings' }
)

// Ensure a single document (singleton)
SiteSettingsSchema.index({}, { unique: false })

export default mongoose.models.SiteSettings || mongoose.model<ISiteSettings>('SiteSettings', SiteSettingsSchema)


