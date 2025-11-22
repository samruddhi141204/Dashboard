import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cron from 'node-cron';

import mongoose from 'mongoose';
import { connectDatabase } from './config/database';
import { notificationService } from './services/notificationService';

// Routes
import authRoutes from './routes/auth';
import executiveSummaryRoutes from './routes/executiveSummary';
import operationalPerformanceRoutes from './routes/operationalPerformance';
import wasteQualityRoutes from './routes/wasteQuality';
import continuousImprovementRoutes from './routes/continuousImprovement';
import financialImpactRoutes from './routes/financialImpact';
import customerImpactRoutes from './routes/customerImpact';
import jobCardRoutes from './routes/jobCard';
import aiRoutes from './routes/ai';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/executive-summary', executiveSummaryRoutes);
app.use('/api/operational-performance', operationalPerformanceRoutes);
app.use('/api/waste-quality', wasteQualityRoutes);
app.use('/api/continuous-improvement', continuousImprovementRoutes);
app.use('/api/financial-impact', financialImpactRoutes);
app.use('/api/customer-impact', customerImpactRoutes);
app.use('/api/job-cards', jobCardRoutes);
app.use('/api/ai', aiRoutes);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Join user room
  socket.on('join-user', (userId: string) => {
    socket.join(`user-${userId}`);
    console.log(`User ${userId} joined their room`);
  });

  // Join role room
  socket.on('join-role', (role: string) => {
    socket.join(`role-${role}`);
    console.log(`User joined role room: ${role}`);
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Initialize notification service with Socket.IO
notificationService.setSocketIO(io);

// Scheduled tasks
// Run alert monitoring every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  console.log('Running alert monitoring...');
  await notificationService.monitorAlerts();
});

// Connect to database and start server
const startServer = async () => {
  try {
    await connectDatabase();
    
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});

