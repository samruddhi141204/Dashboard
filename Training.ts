import mongoose, { Document, Schema } from 'mongoose';

export interface ITraining extends Document {
  employee: string; // User ID
  skill: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  status: 'not-started' | 'in-progress' | 'completed' | 'expired';
  completionDate?: Date;
  expiryDate?: Date;
  certification?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TrainingSchema = new Schema<ITraining>(
  {
    employee: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    skill: { type: String, required: true },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'expert'],
      required: true,
    },
    status: {
      type: String,
      enum: ['not-started', 'in-progress', 'completed', 'expired'],
      default: 'not-started',
    },
    completionDate: { type: Date },
    expiryDate: { type: Date },
    certification: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

TrainingSchema.index({ employee: 1, skill: 1 });
TrainingSchema.index({ status: 1 });

export default mongoose.model<ITraining>('Training', TrainingSchema);

