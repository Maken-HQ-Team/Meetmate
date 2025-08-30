import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PerformanceMonitor, PerformanceTimer } from '../performanceMonitor';

describe('PerformanceMonitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear metrics between tests
    (PerformanceMonitor as any).metrics.clear();
    (PerformanceMonitor as any).cacheStats.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('recordOperation', () => {
    it('should record successful operation', () => {
      PerformanceMonitor.recordOperation('testOperation', 100, true, { test: 'data' });

      const stats = PerformanceMonitor.getOperationStats('testOperation');
      expect(stats).not.toBeNull();
      expect(stats!.operationName).toBe('testOperation');
      expect(stats!.totalOperations).toBe(1);
      expect(stats!.successCount).toBe(1);
      expect(stats!.errorCount).toBe(0);
      expect(stats!.successRate).toBe(100);
      expect(stats!.averageDuration).toBe(100);
    });

    it('should record failed operation', () => {
      PerformanceMonitor.recordOperation('testOperation', 200, false);

      const stats = PerformanceMonitor.getOperationStats('testOperation');
      expect(stats!.successCount).toBe(0);
      expect(stats!.errorCount).toBe(1);
      expect(stats!.successRate).toBe(0);
    });

    it('should limit metrics per operation', () => {
      // Record more than MAX_METRICS_PER_OPERATION
      for (let i = 0; i < 150; i++) {
        PerformanceMonitor.recordOperation('testOperation', i, true);
      }

      const stats = PerformanceMonitor.getOperationStats('testOperation');
      expect(stats!.totalOperations).toBe(100); // Should be limited to MAX_METRICS_PER_OPERATION
    });

    it('should log performance warnings for slow operations', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      PerformanceMonitor.recordOperation('slowOperation', 3000, true);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Slow operation detected')
      );

      consoleSpy.mockRestore();
    });

    it('should log errors for very slow operations', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      PerformanceMonitor.recordOperation('verySlowOperation', 6000, true);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Very slow operation')
      );

      consoleSpy.mockRestore();
    });

    it('should log errors for failed operations', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      PerformanceMonitor.recordOperation('failedOperation', 100, false, { error: 'test' });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Operation failed'),
        expect.objectContaining({ error: 'test' })
      );

      consoleSpy.mockRestore();
    });
  });

  describe('recordCacheOperation', () => {
    it('should record cache hits', () => {
      PerformanceMonitor.recordCacheOperation('testCache', true);
      PerformanceMonitor.recordCacheOperation('testCache', true);
      PerformanceMonitor.recordCacheOperation('testCache', false, 100);

      const stats = PerformanceMonitor.getCacheStats('testCache');
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(66.66666666666666);
      expect(stats.averageFetchTime).toBe(100);
    });

    it('should handle cache misses with fetch time', () => {
      PerformanceMonitor.recordCacheOperation('testCache', false, 150);
      PerformanceMonitor.recordCacheOperation('testCache', false, 250);

      const stats = PerformanceMonitor.getCacheStats('testCache');
      expect(stats.misses).toBe(2);
      expect(stats.averageFetchTime).toBe(200);
    });
  });

  describe('getOperationStats', () => {
    it('should return null for non-existent operation', () => {
      const stats = PerformanceMonitor.getOperationStats('nonExistent');
      expect(stats).toBeNull();
    });

    it('should calculate percentiles correctly', () => {
      const durations = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
      durations.forEach(duration => {
        PerformanceMonitor.recordOperation('testOperation', duration, true);
      });

      const stats = PerformanceMonitor.getOperationStats('testOperation');
      expect(stats!.minDuration).toBe(100);
      expect(stats!.maxDuration).toBe(1000);
      expect(stats!.averageDuration).toBe(550);
      expect(stats!.p95Duration).toBe(1000); // 95th percentile
      expect(stats!.p99Duration).toBe(1000); // 99th percentile
    });
  });

  describe('getCacheStats', () => {
    it('should return empty stats for non-existent cache', () => {
      const stats = PerformanceMonitor.getCacheStats('nonExistent');
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.hitRate).toBe(0);
      expect(stats.averageFetchTime).toBe(0);
    });

    it('should aggregate stats for all caches', () => {
      PerformanceMonitor.recordCacheOperation('cache1', true);
      PerformanceMonitor.recordCacheOperation('cache1', false, 100);
      PerformanceMonitor.recordCacheOperation('cache2', true);
      PerformanceMonitor.recordCacheOperation('cache2', false, 200);

      const stats = PerformanceMonitor.getCacheStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(2);
      expect(stats.hitRate).toBe(50);
      expect(stats.averageFetchTime).toBe(150);
    });
  });

  describe('getDashboardData', () => {
    it('should calculate health score correctly', () => {
      // Add some operations with good performance
      PerformanceMonitor.recordOperation('goodOperation', 500, true);
      PerformanceMonitor.recordOperation('goodOperation', 600, true);
      
      // Add cache hits
      PerformanceMonitor.recordCacheOperation('cache', true);
      PerformanceMonitor.recordCacheOperation('cache', true);

      const dashboard = PerformanceMonitor.getDashboardData();
      
      expect(dashboard.healthScore).toBeGreaterThan(80);
      expect(dashboard.totalOperations).toBe(2);
      expect(dashboard.overallErrorRate).toBe(0);
      expect(dashboard.cacheHitRate).toBe(100);
    });

    it('should identify slow operations', () => {
      PerformanceMonitor.recordOperation('slowOperation', 3000, true);
      PerformanceMonitor.recordOperation('slowOperation', 4000, true);

      const dashboard = PerformanceMonitor.getDashboardData();
      
      expect(dashboard.slowOperations).toHaveLength(1);
      expect(dashboard.slowOperations[0].operationName).toBe('slowOperation');
    });

    it('should identify error-prone operations', () => {
      // Add operation with high error rate
      for (let i = 0; i < 10; i++) {
        PerformanceMonitor.recordOperation('errorProneOperation', 100, i < 8); // 80% success rate
      }

      const dashboard = PerformanceMonitor.getDashboardData();
      
      expect(dashboard.errorProneOperations).toHaveLength(1);
      expect(dashboard.errorProneOperations[0].operationName).toBe('errorProneOperation');
      expect(dashboard.errorProneOperations[0].successRate).toBe(80);
    });

    it('should reduce health score for poor performance', () => {
      // Add slow operations
      PerformanceMonitor.recordOperation('slowOperation', 3000, true);
      
      // Add high error rate
      for (let i = 0; i < 10; i++) {
        PerformanceMonitor.recordOperation('errorOperation', 100, i < 5); // 50% success rate
      }
      
      // Add poor cache performance
      PerformanceMonitor.recordCacheOperation('cache', false, 100);
      PerformanceMonitor.recordCacheOperation('cache', false, 100);

      const dashboard = PerformanceMonitor.getDashboardData();
      
      expect(dashboard.healthScore).toBeLessThan(50);
    });
  });

  describe('cleanup', () => {
    it('should remove old metrics', () => {
      // Mock Date.now to control time
      const originalNow = Date.now;
      const mockNow = vi.fn();
      Date.now = mockNow;

      // Set current time
      const currentTime = 1000000000000;
      mockNow.mockReturnValue(currentTime);

      // Add old metric (25 hours ago)
      const oldTime = currentTime - (25 * 60 * 60 * 1000);
      (PerformanceMonitor as any).metrics.set('oldOperation', [{
        operationName: 'oldOperation',
        duration: 100,
        success: true,
        timestamp: oldTime,
        metadata: {}
      }]);

      // Add recent metric
      PerformanceMonitor.recordOperation('recentOperation', 100, true);

      PerformanceMonitor.cleanup();

      expect(PerformanceMonitor.getOperationStats('oldOperation')).toBeNull();
      expect(PerformanceMonitor.getOperationStats('recentOperation')).not.toBeNull();

      // Restore Date.now
      Date.now = originalNow;
    });

    it('should remove old cache stats', () => {
      const originalNow = Date.now;
      const mockNow = vi.fn();
      Date.now = mockNow;

      const currentTime = 1000000000000;
      mockNow.mockReturnValue(currentTime);

      // Add old cache stats
      const oldTime = currentTime - (25 * 60 * 60 * 1000);
      (PerformanceMonitor as any).cacheStats.set('oldCache', {
        hits: 1,
        misses: 1,
        totalFetchTime: 100,
        lastUpdated: oldTime
      });

      // Add recent cache stats
      PerformanceMonitor.recordCacheOperation('recentCache', true);

      PerformanceMonitor.cleanup();

      expect(PerformanceMonitor.getCacheStats('oldCache').hits).toBe(0);
      expect(PerformanceMonitor.getCacheStats('recentCache').hits).toBe(1);

      Date.now = originalNow;
    });
  });
});

