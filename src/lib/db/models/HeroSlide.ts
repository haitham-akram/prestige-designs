import mongoose, { Document, Schema } from 'mongoose'

export interface IHeroSlide extends Document {
    imageUrl: string
    imagePublicId?: string
    title?: string
    subtitle?: string
    ctaText?: string
    ctaHref?: string
    order: number
    isActive: boolean
    createdAt: Date
    updatedAt: Date
}

const HeroSlideSchema = new Schema<IHeroSlide>(
    {
        imageUrl: { type: String, required: true },
        imagePublicId: String,
        title: String,
        subtitle: String,
        ctaText: String,
        ctaHref: String,
        order: { type: Number, default: 0, index: true },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true, collection: 'hero_slides' }
)

export default mongoose.models.HeroSlide || mongoose.model<IHeroSlide>('HeroSlide', HeroSlideSchema)


