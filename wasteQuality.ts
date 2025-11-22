import express, { Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import Scrap from '../models/Scrap';
import OEE from '../models/OEE';

const router = express.Router();

// @route   GET /api/waste-quality/scrap-overview
// @desc    Get scrap overview
// @access  Private
router.get('/scrap-overview', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, line, station, product } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const query: any = {
      date: { $gte: start, $lte: end },
    };
    if (line) query.line = line;
    if (station) query.station = station;
    if (product) query.product = product;

    const scrapData = await Scrap.find(query);

    const totalScrap = scrapData.reduce((sum, r) => sum + r.quantity, 0);
    const totalCost = scrapData.reduce((sum, r) => sum + r.cost, 0);
    const reworkCount = scrapData.filter((r) => r.isRework).length;
    const scrapCount = scrapData.filter((r) => !r.isRework).length;

    // Get total units for percentage calculation
    const oeeQuery: any = {
      date: { $gte: start, $lte: end },
    };
    if (line) oeeQuery.line = line;
    if (product) oeeQuery.product = product;

    const oeeData = await OEE.find(oeeQuery);
    const totalUnits = oeeData.reduce((sum, r) => sum + r.totalUnits, 0);
    const scrapPercentage = totalUnits > 0 ? (totalScrap / totalUnits) * 100 : 0;

    res.json({
      success: true,
      data: {
        totalScrap,
        totalCost,
        scrapPercentage,
        reworkCount,
        scrapCount,
        breakdown: scrapData,
      },
    });
  } catch (error: any) {
    console.error('Scrap overview error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/waste-quality/defect-categories
// @desc    Get defect categories
// @access  Private
router.get('/defect-categories', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, line } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const query: any = {
      date: { $gte: start, $lte: end },
    };
    if (line) query.line = line;

    const scrapData = await Scrap.find(query);

    // Group by defect category
    const categoryCounts: { [key: string]: { count: number; cost: number } } = {};

    scrapData.forEach((record) => {
      if (!categoryCounts[record.defectCategory]) {
        categoryCounts[record.defectCategory] = { count: 0, cost: 0 };
      }
      categoryCounts[record.defectCategory].count += record.quantity;
      categoryCounts[record.defectCategory].cost += record.cost;
    });

    const categories = Object.entries(categoryCounts).map(([category, data]) => ({
      category,
      count: data.count,
      cost: data.cost,
    }));

    res.json({
      success: true,
      data: categories,
    });
  } catch (error: any) {
    console.error('Defect categories error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/waste-quality/pareto
// @desc    Get Pareto analysis
// @access  Private
router.get('/pareto', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, line } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const query: any = {
      date: { $gte: start, $lte: end },
    };
    if (line) query.line = line;

    const scrapData = await Scrap.find(query);

    // Group by defect type
    const defectCounts: { [key: string]: number } = {};

    scrapData.forEach((record) => {
      defectCounts[record.defectType] = (defectCounts[record.defectType] || 0) + record.quantity;
    });

    // Sort by count (descending)
    const sortedDefects = Object.entries(defectCounts)
      .map(([defectType, count]) => ({ defectType, count }))
      .sort((a, b) => b.count - a.count);

    // Calculate cumulative percentage
    const total = sortedDefects.reduce((sum, d) => sum + d.count, 0);
    let cumulative = 0;

    const paretoData = sortedDefects.map((defect) => {
      cumulative += defect.count;
      return {
        ...defect,
        percentage: (defect.count / total) * 100,
        cumulativePercentage: (cumulative / total) * 100,
      };
    });

    res.json({
      success: true,
      data: paretoData,
    });
  } catch (error: any) {
    console.error('Pareto analysis error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/waste-quality/rework-vs-scrap
// @desc    Get rework vs scrap comparison
// @access  Private
router.get('/rework-vs-scrap', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, line } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const query: any = {
      date: { $gte: start, $lte: end },
    };
    if (line) query.line = line;

    const scrapData = await Scrap.find(query);

    const rework = scrapData.filter((r) => r.isRework);
    const scrap = scrapData.filter((r) => !r.isRework);

    const reworkQuantity = rework.reduce((sum, r) => sum + r.quantity, 0);
    const scrapQuantity = scrap.reduce((sum, r) => sum + r.quantity, 0);
    const reworkCost = rework.reduce((sum, r) => sum + r.cost, 0);
    const scrapCost = scrap.reduce((sum, r) => sum + r.cost, 0);
    const reworkTime = rework.reduce((sum, r) => sum + (r.reworkTime || 0), 0);

    res.json({
      success: true,
      data: {
        rework: {
          quantity: reworkQuantity,
          cost: reworkCost,
          time: reworkTime,
          count: rework.length,
        },
        scrap: {
          quantity: scrapQuantity,
          cost: scrapCost,
          count: scrap.length,
        },
        comparison: {
          reworkPercentage: (reworkQuantity / (reworkQuantity + scrapQuantity)) * 100,
          scrapPercentage: (scrapQuantity / (reworkQuantity + scrapQuantity)) * 100,
        },
      },
    });
  } catch (error: any) {
    console.error('Rework vs scrap error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/waste-quality/quality-trend
// @desc    Get quality trend
// @access  Private
router.get('/quality-trend', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, line } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const query: any = {
      date: { $gte: start, $lte: end },
    };
    if (line) query.line = line;

    const oeeData = await OEE.find(query).sort({ date: 1 });

    // Group by date
    const dailyQuality: { [key: string]: { quality: number; count: number } } = {};

    oeeData.forEach((record) => {
      const dateKey = record.date.toISOString().split('T')[0];
      if (!dailyQuality[dateKey]) {
        dailyQuality[dateKey] = { quality: 0, count: 0 };
      }
      dailyQuality[dateKey].quality += record.quality;
      dailyQuality[dateKey].count += 1;
    });

    const trend = Object.entries(dailyQuality).map(([date, data]) => ({
      date,
      quality: data.quality / data.count,
    }));

    res.json({
      success: true,
      data: trend,
    });
  } catch (error: any) {
    console.error('Quality trend error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/waste-quality/scrap
// @desc    Create scrap record
// @access  Private
router.post('/scrap', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const scrapData = {
      ...req.body,
      operator: req.body.operator || req.user?.id,
    };

    const scrap = new Scrap(scrapData);
    await scrap.save();

    res.status(201).json({
      success: true,
      data: scrap,
    });
  } catch (error: any) {
    console.error('Create scrap error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;

