import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSharedAvailability } from '../useSharedAvailability';

// Mock dependencies
const mockUser = { id: 'user123' };
const mockToast = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser })
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast })
}));

const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({
          data: [],
          error: null
        })
      })),
      in: vi.fn(() => ({
        order: vi.fn(() => ({
          order: vi.fn().mockResolvedValue({
            data: [],
            error: null
          })
        }))
      })),
      limit: vi.fn().mockResolvedValue({
        data: [],
        error: null
      })
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: null
          })
        }))
      }))
    }))
  })),
  channel: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() })
  })),
  removeChannel: vi.fn()
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase
}));

// Mock profile cache
const mockProfileCache = {
  getCachedProfiles: vi.fn(() => ({ cached: {}, missing: [] })),
  batchFetch: vi.fn().mockResolvedValue([])
};

vi.mock('@/utils/profileCache', () => ({
  profileCache: mockProfileCache
}));

// Mock error handler
vi.mock('@/utils/errorHandling', () => ({
  ErrorHandler: {
    handleInfiniteLoop: vi.fn(() => true),
    retryOperation: vi.fn((operation) => operation()),
    handleDatabaseError: vi.fn(() => ({
      shouldRetry: false,
      userMessage: 'Test error',
      logMessage: 'Test log'
    }))
  }
}));

// Mock performance monitor
vi.mock('@/utils/performanceMonitor', () => ({
  PerformanceMonitor: {
    startTiming: vi.fn(() => ({
      getCurrentDuration: vi.fn(() => 100),
      end: vi.fn(() => 100)
    })),
    recordCacheOperation: vi.fn()
  }
}));

