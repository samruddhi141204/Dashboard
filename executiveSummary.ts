import express, { Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import OEE from '../models/OEE';
import Scrap from '../models/Scrap';
import JobCard from '../models/JobCard';
import { CalculationService } from '../services/calculationService';
import { AIService } from '../services/aiService';

const router = express.Router();

// @route   GET /api/executive-summary
// @desc    Get executive summary KPIs
// @access  Private (Manager+)
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, line } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const query: any = {
      date: { $gte: start, $lte: end },
    };
    if (line) query.line = line;

    // Get OEE data
    const oeeData = await OEE.find(query);
    
    // Calculate average OEE
    const avgOEE = oeeData.length > 0
      ? oeeData.reduce((sum, record) => sum + record.oee, 0) / oeeData.length
      : 0;

    // Calculate scrap percentage
    const scrapPercentage = await CalculationService.calculateScrapPercentage(
      line as string,
      { start, end }
    );

    // Calculate throughput
    const throughput = await CalculationService.calculateThroughput(
      line as string,
      { start, end }
    );

    // Calculate lead time
    const leadTime = await CalculationService.calculateLeadTime(
      line as string,
      { start, end }
    );

    // Get AI insights
    const aiInsights = await AIService.generateInsights(line as string, { start, end });

    // Get trend data (last 7 days vs previous 7 days)
    const sevenDaysAgo = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(end.getTime() - 14 * 24 * 60 * 60 * 1000);

    const recentOEE = await OEE.find({ ...query, date: { $gte: sevenDaysAgo, $lte: end } });
    const previousOEE = await OEE.find({ ...query, date: { $gte: fourteenDaysAgo, $lt: sevenDaysAgo } });

    const recentAvgOEE = recentOEE.length > 0
      ? recentOEE.reduce((sum, r) => sum + r.oee, 0) / recentOEE.length
      : 0;
    const previousAvgOEE = previousOEE.length > 0
      ? previousOEE.reduce((sum, r) => sum + r.oee, 0) / previousOEE.length
      : 0;

    const oeeTrend = previousAvgOEE > 0
      ? ((recentAvgOEE - previousAvgOEE) / previousAvgOEE) * 100
      : 0;

    res.json({
      success: true,
      data: {
        kpis: {
          oee: {
            value: avgOEE,
            trend: oeeTrend,
            unit: '%',
          },
          scrapPercentage: {
            value: scrapPercentage,
            unit: '%',
          },
          throughput: {
            value: throughput,
            unit: 'units',
          },
          leadTime: {
            value: leadTime,
            unit: 'minutes',
          },
        },
        trends: {
          productivity: oeeTrend,
          waste: scrapPercentage,
          quality: avgOEE > 0 ? (recentOEE.reduce((sum, r) => sum + r.quality, 0) / recentOEE.length) : 0,
        },
        aiQuickOpportunities: aiInsights.slice(0, 5), // Top 5 insights
      },
    });
  } catch (error: any) {
    console.error('Executive summary error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;

