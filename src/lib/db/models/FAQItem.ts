import mongoose, { Document, Schema } from 'mongoose'

export interface IFAQItem extends Document {
    question: string
    answer: string
    order: number
    isActive: boolean
    createdAt: Date
    updatedAt: Date
}

const FAQItemSchema = new Schema<IFAQItem>(
    {
        question: { type: String, required: true },
        answer: { type: String, required: true },
        order: { type: Number, default: 0, index: true },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true, collection: 'faq_items' }
)

export default mongoose.models.FAQItem || mongoose.model<IFAQItem>('FAQItem', FAQItemSchema)


