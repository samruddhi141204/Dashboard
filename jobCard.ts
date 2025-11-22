import express, { Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import JobCard from '../models/JobCard';
import { AIService } from '../services/aiService';

const router = express.Router();

// @route   GET /api/job-cards
// @desc    Get job cards
// @access  Private
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { status, operator, workstation, line } = req.query;

    const query: any = {};
    if (status) query.status = status;
    if (operator) query.operator = operator;
    if (workstation) query.workstation = workstation;
    if (line) query.line = line;

    // Operators can only see their own job cards
    if (req.user?.role === 'operator') {
      query.operator = req.user.id;
    }

    const jobCards = await JobCard.find(query)
      .populate('operator', 'name email workstation')
      .sort({ startTime: -1 });

    res.json({
      success: true,
      data: jobCards,
    });
  } catch (error: any) {
    console.error('Get job cards error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/job-cards/:id
// @desc    Get single job card
// @access  Private
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const jobCard = await JobCard.findById(req.params.id)
      .populate('operator', 'name email workstation');

    if (!jobCard) {
      return res.status(404).json({ message: 'Job card not found' });
    }

    // Operators can only see their own job cards
    if (
      req.user?.role === 'operator' &&
      jobCard.operator.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get AI suggestions for this job
    const aiSuggestions = await AIService.generateOptimizationSuggestions(
      jobCard.line,
      jobCard.workstation
    );

    res.json({
      success: true,
      data: {
        jobCard,
        aiSuggestions,
      },
    });
  } catch (error: any) {
    console.error('Get job card error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/job-cards
// @desc    Create job card
// @access  Private
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const jobCardData = {
      ...req.body,
      operator: req.body.operator || req.user?.id,
      startTime: req.body.startTime || new Date(),
      status: 'in-progress',
    };

    const jobCard = new JobCard(jobCardData);
    await jobCard.save();

    await jobCard.populate('operator', 'name email');

    res.status(201).json({
      success: true,
      data: jobCard,
    });
  } catch (error: any) {
    console.error('Create job card error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/job-cards/:id
// @desc    Update job card
// @access  Private
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const jobCard = await JobCard.findById(req.params.id);

    if (!jobCard) {
      return res.status(404).json({ message: 'Job card not found' });
    }

    // Operators can only update their own job cards
    if (
      req.user?.role === 'operator' &&
      jobCard.operator.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // If completing, set end time
    if (req.body.status === 'completed' && !jobCard.endTime) {
      req.body.endTime = new Date();
    }

    // Calculate total cycle time
    if (req.body.steps) {
      const completedSteps = req.body.steps.filter(
        (s: any) => s.status === 'completed' && s.cycleTime
      );
      req.body.totalCycleTime = completedSteps.reduce(
        (sum: number, s: any) => sum + s.cycleTime,
        0
      );
    }

    const updatedJobCard = await JobCard.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('operator', 'name email');

    res.json({
      success: true,
      data: updatedJobCard,
    });
  } catch (error: any) {
    console.error('Update job card error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/job-cards/:id/log-issue
// @desc    Log issue on job card
// @access  Private
router.post('/:id/log-issue', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { type, description } = req.body;

    const jobCard = await JobCard.findById(req.params.id);

    if (!jobCard) {
      return res.status(404).json({ message: 'Job card not found' });
    }

    jobCard.issues.push({
      type,
      description,
      timestamp: new Date(),
      resolved: false,
    });

    await jobCard.save();

    // Get AI suggestions for the issue
    const aiInsights = await AIService.generateInsights(jobCard.line);

    res.json({
      success: true,
      data: {
        jobCard,
        aiInsights: aiInsights.filter(
          (insight) => insight.type === 'alert' || insight.type === 'recommendation'
        ),
      },
    });
  } catch (error: any) {
    console.error('Log issue error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;

