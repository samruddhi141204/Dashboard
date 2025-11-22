import mongoose, { Document, Schema } from 'mongoose';

export interface ICustomer extends Document {
  customerId: string;
  customerName: string;
  region?: string;
  
  // CSAT
  satisfactionScore: number; // 0-100
  feedbackDate: Date;
  feedbackType: 'survey' | 'review' | 'complaint' | 'praise';
  feedbackText?: string;
  
  // Delivery metrics
  orderId: string;
  product: string;
  orderDate: Date;
  promisedDeliveryDate: Date;
  actualDeliveryDate?: Date;
  onTimeDelivery: boolean;
  daysLate?: number;
  
  // Complaint tracking
  complaintCategory?: string;
  complaintDetails?: string;
  resolutionStatus?: 'open' | 'in-progress' | 'resolved' | 'closed';
  
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    customerId: { type: String, required: true },
    customerName: { type: String, required: true },
    region: { type: String },
    
    satisfactionScore: { type: Number, min: 0, max: 100 },
    feedbackDate: { type: Date, required: true },
    feedbackType: {
      type: String,
      enum: ['survey', 'review', 'complaint', 'praise'],
      required: true,
    },
    feedbackText: { type: String },
    
    orderId: { type: String, required: true },
    product: { type: String, required: true },
    orderDate: { type: Date, required: true },
    promisedDeliveryDate: { type: Date, required: true },
    actualDeliveryDate: { type: Date },
    onTimeDelivery: { type: Boolean, required: true },
    daysLate: { type: Number },
    
    complaintCategory: { type: String },
    complaintDetails: { type: String },
    resolutionStatus: {
      type: String,
      enum: ['open', 'in-progress', 'resolved', 'closed'],
    },
  },
  { timestamps: true }
);

CustomerSchema.index({ customerId: 1, feedbackDate: 1 });
CustomerSchema.index({ orderId: 1 });
CustomerSchema.index({ product: 1 });

export default mongoose.model<ICustomer>('Customer', CustomerSchema);