describe('useSharedAvailability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useSharedAvailability());

    expect(result.current.sharedSlots).toEqual([]);
    expect(result.current.profilesData).toEqual({});
    expect(result.current.loading).toBe(true);
    expect(result.current.refetch).toBeDefined();
    expect(result.current.fetchMyShares).toBeDefined();
  });

  it('should fetch shared availability on mount', async () => {
    const mockShares = [
      { owner_id: 'owner1' },
      { owner_id: 'owner2' }
    ];

    const mockAvailability = [
      {
        id: '1',
        user_id: 'owner1',
        day_of_week: 1,
        start_time: '09:00',
        end_time: '10:00',
        status: 'available',
        timezone: 'UTC',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      }
    ];

    // Mock shares query
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({
            data: mockShares,
            error: null
          })
        }))
      }))
    });

    // Mock availability query with foreign key
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        in: vi.fn(() => ({
          order: vi.fn(() => ({
            order: vi.fn().mockResolvedValue({
              data: mockAvailability,
              error: null
            })
          }))
        }))
      }))
    });

    // Mock profile cache
    mockProfileCache.getCachedProfiles.mockReturnValue({
      cached: {},
      missing: ['owner1', 'owner2']
    });

    mockProfileCache.batchFetch.mockResolvedValue([
      {
        user_id: 'owner1',
        name: 'Owner 1',
        email: 'owner1@example.com',
        country: 'US',
        bio: '',
        avatar_url: null,
        timezone: 'UTC'
      }
    ]);

    const { result } = renderHook(() => useSharedAvailability());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.sharedSlots).toHaveLength(1);
    expect(result.current.sharedSlots[0].userId).toBe('owner1');
  });

  it('should handle foreign key relationship errors gracefully', async () => {
    const relationshipError = {
      code: 'PGRST200',
      message: 'Could not find a relationship between tables'
    };

    // Mock shares query success
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({
            data: [{ owner_id: 'owner1' }],
            error: null
          })
        }))
      }))
    });

    // Mock availability query failure
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        in: vi.fn(() => ({
          order: vi.fn(() => ({
            order: vi.fn().mockRejectedValue(relationshipError)
          }))
        }))
      }))
    });

    const { result } = renderHook(() => useSharedAvailability());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Error",
        variant: "destructive"
      })
    );
  });

  it('should prevent infinite loops', async () => {
    const { ErrorHandler } = await import('@/utils/errorHandling');
    
    // Mock infinite loop detection
    (ErrorHandler.handleInfiniteLoop as any).mockReturnValue(false);

    const { result } = renderHook(() => useSharedAvailability());

    // Try to trigger fetch
    result.current.refetch();

    // Should not make any database calls
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('should use cached profiles when available', async () => {
    const mockShares = [{ owner_id: 'owner1' }];
    const mockAvailability = [
      {
        id: '1',
        user_id: 'owner1',
        day_of_week: 1,
        start_time: '09:00',
        end_time: '10:00',
        status: 'available',
        timezone: 'UTC',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      }
    ];

    const cachedProfile = {
      user_id: 'owner1',
      name: 'Cached Owner',
      email: 'cached@example.com',
      country: 'US',
      bio: '',
      avatar_url: null,
      timezone: 'UTC'
    };

    // Mock shares query
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({
            data: mockShares,
            error: null
          })
        }))
      }))
    });

    // Mock availability query
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        in: vi.fn(() => ({
          order: vi.fn(() => ({
            order: vi.fn().mockResolvedValue({
              data: mockAvailability,
              error: null
            })
          }))
        }))
      }))
    });

    // Mock cached profile
    mockProfileCache.getCachedProfiles.mockReturnValue({
      cached: { owner1: cachedProfile },
      missing: []
    });

    const { result } = renderHook(() => useSharedAvailability());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should not call batchFetch since profile is cached
    expect(mockProfileCache.batchFetch).not.toHaveBeenCalled();
    expect(result.current.profilesData.owner1).toEqual(
      expect.objectContaining(cachedProfile)
    );
  });

  it('should handle empty shares gracefully', async () => {
    // Mock empty shares
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({
            data: [],
            error: null
          })
        }))
      }))
    });

    const { result } = renderHook(() => useSharedAvailability());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.sharedSlots).toEqual([]);
    expect(result.current.profilesData).toEqual({});
  });

  it('should set up real-time subscriptions', () => {
    const mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn()
    };

    mockSupabase.channel.mockReturnValue(mockChannel);

    renderHook(() => useSharedAvailability());

    expect(mockSupabase.channel).toHaveBeenCalledWith(`shared-availability-${mockUser.id}`);
    expect(mockChannel.on).toHaveBeenCalledTimes(2); // shares and availability changes
    expect(mockChannel.subscribe).toHaveBeenCalled();
  });

  it('should clean up subscriptions on unmount', () => {
    const mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn()
    };

    mockSupabase.channel.mockReturnValue(mockChannel);

    const { unmount } = renderHook(() => useSharedAvailability());

    unmount();

    expect(mockSupabase.removeChannel).toHaveBeenCalledWith(mockChannel);
  });

  it('should debounce refetch calls', async () => {
    vi.useFakeTimers();

    const { result } = renderHook(() => useSharedAvailability());

    // Call refetch multiple times rapidly
    result.current.refetch();
    result.current.refetch();
    result.current.refetch();

    // Fast-forward time
    vi.advanceTimersByTime(300);

    // Should only make one call after debounce
    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledTimes(1);
    });

    vi.useRealTimers();
  });

  it('should update viewed_at timestamp for shares', async () => {
    const mockShares = [
      { owner_id: 'owner1' },
      { owner_id: 'owner2' }
    ];

    // Mock shares query
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({
            data: mockShares,
            error: null
          })
        }))
      }))
    });

    // Mock availability query
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        in: vi.fn(() => ({
          order: vi.fn(() => ({
            order: vi.fn().mockResolvedValue({
              data: [],
              error: null
            })
          }))
        }))
      }))
    });

    // Mock update query
    mockSupabase.from.mockReturnValue({
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({
              data: null,
              error: null
            })
          }))
        }))
      }))
    });

    renderHook(() => useSharedAvailability());

    await waitFor(() => {
      // Should update viewed_at for each share
      expect(mockSupabase.from().update).toHaveBeenCalledTimes(2);
    });
  });
});