describe('PerformanceTimer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (PerformanceMonitor as any).metrics.clear();
  });

  it('should measure operation duration', () => {
    const timer = new PerformanceTimer('testOperation');
    
    // Mock performance.now to control timing
    const mockPerformanceNow = vi.spyOn(performance, 'now');
    mockPerformanceNow.mockReturnValueOnce(1000); // Start time
    mockPerformanceNow.mockReturnValueOnce(1500); // End time

    const duration = timer.end(true);

    expect(duration).toBe(500);
    
    const stats = PerformanceMonitor.getOperationStats('testOperation');
    expect(stats!.averageDuration).toBe(500);

    mockPerformanceNow.mockRestore();
  });

  it('should get current duration without ending timer', () => {
    const mockPerformanceNow = vi.spyOn(performance, 'now');
    mockPerformanceNow.mockReturnValueOnce(1000); // Start time
    
    const timer = new PerformanceTimer('testOperation');
    
    mockPerformanceNow.mockReturnValueOnce(1300); // Current time
    
    const currentDuration = timer.getCurrentDuration();
    expect(currentDuration).toBe(300);

    mockPerformanceNow.mockRestore();
  });

  it('should record operation with metadata', () => {
    const timer = new PerformanceTimer('testOperation');
    
    const mockPerformanceNow = vi.spyOn(performance, 'now');
    mockPerformanceNow.mockReturnValueOnce(1000);
    mockPerformanceNow.mockReturnValueOnce(1200);

    timer.end(true, { userId: 'test123', action: 'fetch' });

    const stats = PerformanceMonitor.getOperationStats('testOperation');
    expect(stats!.totalOperations).toBe(1);

    mockPerformanceNow.mockRestore();
  });

  it('should record failed operations', () => {
    const timer = new PerformanceTimer('testOperation');
    
    const mockPerformanceNow = vi.spyOn(performance, 'now');
    mockPerformanceNow.mockReturnValueOnce(1000);
    mockPerformanceNow.mockReturnValueOnce(1100);

    timer.end(false);

    const stats = PerformanceMonitor.getOperationStats('testOperation');
    expect(stats!.successCount).toBe(0);
    expect(stats!.errorCount).toBe(1);

    mockPerformanceNow.mockRestore();
  });
});