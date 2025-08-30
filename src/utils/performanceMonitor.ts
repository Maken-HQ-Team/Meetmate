/**
 * Performance monitoring and metrics collection for database operations
 */
export class PerformanceMonitor {
  private static metrics = new Map<string, PerformanceMetric[]>();
  private static cacheStats = new Map<string, CacheMetric>();
  private static readonly MAX_METRICS_PER_OPERATION = 100;

  /**
   * Start timing an operation
   */
  static startTiming(operationName: string): PerformanceTimer {
    return new PerformanceTimer(operationName);
  }

  /**
   * Record a completed operation
   */
  static recordOperation(
    operationName: string,
    duration: number,
    success: boolean,
    metadata?: Record<string, any>
  ): void {
    const metric: PerformanceMetric = {
      operationName,
      duration,
      success,
      timestamp: Date.now(),
      metadata: metadata || {}
    };

    // Get existing metrics for this operation
    const existingMetrics = this.metrics.get(operationName) || [];
    
    // Add new metric
    existingMetrics.push(metric);
    
    // Keep only the most recent metrics to prevent memory leaks
    if (existingMetrics.length > this.MAX_METRICS_PER_OPERATION) {
      existingMetrics.splice(0, existingMetrics.length - this.MAX_METRICS_PER_OPERATION);
    }
    
    this.metrics.set(operationName, existingMetrics);

    // Log performance warnings
    this.checkPerformanceThresholds(metric);
  }

  /**
   * Record cache hit/miss statistics
   */
  static recordCacheOperation(
    cacheKey: string,
    hit: boolean,
    fetchTime?: number
  ): void {
    const existing = this.cacheStats.get(cacheKey) || {
      hits: 0,
      misses: 0,
      totalFetchTime: 0,
      lastUpdated: Date.now()
    };

    if (hit) {
      existing.hits++;
    } else {
      existing.misses++;
      if (fetchTime) {
        existing.totalFetchTime += fetchTime;
      }
    }

    existing.lastUpdated = Date.now();
    this.cacheStats.set(cacheKey, existing);
  }

