import express, { Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import Customer from '../models/Customer';

const router = express.Router();

// @route   GET /api/customer-impact/csat
// @desc    Get CSAT index
// @access  Private (Manager+)
router.get('/csat', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, customerId, region } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const query: any = {
      feedbackDate: { $gte: start, $lte: end },
    };
    if (customerId) query.customerId = customerId;
    if (region) query.region = region;

    const customerData = await Customer.find(query);

    const avgCSAT = customerData.length > 0
      ? customerData.reduce((sum, c) => sum + c.satisfactionScore, 0) / customerData.length
      : 0;

    // Group by feedback type
    const feedbackTypes: { [key: string]: number[] } = {};
    customerData.forEach((record) => {
      if (!feedbackTypes[record.feedbackType]) {
        feedbackTypes[record.feedbackType] = [];
      }
      feedbackTypes[record.feedbackType].push(record.satisfactionScore);
    });

    const feedbackBreakdown = Object.entries(feedbackTypes).map(([type, scores]) => ({
      type,
      averageScore: scores.reduce((sum, s) => sum + s, 0) / scores.length,
      count: scores.length,
    }));

    res.json({
      success: true,
      data: {
        averageCSAT: avgCSAT,
        totalResponses: customerData.length,
        feedbackBreakdown,
        trends: customerData.map((c) => ({
          date: c.feedbackDate,
          score: c.satisfactionScore,
          type: c.feedbackType,
          customer: c.customerName,
        })),
      },
    });
  } catch (error: any) {
    console.error('CSAT index error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/customer-impact/on-time-delivery
// @desc    Get on-time delivery metrics
// @access  Private (Manager+)
router.get('/on-time-delivery', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, customerId, product, region } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const query: any = {
      orderDate: { $gte: start, $lte: end },
    };
    if (customerId) query.customerId = customerId;
    if (product) query.product = product;
    if (region) query.region = region;

    const orders = await Customer.find(query);

    const onTimeCount = orders.filter((o) => o.onTimeDelivery).length;
    const onTimePercentage = orders.length > 0 ? (onTimeCount / orders.length) * 100 : 0;

    const lateOrders = orders.filter((o) => !o.onTimeDelivery);
    const avgDaysLate = lateOrders.length > 0
      ? lateOrders.reduce((sum, o) => sum + (o.daysLate || 0), 0) / lateOrders.length
      : 0;

    res.json({
      success: true,
      data: {
        onTimePercentage,
        totalOrders: orders.length,
        onTimeOrders: onTimeCount,
        lateOrders: lateOrders.length,
        averageDaysLate: avgDaysLate,
        breakdown: orders.map((o) => ({
          orderId: o.orderId,
          customer: o.customerName,
          product: o.product,
          promisedDate: o.promisedDeliveryDate,
          actualDate: o.actualDeliveryDate,
          onTime: o.onTimeDelivery,
          daysLate: o.daysLate,
        })),
      },
    });
  } catch (error: any) {
    console.error('On-time delivery error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/customer-impact/feedback-patterns
// @desc    Get customer feedback patterns
// @access  Private (Manager+)
router.get('/feedback-patterns', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, customerId } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const query: any = {
      feedbackDate: { $gte: start, $lte: end },
    };
    if (customerId) query.customerId = customerId;

    const feedbackData = await Customer.find(query);

    // Group by complaint category
    const complaintCategories: { [key: string]: number } = {};
    feedbackData.forEach((record) => {
      if (record.complaintCategory) {
        complaintCategories[record.complaintCategory] =
          (complaintCategories[record.complaintCategory] || 0) + 1;
      }
    });

    // Group by feedback type
    const feedbackTypes: { [key: string]: number } = {};
    feedbackData.forEach((record) => {
      feedbackTypes[record.feedbackType] = (feedbackTypes[record.feedbackType] || 0) + 1;
    });

    // Resolution status
    const resolutionStatus: { [key: string]: number } = {};
    feedbackData.forEach((record) => {
      if (record.resolutionStatus) {
        resolutionStatus[record.resolutionStatus] =
          (resolutionStatus[record.resolutionStatus] || 0) + 1;
      }
    });

    res.json({
      success: true,
      data: {
        complaintCategories,
        feedbackTypes,
        resolutionStatus,
        patterns: feedbackData.map((f) => ({
          date: f.feedbackDate,
          type: f.feedbackType,
          category: f.complaintCategory,
          score: f.satisfactionScore,
          customer: f.customerName,
          resolution: f.resolutionStatus,
        })),
      },
    });
  } catch (error: any) {
    console.error('Feedback patterns error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/customer-impact
// @desc    Create customer feedback/delivery record
// @access  Private
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const customerData = req.body;

    // Calculate on-time delivery if actual date provided
    if (customerData.actualDeliveryDate && customerData.promisedDeliveryDate) {
      const actual = new Date(customerData.actualDeliveryDate);
      const promised = new Date(customerData.promisedDeliveryDate);
      customerData.onTimeDelivery = actual <= promised;
      if (!customerData.onTimeDelivery) {
        customerData.daysLate = Math.ceil(
          (actual.getTime() - promised.getTime()) / (1000 * 60 * 60 * 24)
        );
      }
    }

    const customer = new Customer(customerData);
    await customer.save();

    res.status(201).json({
      success: true,
      data: customer,
    });
  } catch (error: any) {
    console.error('Create customer record error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;

