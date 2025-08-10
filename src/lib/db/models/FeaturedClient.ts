import mongoose, { Document, Schema } from 'mongoose'

export interface IFeaturedClient extends Document {
    name: string
    imageUrl: string
    imagePublicId?: string
    link?: string
    order: number
    isActive: boolean
    createdAt: Date
    updatedAt: Date
}

const FeaturedClientSchema = new Schema<IFeaturedClient>(
    {
        name: { type: String, required: true },
        imageUrl: { type: String, required: true },
        imagePublicId: String,
        link: String,
        order: { type: Number, default: 0, index: true },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true, collection: 'featured_clients' }
)

export default mongoose.models.FeaturedClient || mongoose.model<IFeaturedClient>('FeaturedClient', FeaturedClientSchema)


