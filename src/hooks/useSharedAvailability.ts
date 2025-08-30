import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { profileCache } from '@/utils/profileCache';
import { ErrorHandler } from '@/utils/errorHandling';
import { PerformanceMonitor } from '@/utils/performanceMonitor';
import type { AvailabilitySlot } from '@/types/availability';

// Transform database row to TypeScript interface for shared slots
const transformDbToSharedSlot = (dbRow: any): AvailabilitySlot & { country?: string } => ({
  id: dbRow.id,
  userId: dbRow.user_id,
  dayOfWeek: dbRow.day_of_week,
  startTime: dbRow.start_time,
  endTime: dbRow.end_time,
  status: dbRow.status,
  timezone: dbRow.timezone,
  createdAt: dbRow.created_at,
  updatedAt: dbRow.updated_at,
  country: dbRow.profiles?.country,
});

export const useSharedAvailability = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sharedSlots, setSharedSlots] = useState<(AvailabilitySlot & { country?: string })[]>([]);
  const [profilesData, setProfilesData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const fetchingRef = useRef(false);
  const lastFetchTimeRef = useRef(0);
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();

  // Using the centralized profile cache manager

  // Debounced fetch function to prevent rapid successive calls
  const debouncedFetch = (delay = 300) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      fetchSharedAvailability();
    }, delay);
  };

  // Fetch shared availability slots with comprehensive error handling
  const fetchSharedAvailability = async () => {
    if (!user || fetchingRef.current) return;

    // Prevent infinite loops
    const now = Date.now();
    if (!ErrorHandler.handleInfiniteLoop('fetchSharedAvailability', lastFetchTimeRef.current)) {
      return;
    }

    fetchingRef.current = true;
    lastFetchTimeRef.current = now;
    let timer: any = null;
    
    try {
      timer = PerformanceMonitor.startTiming('fetchSharedAvailability');
      console.log('Fetching shared availability for user:', user.id);
      
      await ErrorHandler.retryOperation(async () => {
        await fetchSharedAvailabilityCore(timer);
      }, 'fetchSharedAvailability');
    } catch (error) {
      const errorResult = ErrorHandler.handleDatabaseError(error, 'fetchSharedAvailability');
      
      console.error(errorResult.logMessage);
      
      // Record failed operation if timer exists
      if (timer) {
        timer.end(false, {
          errorCode: (error as any)?.code,
          errorMessage: (error as any)?.message
        });
      }
      
      if (errorResult.fallbackAction) {
        errorResult.fallbackAction();
      }
      
      toast({
        title: "Error",
        description: errorResult.userMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  };

  // Core fetch logic separated for retry mechanism
  const fetchSharedAvailabilityCore = async (timer: any) => {
    
    // First get the shares where user is viewer
      const { data: shares, error: sharesError } = await supabase
        .from('shares')
        .select('owner_id')
        .eq('viewer_id', user.id)
        .eq('is_active', true);

      console.log('Shares query result:', { shares, sharesError });

      if (sharesError) throw sharesError;
      
      if (!shares || shares.length === 0) {
        console.log('No active shares found');
        setSharedSlots([]);
        setProfilesData({});
        return;
      }

      const ownerIds = shares.map(share => share.owner_id);
      console.log('Owner IDs to fetch availability for:', ownerIds);

      // Check cache for existing profiles using the cache manager
      const { cached: cachedProfiles, missing: missingProfileIds } = profileCache.getCachedProfiles(ownerIds);
      console.log('📦 Cached profiles:', Object.keys(cachedProfiles).length, 'Missing:', missingProfileIds.length);

      // Try optimized approach: get availability with profile data using foreign key relationship
      let availabilityData, profilesResponse;
      let useOptimizedQuery = true;

      try {
        console.log('🚀 Attempting optimized query with foreign key JOIN...');
        const { data: joinedData, error: joinError } = await supabase
          .from('availability')
          .select(`
            *,
            profiles!fk_availability_user_id(
              user_id,
              name,
              email,
              country,
              bio,
              avatar_url,
              timezone
            )
          `)
          .in('user_id', ownerIds)
          .order('day_of_week', { ascending: true })
          .order('start_time', { ascending: true });

        if (joinError) {
          console.warn('⚠️ Foreign key query failed, falling back to separate queries:', joinError);
          useOptimizedQuery = false;
        } else {
          console.log('✅ Foreign key query successful:', joinedData);
          availabilityData = joinedData;
          
          // Extract profiles from joined data
          profilesResponse = joinedData?.map(item => item.profiles).filter(Boolean) || [];
        }
      } catch (error) {
        console.warn('⚠️ Foreign key query exception, falling back:', error);
        useOptimizedQuery = false;
      }

      // Fallback: separate queries if optimized approach fails
      if (!useOptimizedQuery) {
        console.log('📋 Using fallback separate queries...');
        
        // Get availability data
        const { data: availData, error: availabilityError } = await supabase
          .from('availability')
          .select('*')
          .in('user_id', ownerIds)
          .order('day_of_week', { ascending: true })
          .order('start_time', { ascending: true });

        if (availabilityError) throw availabilityError;
        availabilityData = availData;

        // Use the cache manager to fetch missing profiles
        if (missingProfileIds.length > 0) {
          console.log('🔍 Fetching missing profiles for IDs:', missingProfileIds);
          
          try {
            const fetchedProfiles = await profileCache.batchFetch(missingProfileIds);
            profilesResponse = fetchedProfiles;
            console.log('👥 Profiles fetched via cache manager:', profilesResponse);
          } catch (profilesError) {
            console.error('❌ Profiles query failed:', profilesError);
            profilesResponse = [];
          }
        } else {
          profilesResponse = [];
        }
      }

      // Combine cached and newly fetched profiles
      const allProfiles = [...Object.values(cachedProfiles), ...(profilesResponse || [])];
      
      // Create profiles map with enhanced fallback data
      const profilesMap = allProfiles.reduce((acc, profile) => {
        if (profile && profile.user_id) {
          acc[profile.user_id] = {
            ...profile,
            display_name: profile.name || profile.email || profile.user_id,
            has_avatar: !!profile.avatar_url,
            country_display: profile.country || null
          };
        }
        return acc;
      }, {} as Record<string, any>);
      
      console.log('📋 Profiles response:', profilesResponse);
      console.log('🗺️ Enhanced profiles map created:', profilesMap);
      
      // Only update profiles data if it has changed
      setProfilesData(prevProfiles => {
        if (JSON.stringify(prevProfiles) === JSON.stringify(profilesMap)) {
          console.log('📊 Profiles data unchanged, skipping state update');
          return prevProfiles;
        }
        return profilesMap;
      });

      // Combine availability with profile data and add fallbacks for missing profiles
      const data = (availabilityData || []).map(slot => {
        const profile = useOptimizedQuery ? slot.profiles : profilesMap[slot.user_id];
        return {
          ...slot,
          profiles: profile || {
            user_id: slot.user_id,
            name: null,
            email: `user-${slot.user_id.slice(0, 8)}`,
            display_name: `User ${slot.user_id.slice(0, 8)}`,
            country: null,
            bio: null,
            avatar_url: null,
            timezone: slot.timezone,
            has_avatar: false,
            country_display: null
          }
        };
      });

      // Update viewed_at for all shares we're viewing
      await Promise.all(ownerIds.map(ownerId => 
        supabase
          .from('shares')
          .update({ viewed_at: new Date().toISOString() })
          .eq('owner_id', ownerId)
          .eq('viewer_id', user.id)
          .eq('is_active', true)
      ));

      console.log('Availability query result:', { data });

      const transformedSlots = data ? data.map(transformDbToSharedSlot) : [];
      console.log('Transformed shared slots:', transformedSlots);
      
      // Only update state if data has actually changed
      setSharedSlots(prevSlots => {
        if (JSON.stringify(prevSlots) === JSON.stringify(transformedSlots)) {
          console.log('📊 Slots data unchanged, skipping state update');
          return prevSlots;
        }
        return transformedSlots;
      });

      // Performance monitoring
      const startTime = performance.now(); // Define startTime
      const endTime = performance.now();
      const duration = endTime - startTime;
      console.log(`🚀 Profile data fetch completed in ${duration.toFixed(2)}ms`);
      
      if (duration > 2000) {
        console.warn(`⚠️ Profile data fetch took ${duration.toFixed(2)}ms, exceeding 2s requirement`);
      }

      // Cache hit rate monitoring
      const totalProfiles = ownerIds.length;
      const cachedCount = Object.keys(cachedProfiles).length;
      const cacheHitRate = totalProfiles > 0 ? (cachedCount / totalProfiles) * 100 : 0;
      console.log(`📊 Cache hit rate: ${cacheHitRate.toFixed(1)}% (${cachedCount}/${totalProfiles})`);
      
      // Record cache performance
      PerformanceMonitor.recordCacheOperation('profileCache', cachedCount > 0, timer.getCurrentDuration());
      
      // Record successful operation
      timer.end(true, {
        profileCount: totalProfiles,
        cacheHitRate,
        slotsCount: transformedSlots.length
      });
  };

  // Get shares where user is the owner (people who can see user's availability)
  const fetchMyShares = async () => {
    if (!user) return [];

    try {
      // Get shares data
      const { data: sharesData, error: sharesError } = await supabase
        .from('shares')
        .select('*')
        .eq('owner_id', user.id)
        .eq('is_active', true);

      if (sharesError) throw sharesError;
      if (!sharesData || sharesData.length === 0) return [];

      // Get viewer profiles
      const viewerIds = sharesData.map(share => share.viewer_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, name, email, country')
        .in('user_id', viewerIds);

      if (profilesError) throw profilesError;

      // Map profiles to shares
      const profilesMap = (profilesData || []).reduce((acc, profile) => {
        acc[profile.user_id] = profile;
        return acc;
      }, {} as Record<string, any>);

      return sharesData.map(share => ({
        ...share,
        viewer_profile: profilesMap[share.viewer_id]
      }));
    } catch (error: any) {
      console.error('Error fetching my shares:', error);
      return [];
    }
  };

  // Set up real-time subscription with proper dependency management
  useEffect(() => {
    if (!user) return;

    // Initial fetch
    fetchSharedAvailability();

    const channel = supabase
      .channel(`shared-availability-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shares',
          filter: `viewer_id=eq.${user.id}`,
        },
        () => {
          console.log('Shares changed, debounced refetching...');
          debouncedFetch(500); // Use debounced fetch
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'availability',
        },
        () => {
          console.log('Availability changed, debounced refetching...');
          debouncedFetch(1000); // Longer delay for availability changes
        }
      )
      .subscribe();

    return () => {
      // Clean up debounce timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [user?.id]); // Stable dependency - only user.id, not the entire user object

  return {
    sharedSlots,
    profilesData,
    loading,
    refetch: fetchSharedAvailability,
    fetchMyShares,
  };
};