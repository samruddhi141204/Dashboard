import express, { Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import Financial from '../models/Financial';
import CIProject from '../models/CIProject';

const router = express.Router();

// @route   GET /api/financial-impact/cost-savings
// @desc    Get cost savings overview
// @access  Private (Manager+)
router.get('/cost-savings', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { period, line } = req.query;

    const query: any = {};
    if (period) query.period = period;
    if (line) query.line = line;

    const financialData = await Financial.find(query).sort({ period: -1 });

    const totalSavings = financialData.reduce((sum, f) => sum + f.costSavings, 0);

    res.json({
      success: true,
      data: {
        totalSavings,
        breakdown: financialData,
        byPeriod: financialData.map((f) => ({
          period: f.period,
          savings: f.costSavings,
          breakdown: f.savingsBreakdown,
        })),
      },
    });
  } catch (error: any) {
    console.error('Cost savings error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/financial-impact/margin
// @desc    Get margin improvement
// @access  Private (Manager+)
router.get('/margin', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { period, line } = req.query;

    const query: any = {};
    if (period) query.period = period;
    if (line) query.line = line;

    const financialData = await Financial.find(query).sort({ period: 1 });

    res.json({
      success: true,
      data: {
        margins: financialData.map((f) => ({
          period: f.period,
          revenue: f.revenue,
          costOfGoodsSold: f.costOfGoodsSold,
          grossMargin: f.grossMargin,
          grossMarginPercent: f.grossMarginPercent,
        })),
        trend: financialData.length > 1
          ? financialData[financialData.length - 1].grossMarginPercent -
            financialData[0].grossMarginPercent
          : 0,
      },
    });
  } catch (error: any) {
    console.error('Margin improvement error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/financial-impact/roi
// @desc    Get ROI dashboard
// @access  Private (Manager+)
router.get('/roi', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { period, line } = req.query;

    const query: any = {};
    if (period) query.period = period;
    if (line) query.line = line;

    const financialData = await Financial.find(query).sort({ period: -1 });

    // Get CI project contributions
    const projects = await CIProject.find({
      status: 'completed',
    }).populate('ciProjectContributions.projectId');

    const roiData = financialData.map((f) => ({
      period: f.period,
      investment: f.investment,
      returnOnInvestment: f.returnOnInvestment,
      costSavings: f.costSavings,
      ciContributions: f.ciProjectContributions || [],
    }));

    res.json({
      success: true,
      data: {
        roi: roiData,
        averageROI: roiData.length > 0
          ? roiData.reduce((sum, r) => sum + r.returnOnInvestment, 0) / roiData.length
          : 0,
        totalInvestment: roiData.reduce((sum, r) => sum + r.investment, 0),
        totalSavings: roiData.reduce((sum, r) => sum + r.costSavings, 0),
      },
    });
  } catch (error: any) {
    console.error('ROI dashboard error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/financial-impact
// @desc    Create financial record
// @access  Private (Manager+)
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const financialData = req.body;

    // Calculate gross margin if not provided
    if (financialData.revenue && financialData.costOfGoodsSold) {
      financialData.grossMargin = financialData.revenue - financialData.costOfGoodsSold;
      financialData.grossMarginPercent =
        (financialData.grossMargin / financialData.revenue) * 100;
    }

    // Calculate ROI if not provided
    if (financialData.investment && financialData.costSavings) {
      financialData.returnOnInvestment =
        (financialData.costSavings / financialData.investment) * 100;
    }

    const financial = new Financial(financialData);
    await financial.save();

    res.status(201).json({
      success: true,
      data: financial,
    });
  } catch (error: any) {
    console.error('Create financial record error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;