  /**
   * Get performance statistics for an operation
   */
  static getOperationStats(operationName: string): OperationStats | null {
    const metrics = this.metrics.get(operationName);
    if (!metrics || metrics.length === 0) {
      return null;
    }

    const durations = metrics.map(m => m.duration);
    const successCount = metrics.filter(m => m.success).length;
    const errorCount = metrics.length - successCount;

    return {
      operationName,
      totalOperations: metrics.length,
      successCount,
      errorCount,
      successRate: (successCount / metrics.length) * 100,
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      p95Duration: this.calculatePercentile(durations, 95),
      p99Duration: this.calculatePercentile(durations, 99),
      lastOperation: Math.max(...metrics.map(m => m.timestamp))
    };
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(cacheKey?: string): CacheStats {
    if (cacheKey) {
      const stats = this.cacheStats.get(cacheKey);
      if (!stats) {
        return {
          cacheKey,
          hits: 0,
          misses: 0,
          hitRate: 0,
          averageFetchTime: 0
        };
      }

      return {
        cacheKey,
        hits: stats.hits,
        misses: stats.misses,
        hitRate: stats.hits + stats.misses > 0 ? (stats.hits / (stats.hits + stats.misses)) * 100 : 0,
        averageFetchTime: stats.misses > 0 ? stats.totalFetchTime / stats.misses : 0
      };
    }

    // Aggregate stats for all caches
    let totalHits = 0;
    let totalMisses = 0;
    let totalFetchTime = 0;

    this.cacheStats.forEach(stats => {
      totalHits += stats.hits;
      totalMisses += stats.misses;
      totalFetchTime += stats.totalFetchTime;
    });

    return {
      cacheKey: 'all',
      hits: totalHits,
      misses: totalMisses,
      hitRate: totalHits + totalMisses > 0 ? (totalHits / (totalHits + totalMisses)) * 100 : 0,
      averageFetchTime: totalMisses > 0 ? totalFetchTime / totalMisses : 0
    };
  }

  /**
   * Get all operation statistics
   */
  static getAllOperationStats(): OperationStats[] {
    const stats: OperationStats[] = [];
    
    this.metrics.forEach((_, operationName) => {
      const operationStats = this.getOperationStats(operationName);
      if (operationStats) {
        stats.push(operationStats);
      }
    });

    return stats.sort((a, b) => b.lastOperation - a.lastOperation);
  }

  /**
   * Get performance dashboard data
   */
  static getDashboardData(): PerformanceDashboard {
    const operationStats = this.getAllOperationStats();
    const cacheStats = this.getCacheStats();

    // Find slow operations (> 2 seconds)
    const slowOperations = operationStats.filter(op => op.averageDuration > 2000);
    
    // Find operations with high error rates (> 10%)
    const errorProneOperations = operationStats.filter(op => op.successRate < 90);

    // Calculate overall health score
    const totalOperations = operationStats.reduce((sum, op) => sum + op.totalOperations, 0);
    const totalErrors = operationStats.reduce((sum, op) => sum + op.errorCount, 0);
    const overallErrorRate = totalOperations > 0 ? (totalErrors / totalOperations) * 100 : 0;
    const averageResponseTime = operationStats.length > 0 
      ? operationStats.reduce((sum, op) => sum + op.averageDuration, 0) / operationStats.length 
      : 0;

    let healthScore = 100;
    if (overallErrorRate > 5) healthScore -= 30;
    if (averageResponseTime > 2000) healthScore -= 20;
    if (cacheStats.hitRate < 70) healthScore -= 15;
    if (slowOperations.length > 0) healthScore -= 10;

    return {
      healthScore: Math.max(0, healthScore),
      totalOperations,
      overallErrorRate,
      averageResponseTime,
      cacheHitRate: cacheStats.hitRate,
      slowOperations,
      errorProneOperations,
      recentOperations: operationStats.slice(0, 10)
    };
  }

  /**
   * Clear old metrics to prevent memory leaks
   */
  static cleanup(): void {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago

    this.metrics.forEach((metrics, operationName) => {
      const filteredMetrics = metrics.filter(m => m.timestamp > cutoffTime);
      if (filteredMetrics.length === 0) {
        this.metrics.delete(operationName);
      } else {
        this.metrics.set(operationName, filteredMetrics);
      }
    });

    // Clean up cache stats older than 24 hours
    this.cacheStats.forEach((stats, cacheKey) => {
      if (stats.lastUpdated < cutoffTime) {
        this.cacheStats.delete(cacheKey);
      }
    });
  }

  /**
   * Check performance thresholds and log warnings
   */
  private static checkPerformanceThresholds(metric: PerformanceMetric): void {
    // Warn about slow operations
    if (metric.duration > 2000) {
      console.warn(`⚠️ Slow operation detected: ${metric.operationName} took ${metric.duration.toFixed(2)}ms`);
    }

    // Warn about very slow operations
    if (metric.duration > 5000) {
      console.error(`🚨 Very slow operation: ${metric.operationName} took ${metric.duration.toFixed(2)}ms`);
    }

    // Log errors
    if (!metric.success) {
      console.error(`❌ Operation failed: ${metric.operationName}`, metric.metadata);
    }
  }

  /**
   * Calculate percentile from array of numbers
   */
  private static calculatePercentile(values: number[], percentile: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }
}

/**
 * Performance timer utility
 */
export class PerformanceTimer {
  private startTime: number;
  private operationName: string;

  constructor(operationName: string) {
    this.operationName = operationName;
    this.startTime = performance.now();
  }

  /**
   * End timing and record the operation
   */
  end(success: boolean = true, metadata?: Record<string, any>): number {
    const duration = performance.now() - this.startTime;
    PerformanceMonitor.recordOperation(this.operationName, duration, success, metadata);
    return duration;
  }

  /**
   * Get current duration without ending the timer
   */
  getCurrentDuration(): number {
    return performance.now() - this.startTime;
  }
}

// Interfaces
export interface PerformanceMetric {
  operationName: string;
  duration: number;
  success: boolean;
  timestamp: number;
  metadata: Record<string, any>;
}

export interface CacheMetric {
  hits: number;
  misses: number;
  totalFetchTime: number;
  lastUpdated: number;
}

export interface OperationStats {
  operationName: string;
  totalOperations: number;
  successCount: number;
  errorCount: number;
  successRate: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  p95Duration: number;
  p99Duration: number;
  lastOperation: number;
}

export interface CacheStats {
  cacheKey: string;
  hits: number;
  misses: number;
  hitRate: number;
  averageFetchTime: number;
}

export interface PerformanceDashboard {
  healthScore: number;
  totalOperations: number;
  overallErrorRate: number;
  averageResponseTime: number;
  cacheHitRate: number;
  slowOperations: OperationStats[];
  errorProneOperations: OperationStats[];
  recentOperations: OperationStats[];
}

// Set up periodic cleanup
if (typeof window !== 'undefined') {
  setInterval(() => {
    PerformanceMonitor.cleanup();
  }, 60 * 60 * 1000); // Clean up every hour
}