import { Server as SocketIOServer } from 'socket.io';
import { AIService, AIInsight } from './aiService';
import OEE from '../models/OEE';
import Scrap from '../models/Scrap';
import JobCard from '../models/JobCard';

export interface Notification {
  id: string;
  type: 'alert' | 'info' | 'warning' | 'success';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  userId?: string;
  link?: string;
  read: boolean;
}

export class NotificationService {
  private io: SocketIOServer | null = null;
  private notifications: Map<string, Notification[]> = new Map();

  setSocketIO(io: SocketIOServer) {
    this.io = io;
  }

  // Send real-time notification
  sendNotification(userId: string, notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) {
    const fullNotification: Notification = {
      ...notification,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      read: false,
    };

    // Store notification
    if (!this.notifications.has(userId)) {
      this.notifications.set(userId, []);
    }
    this.notifications.get(userId)!.push(fullNotification);

    // Emit via socket
    if (this.io) {
      this.io.to(`user-${userId}`).emit('notification', fullNotification);
    }

    return fullNotification;
  }

  // Get user notifications
  getUserNotifications(userId: string, unreadOnly: boolean = false): Notification[] {
    const userNotifications = this.notifications.get(userId) || [];
    if (unreadOnly) {
      return userNotifications.filter((n) => !n.read);
    }
    return userNotifications;
  }

  // Mark notification as read
  markAsRead(userId: string, notificationId: string) {
    const userNotifications = this.notifications.get(userId);
    if (userNotifications) {
      const notification = userNotifications.find((n) => n.id === notificationId);
      if (notification) {
        notification.read = true;
      }
    }
  }

  // Monitor for real-time alerts
  async monitorAlerts() {
    try {
      // Check for high scrap rates
      const recentScrap = await Scrap.find({
        date: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      });

      const scrapByLine: { [key: string]: number } = {};
      recentScrap.forEach((s) => {
        scrapByLine[s.line] = (scrapByLine[s.line] || 0) + s.quantity;
      });

      Object.entries(scrapByLine).forEach(([line, quantity]) => {
        if (quantity > 50) {
          // Alert threshold
          this.broadcastAlert('supervisor', {
            type: 'warning',
            title: `High Scrap Rate: ${line}`,
            message: `${quantity} units scrapped in the last 24 hours`,
            priority: 'high',
            link: `/waste-quality/scrap-overview?line=${line}`,
          });
        }
      });

      // Check for high downtime
      const recentOEE = await OEE.find({
        date: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      });

      recentOEE.forEach((oee) => {
        const downtimePercent = (oee.downtime / oee.plannedProductionTime) * 100;
        if (downtimePercent > 20) {
          this.broadcastAlert('supervisor', {
            type: 'alert',
            title: `High Downtime: ${oee.station || oee.line}`,
            message: `${downtimePercent.toFixed(1)}% downtime detected`,
            priority: 'critical',
            link: `/operational-performance/oee?station=${oee.station}`,
          });
        }
      });

      // Check for abnormal cycle times
      const recentJobs = await JobCard.find({
        status: 'in-progress',
        startTime: { $gte: new Date(Date.now() - 4 * 60 * 60 * 1000) },
      });

      recentJobs.forEach(async (job) => {
        if (job.targetCycleTime > 0) {
          const currentCycleTime = job.totalCycleTime / Math.max(job.unitsCompleted, 1);
          if (currentCycleTime > job.targetCycleTime * 1.3) {
            this.sendNotification(job.operator.toString(), {
              type: 'warning',
              title: 'Cycle Time Alert',
              message: `Your current cycle time is ${((currentCycleTime / job.targetCycleTime - 1) * 100).toFixed(1)}% above target`,
              priority: 'medium',
              link: `/job-cards/${job._id}`,
            });
          }
        }
      });
    } catch (error) {
      console.error('Monitor alerts error:', error);
    }
  }

  // Broadcast alert to all users of a role
  broadcastAlert(role: string, notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) {
    if (this.io) {
      this.io.to(`role-${role}`).emit('notification', {
        ...notification,
        id: `${Date.now()}-${Math.random()}`,
        timestamp: new Date(),
        read: false,
      });
    }
  }

  // Send AI insights as notifications
  async sendAIInsights(userId: string, insights: AIInsight[]) {
    insights.forEach((insight) => {
      if (insight.priority === 'critical' || insight.priority === 'high') {
        this.sendNotification(userId, {
          type: insight.type === 'alert' ? 'alert' : 'info',
          title: insight.title,
          message: insight.description,
          priority: insight.priority,
        });
      }
    });
  }
}

export const notificationService = new NotificationService();

