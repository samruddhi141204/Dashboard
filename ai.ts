import express, { Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AIService } from '../services/aiService';

const router = express.Router();

// @route   GET /api/ai/insights
// @desc    Get AI insights
// @access  Private
router.get('/insights', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { line, startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const insights = await AIService.generateInsights(line as string, { start, end });

    res.json({
      success: true,
      data: insights,
    });
  } catch (error: any) {
    console.error('AI insights error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/ai/optimization
// @desc    Get optimization suggestions
// @access  Private
router.get('/optimization', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { line, station } = req.query;

    if (!line) {
      return res.status(400).json({ message: 'Line parameter is required' });
    }

    const suggestions = await AIService.generateOptimizationSuggestions(
      line as string,
      station as string
    );

    res.json({
      success: true,
      data: suggestions,
    });
  } catch (error: any) {
    console.error('AI optimization error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/ai/simulate
// @desc    Run what-if simulation
// @access  Private (Supervisor+)
router.post('/simulate', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { line, operators, shiftLength, cycleTimeAdjustment } = req.body;

    if (!line) {
      return res.status(400).json({ message: 'Line parameter is required' });
    }

    const simulation = await AIService.runSimulation({
      line,
      operators,
      shiftLength,
      cycleTimeAdjustment,
    });

    res.json({
      success: true,
      data: simulation,
    });
  } catch (error: any) {
    console.error('AI simulation error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/ai/predictions
// @desc    Get predictive visualizations
// @access  Private
router.get('/predictions', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { metric, line, days } = req.query;

    const validMetrics = ['leadTime', 'throughput', 'scrap', 'oee'];
    if (!metric || !validMetrics.includes(metric as string)) {
      return res.status(400).json({
        message: `Metric must be one of: ${validMetrics.join(', ')}`,
      });
    }

    const predictions = await AIService.generatePredictions(
      metric as 'leadTime' | 'throughput' | 'scrap' | 'oee',
      line as string,
      days ? parseInt(days as string) : 30
    );

    res.json({
      success: true,
      data: predictions,
    });
  } catch (error: any) {
    console.error('AI predictions error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;

