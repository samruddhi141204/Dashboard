import mongoose, { Document, Schema } from 'mongoose';

export interface ICIProject extends Document {
  title: string;
  description: string;
  status: 'backlog' | 'in-progress' | 'review' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  
  // Team
  owner: string; // User ID
  teamMembers: string[]; // User IDs
  
  // Impact metrics
  targetSavings?: number;
  actualSavings?: number;
  targetOEEImprovement?: number;
  targetScrapReduction?: number;
  
  // Timeline
  startDate?: Date;
  dueDate?: Date;
  completedDate?: Date;
  
  // Categories
  category: 'process' | 'quality' | 'safety' | 'cost' | 'training' | 'other';
  
  // Progress tracking
  progress: number; // 0-100
  milestones?: Array<{
    title: string;
    dueDate: Date;
    completed: boolean;
    completedDate?: Date;
  }>;
  
  // Engagement
  employeeEngagement?: number; // 0-100
  changeAdoptionRate?: number; // 0-100
  
  // Notes and attachments
  notes?: string;
  attachments?: string[];
  
  createdAt: Date;
  updatedAt: Date;
}

const CIProjectSchema = new Schema<ICIProject>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    status: {
      type: String,
      enum: ['backlog', 'in-progress', 'review', 'completed', 'cancelled'],
      default: 'backlog',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    teamMembers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    
    targetSavings: { type: Number },
    actualSavings: { type: Number },
    targetOEEImprovement: { type: Number },
    targetScrapReduction: { type: Number },
    
    startDate: { type: Date },
    dueDate: { type: Date },
    completedDate: { type: Date },
    
    category: {
      type: String,
      enum: ['process', 'quality', 'safety', 'cost', 'training', 'other'],
      required: true,
    },
    
    progress: { type: Number, default: 0, min: 0, max: 100 },
    milestones: [{
      title: String,
      dueDate: Date,
      completed: { type: Boolean, default: false },
      completedDate: Date,
    }],
    
    employeeEngagement: { type: Number, min: 0, max: 100 },
    changeAdoptionRate: { type: Number, min: 0, max: 100 },
    
    notes: { type: String },
    attachments: [String],
  },
  { timestamps: true }
);

CIProjectSchema.index({ status: 1 });
CIProjectSchema.index({ owner: 1 });
CIProjectSchema.index({ category: 1 });

export default mongoose.model<ICIProject>('CIProject', CIProjectSchema);

