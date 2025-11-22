import OEE from '../models/OEE';
import Scrap from '../models/Scrap';
import JobCard from '../models/JobCard';
import { DateRange } from '../types/common';

export class CalculationService {
  // Calculate OEE from components
  static calculateOEE(
    availability: number,
    performance: number,
    quality: number
  ): number {
    return (availability * performance * quality) / 10000;
  }

  // Calculate availability
  static calculateAvailability(
    plannedTime: number,
    downtime: number
  ): number {
    if (plannedTime === 0) return 0;
    return ((plannedTime - downtime) / plannedTime) * 100;
  }

  // Calculate performance
  static calculatePerformance(
    idealCycleTime: number,
    actualCycleTime: number,
    totalUnits: number
  ): number {
    if (idealCycleTime === 0 || totalUnits === 0) return 0;
    const idealTime = idealCycleTime * totalUnits;
    const actualTime = actualCycleTime * totalUnits;
    return (idealTime / actualTime) * 100;
  }

  // Calculate quality
  static calculateQuality(goodUnits: number, totalUnits: number): number {
    if (totalUnits === 0) return 0;
    return (goodUnits / totalUnits) * 100;
  }

  // Calculate throughput
  static async calculateThroughput(
    line?: string,
    dateRange?: DateRange
  ): Promise<number> {
    const query: any = {};
    if (line) query.line = line;
    if (dateRange) {
      query.date = {
        $gte: dateRange.start,
        $lte: dateRange.end,
      };
    }

    const oeeData = await OEE.find(query);
    return oeeData.reduce((sum, record) => sum + record.goodUnits, 0);
  }

  // Calculate lead time
  static async calculateLeadTime(
    line?: string,
    dateRange?: DateRange
  ): Promise<number> {
    const query: any = { status: 'completed' };
    if (line) query.line = line;
    if (dateRange) {
      query.startTime = {
        $gte: dateRange.start,
        $lte: dateRange.end,
      };
    }

    const jobs = await JobCard.find(query);
    if (jobs.length === 0) return 0;

    const totalLeadTime = jobs.reduce((sum, job) => {
      if (job.endTime && job.startTime) {
        return sum + (job.endTime.getTime() - job.startTime.getTime());
      }
      return sum;
    }, 0);

    return totalLeadTime / jobs.length / 1000 / 60; // Convert to minutes
  }

  // Calculate scrap percentage
  static async calculateScrapPercentage(
    line?: string,
    dateRange?: DateRange
  ): Promise<number> {
    const query: any = {};
    if (line) query.line = line;
    if (dateRange) {
      query.date = {
        $gte: dateRange.start,
        $lte: dateRange.end,
      };
    }

    const scrapData = await Scrap.find(query);
    const totalScrap = scrapData.reduce((sum, record) => sum + record.quantity, 0);

    const oeeQuery: any = {};
    if (line) oeeQuery.line = line;
    if (dateRange) {
      oeeQuery.date = {
        $gte: dateRange.start,
        $lte: dateRange.end,
      };
    }

    const oeeData = await OEE.find(oeeQuery);
    const totalUnits = oeeData.reduce((sum, record) => sum + record.totalUnits, 0);

    if (totalUnits === 0) return 0;
    return (totalScrap / totalUnits) * 100;
  }

  // Calculate cost savings
  static async calculateCostSavings(
    period: string,
    line?: string
  ): Promise<number> {
    // This would typically compare against baseline or previous period
    // For now, we'll use scrap cost reduction as a proxy
    const query: any = { period };
    if (line) query.line = line;

    // Implementation would compare current period vs baseline
    // Simplified for now
    return 0;
  }
}

