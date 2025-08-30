import { useMemo } from 'react';
import { profileCache } from '@/utils/profileCache';

export interface OptimizedProfileData {
  user_id: string;
  name: string | null;
  email: string | null;
  display_name: string;
  country: string | null;
  bio: string | null;
  avatar_url: string | null;
  timezone: string | null;
  has_avatar: boolean;
  country_display: string | null;
}

/**
 * Hook for optimized profile data access with memoization and batch loading
 */
export const useOptimizedProfileData = (
  profilesData: Record<string, any> = {},
  userIds: string[] = []
) => {
  // Memoized profile data processor
  const processedProfiles = useMemo(() => {
    const processed: Record<string, OptimizedProfileData> = {};
    
    // Process all provided profile data
    Object.entries(profilesData).forEach(([userId, profile]) => {
      processed[userId] = processProfile(userId, profile);
    });
    
    // Add fallback profiles for any missing user IDs
    userIds.forEach(userId => {
      if (!processed[userId]) {
        processed[userId] = createFallbackProfile(userId);
      }
    });
    
    return processed;
  }, [profilesData, userIds]);

  // Memoized profile getter function
  const getProfileData = useMemo(() => {
    return (userId: string): OptimizedProfileData => {
      // First check processed profiles
      if (processedProfiles[userId]) {
        return processedProfiles[userId];
      }
      
      // Check cache as fallback
      const cachedProfile = profileCache.getCachedProfile(userId);
      if (cachedProfile) {
        return processProfile(userId, cachedProfile);
      }
      
      // Return fallback profile
      return createFallbackProfile(userId);
    };
  }, [processedProfiles]);

  // Batch profile loader
  const loadMissingProfiles = async (requiredUserIds: string[]) => {
    const missingIds = requiredUserIds.filter(id => !processedProfiles[id]);
    
    if (missingIds.length > 0) {
      try {
        await profileCache.preload(missingIds);
        return true;
      } catch (error) {
        console.error('Failed to preload profiles:', error);
        return false;
      }
    }
    
    return true;
  };

  return {
    getProfileData,
    processedProfiles,
    loadMissingProfiles,
    profileCount: Object.keys(processedProfiles).length
  };
};

/**
 * Process raw profile data into optimized format
 */
function processProfile(userId: string, profile: any): OptimizedProfileData {
  if (!profile) {
    return createFallbackProfile(userId);
  }

  return {
    user_id: userId,
    name: profile.name || null,
    email: profile.email || null,
    display_name: profile.display_name || profile.name || profile.email || `User ${userId.slice(0, 8)}`,
    country: profile.country || null,
    bio: profile.bio || null,
    avatar_url: profile.avatar_url || null,
    timezone: profile.timezone || null,
    has_avatar: !!profile.avatar_url,
    country_display: profile.country_display || profile.country || null
  };
}

/**
 * Create fallback profile for missing data
 */
function createFallbackProfile(userId: string): OptimizedProfileData {
  return {
    user_id: userId,
    name: null,
    email: null,
    display_name: `User ${userId.slice(0, 8)}`,
    country: null,
    bio: null,
    avatar_url: null,
    timezone: null,
    has_avatar: false,
    country_display: null
  };
}