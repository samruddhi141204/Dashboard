import axios from 'axios';
import OEE from '../models/OEE';
import Scrap from '../models/Scrap';
import JobCard from '../models/JobCard';

export interface AIInsight {
  type: 'anomaly' | 'opportunity' | 'alert' | 'recommendation';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  impact?: {
    timeSaved?: number;
    costImpact?: number;
    scrapReduction?: number;
  };
  actionable: boolean;
  actionItems?: string[];
}

export interface OptimizationSuggestion {
  area: string;
  currentValue: number;
  suggestedValue: number;
  improvement: number;
  impact: {
    timeSaved?: number;
    costImpact?: number;
    scrapReduction?: number;
  };
  confidence: number; // 0-100
}

export interface Prediction {
  metric: string;
  currentValue: number;
  predictedValue: number;
  timeframe: string;
  confidence: number;
}

export class AIService {
  private static aiServiceUrl = process.env.AI_SERVICE_URL;
  private static aiApiKey = process.env.AI_API_KEY;

  // AI Insight Engine - Detect anomalies and opportunities
  static async generateInsights(
    line?: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<AIInsight[]> {
    const insights: AIInsight[] = [];

    try {
      // Analyze cycle time anomalies
      const cycleTimeInsights = await this.detectCycleTimeAnomalies(line, dateRange);
      insights.push(...cycleTimeInsights);

      // Analyze scrap patterns
      const scrapInsights = await this.detectScrapPatterns(line, dateRange);
      insights.push(...scrapInsights);

      // Analyze downtime patterns
      const downtimeInsights = await this.detectDowntimePatterns(line, dateRange);
      insights.push(...downtimeInsights);

      // If external AI service is available, enhance insights
      if (this.aiServiceUrl && this.aiApiKey) {
        const enhancedInsights = await this.enhanceWithExternalAI(insights);
        return enhancedInsights;
      }

      return insights;
    } catch (error) {
      console.error('Error generating AI insights:', error);
      return insights;
    }
  }

  // Detect cycle time anomalies
  private static async detectCycleTimeAnomalies(
    line?: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<AIInsight[]> {
    const query: any = {};
    if (line) query.line = line;
    if (dateRange) {
      query.date = {
        $gte: dateRange.start,
        $lte: dateRange.end,
      };
    }

    const oeeData = await OEE.find(query).sort({ date: -1 }).limit(100);
    if (oeeData.length < 10) return [];

    const insights: AIInsight[] = [];

    // Calculate average cycle time
    const avgCycleTime =
      oeeData.reduce((sum, record) => sum + record.actualCycleTime, 0) /
      oeeData.length;

    // Find stations with cycle time > 20% above average
    const recentData = oeeData.slice(0, 7); // Last 7 records
    recentData.forEach((record) => {
      if (record.actualCycleTime > avgCycleTime * 1.2) {
        insights.push({
          type: 'anomaly',
          title: `High Cycle Time at ${record.station || record.line}`,
          description: `Cycle time is ${(
            ((record.actualCycleTime - avgCycleTime) / avgCycleTime) *
            100
          ).toFixed(1)}% above average`,
          priority: 'high',
          impact: {
            timeSaved: record.actualCycleTime - avgCycleTime,
          },
          actionable: true,
          actionItems: [
            'Review workstation setup',
            'Check for material flow issues',
            'Verify operator training',
          ],
        });
      }
    });

    return insights;
  }

  // Detect scrap patterns
  private static async detectScrapPatterns(
    line?: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<AIInsight[]> {
    const query: any = {};
    if (line) query.line = line;
    if (dateRange) {
      query.date = {
        $gte: dateRange.start,
        $lte: dateRange.end,
      };
    }

    const scrapData = await Scrap.find(query).sort({ date: -1 }).limit(100);
    if (scrapData.length === 0) return [];

    const insights: AIInsight[] = [];

    // Group by defect type
    const defectCounts: { [key: string]: number } = {};
    scrapData.forEach((record) => {
      defectCounts[record.defectType] =
        (defectCounts[record.defectType] || 0) + record.quantity;
    });

    // Find top defect types
    const sortedDefects = Object.entries(defectCounts).sort(
      (a, b) => b[1] - a[1]
    );
    const topDefect = sortedDefects[0];

    if (topDefect && topDefect[1] > 10) {
      insights.push({
        type: 'opportunity',
        title: `High Scrap Rate: ${topDefect[0]}`,
        description: `${topDefect[1]} units scrapped due to ${topDefect[0]}`,
        priority: 'high',
        impact: {
          scrapReduction: topDefect[1] * 0.5, // Potential 50% reduction
        },
        actionable: true,
        actionItems: [
          'Investigate root cause',
          'Review quality control procedures',
          'Consider tooling/material changes',
        ],
      });
    }

    return insights;
  }

  // Detect downtime patterns
  private static async detectDowntimePatterns(
    line?: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<AIInsight[]> {
    const query: any = {};
    if (line) query.line = line;
    if (dateRange) {
      query.date = {
        $gte: dateRange.start,
        $lte: dateRange.end,
      };
    }

    const oeeData = await OEE.find(query).sort({ date: -1 }).limit(50);
    if (oeeData.length === 0) return [];

    const insights: AIInsight[] = [];

    // Find records with high downtime
    oeeData.forEach((record) => {
      const downtimePercent = (record.downtime / record.plannedProductionTime) * 100;
      if (downtimePercent > 15) {
        insights.push({
          type: 'alert',
          title: `High Downtime at ${record.station || record.line}`,
          description: `${downtimePercent.toFixed(1)}% downtime on ${record.date.toISOString().split('T')[0]}`,
          priority: 'critical',
          actionable: true,
          actionItems: [
            'Review downtime reasons',
            'Check equipment maintenance schedule',
            'Investigate root causes',
          ],
        });
      }
    });

    return insights;
  }

  // Process Optimization Engine
  static async generateOptimizationSuggestions(
    line: string,
    station?: string
  ): Promise<OptimizationSuggestion[]> {
    const suggestions: OptimizationSuggestion[] = [];

    const query: any = { line };
    if (station) query.station = station;

    const oeeData = await OEE.find(query).sort({ date: -1 }).limit(30);

    if (oeeData.length > 0) {
      const avgCycleTime =
        oeeData.reduce((sum, r) => sum + r.actualCycleTime, 0) / oeeData.length;
      const idealCycleTime = oeeData[0].idealCycleTime;

      if (avgCycleTime > idealCycleTime * 1.1) {
        suggestions.push({
          area: 'Cycle Time',
          currentValue: avgCycleTime,
          suggestedValue: idealCycleTime,
          improvement: ((avgCycleTime - idealCycleTime) / avgCycleTime) * 100,
          impact: {
            timeSaved: avgCycleTime - idealCycleTime,
          },
          confidence: 75,
        });
      }
    }

    return suggestions;
  }

  // What-If Simulator
  static async runSimulation(params: {
    line: string;
    operators?: number;
    shiftLength?: number;
    cycleTimeAdjustment?: number;
  }): Promise<{
    predictedThroughput: number;
    predictedScrap: number;
    predictedOEE: number;
    costImpact: number;
  }> {
    // Simplified simulation logic
    // In production, this would use more sophisticated models
    const baseOEE = await OEE.findOne({ line: params.line })
      .sort({ date: -1 })
      .limit(1);

    if (!baseOEE) {
      throw new Error('No historical data found for simulation');
    }

    // Validate idealCycleTime
    if (!baseOEE.idealCycleTime || baseOEE.idealCycleTime <= 0) {
      throw new Error('Invalid ideal cycle time in historical data. Cannot perform simulation.');
    }

    const cycleTimeMultiplier = params.cycleTimeAdjustment || 1;
    const predictedCycleTime = baseOEE.idealCycleTime * cycleTimeMultiplier;
    
    // Validate predictedCycleTime to prevent division by zero
    if (predictedCycleTime <= 0) {
      throw new Error('Invalid predicted cycle time. Cycle time must be greater than 0.');
    }

    const shiftMinutes = (params.shiftLength || 8) * 60;
    const availableTime = shiftMinutes - baseOEE.downtime;
    const predictedUnits = availableTime / predictedCycleTime;
    const predictedScrap = predictedUnits * (1 - baseOEE.quality / 100);
    const predictedGoodUnits = predictedUnits - predictedScrap;

    return {
      predictedThroughput: predictedGoodUnits,
      predictedScrap: predictedScrap,
      predictedOEE: baseOEE.oee * (1 / cycleTimeMultiplier),
      costImpact: predictedScrap * 50, // Simplified cost calculation
    };
  }

  // Predictive Visualizations
  static async generatePredictions(
    metric: 'leadTime' | 'throughput' | 'scrap' | 'oee',
    line?: string,
    days: number = 30
  ): Promise<Prediction[]> {
    // Simplified prediction logic
    // In production, this would use time series forecasting
    const predictions: Prediction[] = [];

    const query: any = {};
    if (line) query.line = line;

    const historicalData = await OEE.find(query)
      .sort({ date: -1 })
      .limit(30);

    if (historicalData.length > 0) {
      const recentAvg =
        historicalData.slice(0, 7).reduce((sum, r) => {
          switch (metric) {
            case 'oee':
              return sum + r.oee;
            case 'throughput':
              return sum + r.goodUnits;
            default:
              return sum;
          }
        }, 0) / Math.min(7, historicalData.length);

      predictions.push({
        metric,
        currentValue: recentAvg,
        predictedValue: recentAvg * 1.02, // Simplified: 2% improvement
        timeframe: `${days} days`,
        confidence: 70,
      });
    }

    return predictions;
  }

  // Enhance insights with external AI service
  private static async enhanceWithExternalAI(
    insights: AIInsight[]
  ): Promise<AIInsight[]> {
    try {
      const response = await axios.post(
        `${this.aiServiceUrl}/enhance-insights`,
        { insights },
        {
          headers: {
            Authorization: `Bearer ${this.aiApiKey}`,
          },
        }
      );
      return response.data.enhancedInsights || insights;
    } catch (error) {
      console.error('External AI service error:', error);
      return insights;
    }
  }
}

