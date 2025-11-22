import express, { Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import CIProject from '../models/CIProject';
import Training from '../models/Training';
import User from '../models/User';

const router = express.Router();

// @route   GET /api/continuous-improvement/projects
// @desc    Get CI projects (Kanban board)
// @access  Private
router.get('/projects', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { status, priority, category, owner } = req.query;

    const query: any = {};
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (category) query.category = category;
    if (owner) query.owner = owner;

    const projects = await CIProject.find(query)
      .populate('owner', 'name email')
      .populate('teamMembers', 'name email')
      .sort({ createdAt: -1 });

    // Group by status for Kanban
    const kanban = {
      backlog: projects.filter((p) => p.status === 'backlog'),
      'in-progress': projects.filter((p) => p.status === 'in-progress'),
      review: projects.filter((p) => p.status === 'review'),
      completed: projects.filter((p) => p.status === 'completed'),
      cancelled: projects.filter((p) => p.status === 'cancelled'),
    };

    res.json({
      success: true,
      data: {
        projects,
        kanban,
      },
    });
  } catch (error: any) {
    console.error('CI projects error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/continuous-improvement/projects/:id
// @desc    Get single CI project
// @access  Private
router.get('/projects/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const project = await CIProject.findById(req.params.id)
      .populate('owner', 'name email')
      .populate('teamMembers', 'name email');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.json({
      success: true,
      data: project,
    });
  } catch (error: any) {
    console.error('Get CI project error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/continuous-improvement/projects
// @desc    Create CI project
// @access  Private
router.post('/projects', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const projectData = {
      ...req.body,
      owner: req.body.owner || req.user?.id,
    };

    const project = new CIProject(projectData);
    await project.save();

    await project.populate('owner', 'name email');
    await project.populate('teamMembers', 'name email');

    res.status(201).json({
      success: true,
      data: project,
    });
  } catch (error: any) {
    console.error('Create CI project error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/continuous-improvement/projects/:id
// @desc    Update CI project
// @access  Private
router.put('/projects/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const project = await CIProject.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('owner', 'name email')
      .populate('teamMembers', 'name email');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.json({
      success: true,
      data: project,
    });
  } catch (error: any) {
    console.error('Update CI project error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/continuous-improvement/engagement
// @desc    Get employee engagement trends
// @access  Private (Manager+)
router.get('/engagement', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const query: any = {
      createdAt: { $gte: start, $lte: end },
    };

    const projects = await CIProject.find(query);

    // Calculate engagement metrics
    const engagementData = projects.map((project) => ({
      date: project.createdAt,
      engagement: project.employeeEngagement || 0,
      changeAdoption: project.changeAdoptionRate || 0,
      projectId: project._id,
      projectTitle: project.title,
    }));

    const avgEngagement = engagementData.length > 0
      ? engagementData.reduce((sum, d) => sum + d.engagement, 0) / engagementData.length
      : 0;

    res.json({
      success: true,
      data: {
        averageEngagement: avgEngagement,
        trends: engagementData,
      },
    });
  } catch (error: any) {
    console.error('Engagement trends error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/continuous-improvement/training
// @desc    Get training & skill matrix
// @access  Private
router.get('/training', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { employee, skill, status } = req.query;

    const query: any = {};
    if (employee) query.employee = employee;
    if (skill) query.skill = skill;
    if (status) query.status = status;

    const trainings = await Training.find(query)
      .populate('employee', 'name email role department');

    // Build skill matrix
    const employees = await User.find({ role: { $in: ['operator', 'supervisor'] } });
    const skills = [...new Set(trainings.map((t) => t.skill))];

    const skillMatrix = employees.map((emp) => {
      const empTrainings = trainings.filter((t) => t.employee.toString() === emp._id.toString());
      const skillsMap: { [key: string]: string } = {};

      skills.forEach((skill) => {
        const training = empTrainings.find((t) => t.skill === skill);
        skillsMap[skill] = training ? training.level : 'not-trained';
      });

      return {
        employee: {
          id: emp._id,
          name: emp.name,
          email: emp.email,
          role: emp.role,
        },
        skills: skillsMap,
      };
    });

    res.json({
      success: true,
      data: {
        trainings,
        skillMatrix,
      },
    });
  } catch (error: any) {
    console.error('Training matrix error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/continuous-improvement/training
// @desc    Create training record
// @access  Private
router.post('/training', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const training = new Training(req.body);
    await training.save();

    await training.populate('employee', 'name email');

    res.status(201).json({
      success: true,
      data: training,
    });
  } catch (error: any) {
    console.error('Create training error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/continuous-improvement/change-adoption
// @desc    Get change adoption metrics
// @access  Private (Manager+)
router.get('/change-adoption', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const projects = await CIProject.find({
      status: { $in: ['in-progress', 'review', 'completed'] },
    });

    const adoptionMetrics = projects.map((project) => ({
      projectId: project._id,
      projectTitle: project.title,
      changeAdoptionRate: project.changeAdoptionRate || 0,
      employeeEngagement: project.employeeEngagement || 0,
      status: project.status,
      createdAt: project.createdAt,
    }));

    const avgAdoption = adoptionMetrics.length > 0
      ? adoptionMetrics.reduce((sum, m) => sum + m.changeAdoptionRate, 0) / adoptionMetrics.length
      : 0;

    res.json({
      success: true,
      data: {
        averageAdoption: avgAdoption,
        metrics: adoptionMetrics,
      },
    });
  } catch (error: any) {
    console.error('Change adoption error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;

