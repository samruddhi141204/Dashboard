import mongoose, { Document, Schema } from 'mongoose';

export interface IFinancial extends Document {
  period: string; // e.g., "2024-01"
  line?: string;
  
  // Cost savings
  costSavings: number;
  savingsBreakdown: {
    scrapReduction: number;
    downtimeReduction: number;
    efficiencyGains: number;
    materialOptimization: number;
    other: number;
  };
  
  // Margin
  revenue: number;
  costOfGoodsSold: number;
  grossMargin: number;
  grossMarginPercent: number;
  
  // ROI
  investment: number;
  returnOnInvestment: number; // percentage
  
  // CI Project impact
  ciProjectContributions?: Array<{
    projectId: string;
    contribution: number;
  }>;
  
  createdAt: Date;
  updatedAt: Date;
}

const FinancialSchema = new Schema<IFinancial>(
  {
    period: { type: String, required: true },
    line: { type: String },
    
    costSavings: { type: Number, default: 0 },
    savingsBreakdown: {
      scrapReduction: { type: Number, default: 0 },
      downtimeReduction: { type: Number, default: 0 },
      efficiencyGains: { type: Number, default: 0 },
      materialOptimization: { type: Number, default: 0 },
      other: { type: Number, default: 0 },
    },
    
    revenue: { type: Number, default: 0 },
    costOfGoodsSold: { type: Number, default: 0 },
    grossMargin: { type: Number, default: 0 },
    grossMarginPercent: { type: Number, default: 0 },
    
    investment: { type: Number, default: 0 },
    returnOnInvestment: { type: Number, default: 0 },
    
    ciProjectContributions: [{
      projectId: { type: Schema.Types.ObjectId, ref: 'CIProject' },
      contribution: Number,
    }],
  },
  { timestamps: true }
);

FinancialSchema.index({ period: 1 });
FinancialSchema.index({ line: 1, period: 1 });

export default mongoose.model<IFinancial>('Financial', FinancialSchema);

