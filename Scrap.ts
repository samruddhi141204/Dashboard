import mongoose, { Document, Schema } from 'mongoose';

export interface IScrap extends Document {
  line: string;
  station?: string;
  shift: string;
  date: Date;
  operator?: string;
  product: string;
  
  // Scrap details
  defectType: string;
  defectCategory: string;
  quantity: number;
  cost: number;
  
  // Classification
  isRework: boolean;
  reworkTime?: number; // minutes
  
  // Root cause
  rootCause?: string;
  correctiveAction?: string;
  
  // Additional metadata
  notes?: string;
  evidence?: string[]; // URLs or file paths
  createdAt: Date;
  updatedAt: Date;
}

const ScrapSchema = new Schema<IScrap>(
  {
    line: { type: String, required: true },
    station: { type: String },
    shift: { type: String, required: true },
    date: { type: Date, required: true },
    operator: { type: String },
    product: { type: String, required: true },
    
    defectType: { type: String, required: true },
    defectCategory: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    cost: { type: Number, required: true },
    
    isRework: { type: Boolean, default: false },
    reworkTime: { type: Number },
    
    rootCause: { type: String },
    correctiveAction: { type: String },
    
    notes: { type: String },
    evidence: [String],
  },
  { timestamps: true }
);

ScrapSchema.index({ line: 1, date: 1 });
ScrapSchema.index({ defectType: 1 });
ScrapSchema.index({ product: 1, date: 1 });

export default mongoose.model<IScrap>('Scrap', ScrapSchema);

