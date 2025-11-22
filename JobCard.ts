import mongoose, { Document, Schema } from 'mongoose';

export interface IJobCard extends Document {
  jobNumber: string;
  operator: string; // User ID
  workstation: string;
  line: string;
  product: string;
  
  // Job details
  startTime: Date;
  endTime?: Date;
  status: 'pending' | 'in-progress' | 'completed' | 'paused' | 'cancelled';
  
  // Steps
  steps: Array<{
    stepNumber: number;
    description: string;
    instructions: string;
    status: 'pending' | 'in-progress' | 'completed' | 'skipped';
    completedAt?: Date;
    cycleTime?: number;
    issues?: Array<{
      type: string;
      description: string;
      timestamp: Date;
    }>;
  }>;
  
  // Issues logged
  issues: Array<{
    type: 'scrap' | 'delay' | 'material-shortage' | 'tool-issue' | 'other';
    description: string;
    timestamp: Date;
    resolved: boolean;
  }>;
  
  // Performance
  totalCycleTime: number;
  targetCycleTime: number;
  unitsCompleted: number;
  unitsScrapped: number;
  
  createdAt: Date;
  updatedAt: Date;
}

const JobCardSchema = new Schema<IJobCard>(
  {
    jobNumber: { type: String, required: true, unique: true },
    operator: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    workstation: { type: String, required: true },
    line: { type: String, required: true },
    product: { type: String, required: true },
    
    startTime: { type: Date, required: true },
    endTime: { type: Date },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed', 'paused', 'cancelled'],
      default: 'pending',
    },
    
    steps: [{
      stepNumber: Number,
      description: String,
      instructions: String,
      status: {
        type: String,
        enum: ['pending', 'in-progress', 'completed', 'skipped'],
        default: 'pending',
      },
      completedAt: Date,
      cycleTime: Number,
      issues: [{
        type: String,
        description: String,
        timestamp: Date,
      }],
    }],
    
    issues: [{
      type: {
        type: String,
        enum: ['scrap', 'delay', 'material-shortage', 'tool-issue', 'other'],
      },
      description: String,
      timestamp: Date,
      resolved: { type: Boolean, default: false },
    }],
    
    totalCycleTime: { type: Number, default: 0 },
    targetCycleTime: { type: Number, required: true },
    unitsCompleted: { type: Number, default: 0 },
    unitsScrapped: { type: Number, default: 0 },
  },
  { timestamps: true }
);

JobCardSchema.index({ operator: 1, status: 1 });
JobCardSchema.index({ workstation: 1, status: 1 });
JobCardSchema.index({ line: 1, status: 1 });

export default mongoose.model<IJobCard>('JobCard', JobCardSchema);

