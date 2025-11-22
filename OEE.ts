import mongoose, { Document, Schema } from 'mongoose';

export interface IOEE extends Document {
  line: string;
  station?: string;
  shift: string;
  date: Date;
  operator?: string;
  product?: string;
  
  // Availability metrics
  plannedProductionTime: number; // minutes
  downtime: number; // minutes
  availability: number; // percentage
  
  // Performance metrics
  idealCycleTime: number; // minutes per unit
  actualCycleTime: number; // minutes per unit
  totalUnits: number;
  performance: number; // percentage
  
  // Quality metrics
  goodUnits: number;
  defectiveUnits: number;
  quality: number; // percentage
  
  // Overall OEE
  oee: number; // percentage
  
  // Additional data
  downtimeReasons?: Array<{
    reason: string;
    duration: number;
    timestamp: Date;
  }>;
  cycleTimeVariations?: Array<{
    unit: number;
    cycleTime: number;
    timestamp: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const OEESchema = new Schema<IOEE>(
  {
    line: { type: String, required: true },
    station: { type: String },
    shift: { type: String, required: true },
    date: { type: Date, required: true },
    operator: { type: String },
    product: { type: String },
    
    plannedProductionTime: { type: Number, required: true },
    downtime: { type: Number, default: 0 },
    availability: { type: Number, required: true },
    
    idealCycleTime: { type: Number, required: true },
    actualCycleTime: { type: Number, required: true },
    totalUnits: { type: Number, required: true },
    performance: { type: Number, required: true },
    
    goodUnits: { type: Number, required: true },
    defectiveUnits: { type: Number, default: 0 },
    quality: { type: Number, required: true },
    
    oee: { type: Number, required: true },
    
    downtimeReasons: [{
      reason: String,
      duration: Number,
      timestamp: Date,
    }],
    cycleTimeVariations: [{
      unit: Number,
      cycleTime: Number,
      timestamp: Date,
    }],
  },
  { timestamps: true }
);

OEESchema.index({ line: 1, date: 1 });
OEESchema.index({ station: 1, date: 1 });

export default mongoose.model<IOEE>('OEE', OEESchema);

