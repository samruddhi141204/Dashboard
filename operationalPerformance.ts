import express, { Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import OEE from '../models/OEE';
import JobCard from '../models/JobCard';
import { AIService } from '../services/aiService';

const router = express.Router();

// @route   GET /api/operational-performance/oee
// @desc    Get OEE dashboard data
// @access  Private
router.get('/oee', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, line, station, shift, operator, product } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const query: any = {
      date: { $gte: start, $lte: end },
    };
    if (line) query.line = line;
    if (station) query.station = station;
    if (shift) query.shift = shift;
    if (operator) query.operator = operator;
    if (product) query.product = product;

    const oeeData = await OEE.find(query).sort({ date: -1 });

    // Calculate averages
    const avgAvailability = oeeData.length > 0
      ? oeeData.reduce((sum, r) => sum + r.availability, 0) / oeeData.length
      : 0;
    const avgPerformance = oeeData.length > 0
      ? oeeData.reduce((sum, r) => sum + r.performance, 0) / oeeData.length
      : 0;
    const avgQuality = oeeData.length > 0
      ? oeeData.reduce((sum, r) => sum + r.quality, 0) / oeeData.length
      : 0;
    const avgOEE = oeeData.length > 0
      ? oeeData.reduce((sum, r) => sum + r.oee, 0) / oeeData.length
      : 0;

    // Get cycle time variations
    const cycleTimeVariations = oeeData
      .filter((r) => r.cycleTimeVariations && r.cycleTimeVariations.length > 0)
      .flatMap((r) =>
        r.cycleTimeVariations!.map((v) => ({
          ...v,
          line: r.line,
          station: r.station,
        }))
      );

    res.json({
      success: true,
      data: {
        oee: {
          overall: avgOEE,
          availability: avgAvailability,
          performance: avgPerformance,
          quality: avgQuality,
        },
        breakdown: oeeData,
        cycleTimeVariations,
      },
    });
  } catch (error: any) {
    console.error('OEE dashboard error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/operational-performance/throughput
// @desc    Get throughput analysis
// @access  Private
router.get('/throughput', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, line, shift } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const query: any = {
      date: { $gte: start, $lte: end },
    };
    if (line) query.line = line;
    if (shift) query.shift = shift;

    const oeeData = await OEE.find(query).sort({ date: 1 });

    // Group by shift
    const shiftData: { [key: string]: number } = {};
    oeeData.forEach((record) => {
      shiftData[record.shift] = (shiftData[record.shift] || 0) + record.goodUnits;
    });

    res.json({
      success: true,
      data: {
        totalThroughput: oeeData.reduce((sum, r) => sum + r.goodUnits, 0),
        byShift: shiftData,
        daily: oeeData.map((r) => ({
          date: r.date,
          throughput: r.goodUnits,
          line: r.line,
        })),
      },
    });
  } catch (error: any) {
    console.error('Throughput analysis error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/operational-performance/lead-time
// @desc    Get lead time analysis
// @access  Private
router.get('/lead-time', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, line } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const query: any = {
      status: 'completed',
      startTime: { $gte: start, $lte: end },
    };
    if (line) query.line = line;

    const jobs = await JobCard.find(query).sort({ startTime: -1 });

    const leadTimes = jobs
      .filter((job) => job.endTime && job.startTime)
      .map((job) => ({
        jobNumber: job.jobNumber,
        leadTime: (job.endTime!.getTime() - job.startTime.getTime()) / 1000 / 60, // minutes
        line: job.line,
        product: job.product,
        date: job.startTime,
      }));

    const avgLeadTime = leadTimes.length > 0
      ? leadTimes.reduce((sum, lt) => sum + lt.leadTime, 0) / leadTimes.length
      : 0;

    res.json({
      success: true,
      data: {
        averageLeadTime: avgLeadTime,
        leadTimes,
        min: leadTimes.length > 0 ? Math.min(...leadTimes.map((lt) => lt.leadTime)) : 0,
        max: leadTimes.length > 0 ? Math.max(...leadTimes.map((lt) => lt.leadTime)) : 0,
      },
    });
  } catch (error: any) {
    console.error('Lead time analysis error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/operational-performance/cycle-time-variation
// @desc    Get cycle time variation maps
// @access  Private
router.get('/cycle-time-variation', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, line, station } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const query: any = {
      date: { $gte: start, $lte: end },
    };
    if (line) query.line = line;
    if (station) query.station = station;

    const oeeData = await OEE.find(query);

    // Create variation map by station
    const variationMap: { [key: string]: any[] } = {};

    oeeData.forEach((record) => {
      const key = record.station || record.line;
      if (!variationMap[key]) {
        variationMap[key] = [];
      }

      variationMap[key].push({
        date: record.date,
        idealCycleTime: record.idealCycleTime,
        actualCycleTime: record.actualCycleTime,
        variation: record.actualCycleTime - record.idealCycleTime,
        variationPercent: ((record.actualCycleTime - record.idealCycleTime) / record.idealCycleTime) * 100,
      });
    });

    res.json({
      success: true,
      data: {
        variationMap,
      },
    });
  } catch (error: any) {
    console.error('Cycle time variation error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/operational-performance/oee
// @desc    Create OEE record
// @access  Private
router.post('/oee', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const oeeData = req.body;

    // Calculate OEE if not provided
    if (!oeeData.oee) {
      oeeData.oee = (oeeData.availability * oeeData.performance * oeeData.quality) / 10000;
    }

    const oee = new OEE(oeeData);
    await oee.save();

    res.status(201).json({
      success: true,
      data: oee,
    });
  } catch (error: any) {
    console.error('Create OEE error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;

