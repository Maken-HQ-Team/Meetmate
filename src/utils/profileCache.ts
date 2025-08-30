import { supabase } from '@/integrations/supabase/client';
import { ErrorHandler } from './errorHandling';

export interface ProfileData {
  user_id: string;
  name: string;
  email: string;
  country: string;
  bio: string;
  avatar_url: string;
  timezone: string;
  // Cache metadata
  _cached_at?: number;
  _cache_ttl?: number;
}

interface CachedProfile {
  data: ProfileData;
  timestamp: number;
}

/**
 * Profile Cache Manager with TTL-based caching and batch fetching
 */
export class ProfileCacheManager {
  private cache = new Map<string, CachedProfile>();
  private activeRequests = new Map<string, Promise<ProfileData[]>>();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_BATCH_SIZE = 50; // Maximum profiles to fetch in one batch

  /**
   * Get cached profile if still valid
   */
  getCachedProfile(userId: string): ProfileData | null {
    const cached = this.cache.get(userId);
    if (cached && Date.now() - cached.timestamp < this.TTL) {
      return {
        ...cached.data,
        _cached_at: cached.timestamp,
        _cache_ttl: this.TTL
      };
    }
    
    // Remove expired cache entry
    if (cached) {
      this.cache.delete(userId);
    }
    
    return null;
  }

  /**
   * Cache profile data
   */
  setCachedProfile(userId: string, data: ProfileData): void {
    this.cache.set(userId, {
      data: { ...data },
      timestamp: Date.now()
    });
  }

  /**
   * Get multiple cached profiles and return missing ones
   */
  getCachedProfiles(userIds: string[]): {
    cached: Record<string, ProfileData>;
    missing: string[];
  } {
    const cached: Record<string, ProfileData> = {};
    const missing: string[] = [];
    
    userIds.forEach(userId => {
      const cachedProfile = this.getCachedProfile(userId);
      if (cachedProfile) {
        cached[userId] = cachedProfile;
      } else {
        missing.push(userId);
      }
    });
    
    return { cached, missing };
  }

  /**
   * Batch fetch profiles from database
   */
  async batchFetch(userIds: string[]): Promise<ProfileData[]> {
    if (userIds.length === 0) return [];
    
    // Limit batch size to prevent large queries
    const limitedUserIds = userIds.slice(0, this.MAX_BATCH_SIZE);
    
    // Create request key for deduplication
    const requestKey = limitedUserIds.sort().join(',');
    
    // Check if request is already in progress
    let activeRequest = this.activeRequests.get(requestKey);
    
    if (!activeRequest) {
      activeRequest = this.executeBatchFetch(limitedUserIds);
      this.activeRequests.set(requestKey, activeRequest);
      
      // Clean up active request when done
      activeRequest.finally(() => {
        this.activeRequests.delete(requestKey);
      });
    }
    
    return activeRequest;
  }

  /**
   * Execute the actual batch fetch with error handling
   */
  private async executeBatchFetch(userIds: string[]): Promise<ProfileData[]> {
    return ErrorHandler.retryOperation(async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, name, email, country, bio, avatar_url, timezone')
        .in('user_id', userIds);

      if (error) {
        const errorResult = ErrorHandler.handleDatabaseError(error, 'profileBatchFetch');
        console.error(errorResult.logMessage);
        throw error;
      }

      const profiles = (data || []) as ProfileData[];
      
      // Cache all fetched profiles
      profiles.forEach(profile => {
        if (profile && profile.user_id) {
          this.setCachedProfile(profile.user_id, profile);
        }
      });

      return profiles;
    }, 'profileBatchFetch');
  }

  /**
   * Get profiles with intelligent caching and batch fetching
   */
  async getProfiles(userIds: string[]): Promise<Record<string, ProfileData>> {
    if (userIds.length === 0) return {};

    // Get cached profiles and identify missing ones
    const { cached, missing } = this.getCachedProfiles(userIds);
    
    // If we have all profiles cached, return them
    if (missing.length === 0) {
      return cached;
    }

    try {
      // Batch fetch missing profiles
      const fetchedProfiles = await this.batchFetch(missing);
      
      // Combine cached and fetched profiles
      const allProfiles = { ...cached };
      fetchedProfiles.forEach(profile => {
        if (profile && profile.user_id) {
          allProfiles[profile.user_id] = profile;
        }
      });

      return allProfiles;
    } catch (error) {
      const errorResult = ErrorHandler.handleDatabaseError(error, 'getProfiles');
      console.error(errorResult.logMessage);
      
      // Create fallback profiles for missing ones
      const fallbackProfiles = { ...cached };
      missing.forEach(userId => {
        ErrorHandler.handleCacheMiss(userId, 'getProfiles');
        fallbackProfiles[userId] = {
          user_id: userId,
          name: null,
          email: null,
          country: null,
          bio: null,
          avatar_url: null,
          timezone: null,
          ...ErrorHandler.createFallbackProfileDisplay(userId)
        } as ProfileData;
      });
      
      return fallbackProfiles;
    }
  }

  /**
   * Invalidate cache for specific user or all users
   */
  invalidate(userId?: string): void {
    if (userId) {
      this.cache.delete(userId);
      console.log(`Cache invalidated for user: ${userId}`);
    } else {
      this.cache.clear();
      console.log('All profile cache cleared');
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    hitRate: number;
    totalRequests: number;
    cacheHits: number;
  } {
    // This would need to be implemented with request tracking
    // For now, return basic stats
    return {
      size: this.cache.size,
      hitRate: 0, // Would need request tracking
      totalRequests: 0,
      cacheHits: 0
    };
  }

  /**
   * Clean up expired cache entries
   */
  cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    this.cache.forEach((cached, userId) => {
      if (now - cached.timestamp >= this.TTL) {
        expiredKeys.push(userId);
      }
    });
    
    expiredKeys.forEach(key => this.cache.delete(key));
    
    if (expiredKeys.length > 0) {
      console.log(`Cleaned up ${expiredKeys.length} expired cache entries`);
    }
  }

  /**
   * Preload profiles for given user IDs
   */
  async preload(userIds: string[]): Promise<void> {
    const { missing } = this.getCachedProfiles(userIds);
    if (missing.length > 0) {
      await this.batchFetch(missing);
    }
  }
}

// Global instance
export const profileCache = new ProfileCacheManager();

// Set up periodic cleanup
if (typeof window !== 'undefined') {
  setInterval(() => {
    profileCache.cleanup();
  }, 60000); // Clean up every minute
}