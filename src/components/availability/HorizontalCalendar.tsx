import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useOptimizedProfileData } from '@/hooks/useOptimizedProfileData';

import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { UserProfileCard } from '@/components/ui/user-profile-card';
import { MultipleUsersCard } from '@/components/ui/multiple-users-card';
import {
  DAYS_OF_WEEK,
  STATUS_COLORS,
  STATUS_LABELS,
  STATUS_ICONS,
  type AvailabilitySlot,
  type AvailabilityStatus,
} from '@/types/availability';
import {
  MoreVertical,
  Edit,
  Trash2,
  Clock,
} from 'lucide-react';
import { fromZonedTime, toZonedTime, formatInTimeZone } from 'date-fns-tz';
import { format } from 'date-fns';

interface HorizontalCalendarProps {
  availabilitySlots: AvailabilitySlot[];
  onCreateSlot: (slot: Omit<AvailabilitySlot, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateSlot: (id: string, updates: Partial<AvailabilitySlot>) => void;
  onDeleteSlot: (id: string) => void;
  loading: boolean;
  sharedSlots?: AvailabilitySlot[];
  userTimezone?: string;
  showTimezoneToggle?: boolean;
  profilesData?: Record<string, any>;
  isSharedView?: boolean;
}

const HorizontalCalendar = ({
  availabilitySlots,
  onCreateSlot,
  onUpdateSlot,
  onDeleteSlot,
  loading,
  sharedSlots = [],
  userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone,
  showTimezoneToggle = false,
  profilesData = {},
  isSharedView = false
}: HorizontalCalendarProps) => {
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    startHour: number;
    endHour: number;
    dayOfWeek: number;
  } | null>(null);
  const [showInUserTimezone, setShowInUserTimezone] = useState(true);
  const [editingSlot, setEditingSlot] = useState<string | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [pendingSlot, setPendingSlot] = useState<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    selectedHours?: number[];
  } | null>(null);
  const [statusFilter, setStatusFilter] = useState<AvailabilityStatus | 'all'>('all');
  const [personFilter, setPersonFilter] = useState<string[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isTimeIndicatorHovered, setIsTimeIndicatorHovered] = useState(false);

  // Determine if we're in calendar mode (can create slots) or shared mode (read-only)
  // Shared mode is indicated by showTimezoneToggle being true and empty availabilitySlots
  const isCalendarMode = !showTimezoneToggle;

  // Helper function to create slots for the selected time range
  const createSlotsForStatus = useCallback((status: AvailabilityStatus) => {
    if (pendingSlot?.selectedHours) {
      // Create individual 1-hour slots for each selected hour
      pendingSlot.selectedHours.forEach(hour => {
        onCreateSlot({
          dayOfWeek: pendingSlot.dayOfWeek,
          startTime: `${hour.toString().padStart(2, '0')}:00`,
          endTime: `${(hour + 1).toString().padStart(2, '0')}:00`,
          status,
          timezone: userTimezone,
        });
      });
    } else {
      // Fallback for single slot (shouldn't happen with new logic, but kept for safety)
      onCreateSlot({
        ...pendingSlot,
        status,
        timezone: userTimezone,
      });
    }
    setShowStatusModal(false);
    setPendingSlot(null);
  }, [pendingSlot, onCreateSlot, userTimezone]);

  // Extract unique user IDs from all slots for batch processing
  const allUserIds = [...new Set([
    ...availabilitySlots.map(slot => slot.userId),
    ...sharedSlots.map(slot => slot.userId)
  ])];

  // Use optimized profile data hook
  const { getProfileData, loadMissingProfiles } = useOptimizedProfileData(profilesData, allUserIds);

  // Preload missing profiles on mount or when user IDs change
  useEffect(() => {
    if (allUserIds.length > 0) {
      loadMissingProfiles(allUserIds);
    }
  }, [allUserIds.join(','), loadMissingProfiles]);

  // Update current time every second for smooth movement
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Get user's timezone from their profile with proper fallback logic
  const getUserTimezone = (userId: string): string => {
    const profile = getProfileData(userId);

    // First try to use the profile timezone
    if (profile.timezone && isValidTimezone(profile.timezone)) {
      return profile.timezone;
    }

    // Fallback to the current user's timezone if available and valid
    if (userTimezone && isValidTimezone(userTimezone)) {
      return userTimezone;
    }

    // Final fallback to UTC
    console.warn(`No valid timezone found for user ${userId}, falling back to UTC`);
    return 'UTC';
  };

  // Generate time boundary labels (25 labels for 24 intervals)
  const timeBoundaries = Array.from({ length: 25 }, (_, hour) => ({
    hour,
    display: `${hour.toString().padStart(2, '0')}:00`,
  }));

  // Generate time slots (24 intervals between boundaries)
  const timeSlots = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    display: `${hour.toString().padStart(2, '0')}:00`,
  }));

  // Validate timezone string
  const isValidTimezone = (timezone: string) => {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
      return true;
    } catch {
      return false;
    }
  };

  // Get current week's reference date for consistent conversion
  const getCurrentWeekReferenceDate = (dayOfWeek: number) => {
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const diff = dayOfWeek - currentDay;
    const referenceDate = new Date(today);
    referenceDate.setDate(today.getDate() + diff);
    return referenceDate;
  };
  // Convert time slot using date-aware timezone conversion
  const convertTimeSlot = (slot: AvailabilitySlot, targetTimezone: string) => {

    try {
      const referenceDate = getCurrentWeekReferenceDate(slot.dayOfWeek);
      const dateString = format(referenceDate, 'yyyy-MM-dd');

      // Normalize possible HH:mm:ss from DB to HH:mm before composing ISO strings
      const normalizeTime = (t: string) => {
        const parts = (t || '').split(':');
        const hh = (parts[0] ?? '00').padStart(2, '0');
        const mm = (parts[1] ?? '00').padStart(2, '0');
        return `${hh}:${mm}`;
      };

      const startHHmm = normalizeTime(slot.startTime);
      const endHHmm = normalizeTime(slot.endTime);

      // Build full local datetimes in source timezone
      const startLocal = `${dateString}T${startHHmm}:00`;
      const endLocal = `${dateString}T${endHHmm}:00`;

      // Convert source local -> UTC
      const startUtc = fromZonedTime(startLocal, slot.timezone);
      const endUtc = fromZonedTime(endLocal, slot.timezone);

      // Convert UTC -> target timezone
      const startTarget = toZonedTime(startUtc, targetTimezone);
      const endTarget = toZonedTime(endUtc, targetTimezone);

      // Format back to HH:mm in the TARGET timezone regardless of system timezone
      const convertedStartTime = formatInTimeZone(startUtc, targetTimezone, 'HH:mm');
      const convertedEndTime = formatInTimeZone(endUtc, targetTimezone, 'HH:mm');

      // Compute day in target timezone
      const targetDayString = formatInTimeZone(startUtc, targetTimezone, 'i'); // ISO day 1-7 (Mon-Sun)
      const newDayOfWeek = ((parseInt(targetDayString, 10) % 7)); // convert Mon=1..Sun=7 to Sun=0..Sat=6

      return {
        ...slot,
        startTime: convertedStartTime,
        endTime: convertedEndTime,
        dayOfWeek: newDayOfWeek,
        isConverted: true,
        originalTime: {
          startTime: slot.startTime,
          endTime: slot.endTime,
          timezone: slot.timezone,
          dayOfWeek: slot.dayOfWeek
        }
      };
    } catch (error: any) {
      console.error('Error converting timezone:', error);
      return {
        ...slot,
        isConverted: false,
        conversionError: error.message
      };
    }
  };

  // Get unique people from shared slots for person filter
  const uniquePeople = Array.from(new Set(sharedSlots.map(slot => slot.userId)))
    .map(userId => ({
      userId,
      profile: getProfileData(userId)
    }))
    .sort((a, b) => a.profile.display_name.localeCompare(b.profile.display_name));

  // Filter shared slots by status and person
  const filteredSharedSlots = sharedSlots.filter(slot => {
    // Apply status filter
    const statusMatch = statusFilter === 'all' || slot.status === statusFilter;

    // Apply person filter - show all if no specific people selected, otherwise only show selected people
    const personMatch = personFilter.length === 0 || personFilter.includes(slot.userId);

    return statusMatch && personMatch;
  });

  // Group slots by day
  const allSlots = [...availabilitySlots, ...filteredSharedSlots];
  const slotsByDay = allSlots.reduce((acc, slot) => {
    // Apply timezone conversion based on toggle state
    let displaySlot = slot;

    if (showInUserTimezone) {
      // Convert to user's timezone
      const targetTimezone = userTimezone && isValidTimezone(userTimezone) ? userTimezone : 'UTC';

      // Prefer the slot's own timezone if valid; otherwise fall back to owner's profile timezone
      const sourceTimezone = slot.timezone && isValidTimezone(slot.timezone)
        ? slot.timezone
        : getUserTimezone(slot.userId);

      if (sourceTimezone !== targetTimezone) {
        const slotForConversion = {
          ...slot,
          timezone: sourceTimezone
        };

        displaySlot = convertTimeSlot(slotForConversion, targetTimezone);
        console.log(`Converting slot from ${sourceTimezone} to ${targetTimezone}:`, {
          userId: slot.userId,
          original: `${slot.startTime}-${slot.endTime} (Day ${slot.dayOfWeek})`,
          converted: `${displaySlot.startTime}-${displaySlot.endTime} (Day ${displaySlot.dayOfWeek})`
        });
      }
    } else {
      // Show in their original timezone (no conversion needed)
      displaySlot = slot;
      const slotUserTimezone = getUserTimezone(slot.userId);
      console.log(`Showing slot in original timezone ${slotUserTimezone}:`, {
        userId: slot.userId,
        time: `${slot.startTime}-${slot.endTime} (Day ${slot.dayOfWeek})`
      });
    }

    if (!acc[displaySlot.dayOfWeek]) {
      acc[displaySlot.dayOfWeek] = [];
    }
    acc[displaySlot.dayOfWeek].push({ ...displaySlot, originalSlot: slot });
    return acc;
  }, {} as Record<number, any[]>);

  const handleMouseDown = useCallback((dayOfWeek: number, hour: number) => {
    setDragState({
      isDragging: true,
      startHour: hour,
      endHour: hour,
      dayOfWeek,
    });
  }, []);

  const handleMouseEnter = useCallback((hour: number) => {
    if (dragState?.isDragging) {
      setDragState(prev => prev ? {
        ...prev,
        endHour: Math.max(hour, prev.startHour),
      } : null);
    }
  }, [dragState]);

  const handleMouseUp = useCallback(() => {
    if (dragState?.isDragging && isCalendarMode) {
      const startHour = Math.min(dragState.startHour, dragState.endHour);
      const endHour = Math.max(dragState.startHour, dragState.endHour);

      // Store the range of hours selected for creating individual slots
      const selectedHours = [];
      for (let hour = startHour; hour <= endHour; hour++) {
        selectedHours.push(hour);
      }

      const newSlot = {
        dayOfWeek: dragState.dayOfWeek,
        startTime: `${startHour.toString().padStart(2, '0')}:00`,
        endTime: `${(endHour + 1).toString().padStart(2, '0')}:00`,
        selectedHours, // Add this to track individual hours
      };

      setPendingSlot(newSlot);
      setShowStatusModal(true);
      setDragState(null);
    }
  }, [dragState, isCalendarMode]);

  const getSlotsAtTime = (dayOfWeek: number, hour: number) => {
    const daySlots = slotsByDay[dayOfWeek] || [];
    return daySlots.filter(slot => {
      const [startHour] = slot.startTime.split(':').map(Number);
      const [endHour] = slot.endTime.split(':').map(Number);
      return hour >= startHour && hour < endHour;
    });
  };



  const isInDragSelection = (dayOfWeek: number, hour: number) => {
    if (!dragState?.isDragging || dragState.dayOfWeek !== dayOfWeek) return false;
    const minHour = Math.min(dragState.startHour, dragState.endHour);
    const maxHour = Math.max(dragState.startHour, dragState.endHour);
    return hour >= minHour && hour <= maxHour;
  };

  const isSharedSlot = (slot: any) => {
    return slot?.originalSlot && sharedSlots.some(s => s.id === slot.originalSlot.id);
  };

  const getCurrentTimeInUserTimezone = () => {
    // Use user's selected timezone if available and valid, otherwise fall back to local time
    if (userTimezone && isValidTimezone(userTimezone)) {
      try {
        const timeInUserTimezone = new Intl.DateTimeFormat('en-US', {
          timeZone: userTimezone,
          hour: 'numeric',
          hour12: false,
          minute: 'numeric',
          second: 'numeric'
        }).format(currentTime);
        const [hour, minute, second] = timeInUserTimezone.split(':').map(Number);
        return { hour, minute, second };
      } catch (error) {
        console.warn(`Error formatting time for timezone: ${userTimezone}, falling back to local time`);
        return {
          hour: currentTime.getHours(),
          minute: currentTime.getMinutes(),
          second: currentTime.getSeconds()
        };
      }
    }

    return {
      hour: currentTime.getHours(),
      minute: currentTime.getMinutes(),
      second: currentTime.getSeconds()
    };
  };

  const getCurrentHour = () => {
    return getCurrentTimeInUserTimezone().hour;
  };

  const getCurrentTimePosition = () => {
    const { hour, minute, second } = getCurrentTimeInUserTimezone();
    // Calculate position as percentage: (hour + minute/60 + second/3600) / 24 * 100
    const totalHours = hour + minute / 60 + second / 3600;
    return (totalHours / 24) * 100;
  };

  const getTimeOfDayColor = (hour: number) => {
    // Night (12 AM - 5 AM): Dark blue/purple
    if (hour >= 0 && hour < 6) {
      return 'bg-gradient-to-r from-indigo-900 to-purple-900';
    }
    // Early Morning (6 AM - 8 AM): Soft orange/pink (sunrise)
    else if (hour >= 6 && hour < 9) {
      return 'bg-gradient-to-r from-purple-900 to-orange-300';
    }
    // Morning (9 AM - 11 AM): Bright yellow (morning sun)
    else if (hour >= 9 && hour < 12) {
      return 'bg-gradient-to-r from-orange-300 to-yellow-400';
    }
    // Midday (12 PM - 2 PM): Bright white/yellow (noon sun)
    else if (hour >= 12 && hour < 15) {
      return 'bg-gradient-to-r from-yellow-400 to-red';
    }
    // Afternoon (3 PM - 5 PM): Golden yellow
    else if (hour >= 15 && hour < 18) {
      return 'bg-gradient-to-r from-red to-amber-400';
    }
    // Evening (6 PM - 8 PM): Orange/red (sunset)
    else if (hour >= 18 && hour < 21) {
      return 'bg-gradient-to-r from-amber-400 to-indigo-900';
    }
    // Night (9 PM - 11 PM): Deep red/purple (twilight)
    else {
      return 'bg-gradient-to-r from-red-600 to-purple-700';
    }
  };



  return (
    <div className="space-y-4">
      {/* Header with timezone toggle and status selector */}
      <div className="space-y-4">
        {showTimezoneToggle && (
          <div className="flex items-center justify-between p-4 bg-card border rounded-lg">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-medium">Show times in:</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`text-sm ${!showInUserTimezone ? 'font-semibold text-primary' : ''}`}>Their timezone</span>
              <Switch
                checked={showInUserTimezone}
                onCheckedChange={setShowInUserTimezone}
              />
              <span className={`text-sm ${showInUserTimezone ? 'font-semibold text-primary' : ''}`}>My timezone</span>
            </div>
          </div>
        )}

        {!isCalendarMode && (
          <div className="flex items-center justify-between p-4 bg-card border rounded-lg">
            <div className="flex items-center space-x-6">
              {/* Status Filter */}
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Status:</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      {statusFilter === 'all' ? 'All' : STATUS_LABELS[statusFilter]}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => setStatusFilter('all')}>
                      All Statuses
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter('available')}>
                      <span className="mr-2">✅</span>
                      Available
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter('idle')}>
                      <span className="mr-2">🟡</span>
                      Idle
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter('do_not_disturb')}>
                      <span className="mr-2">🚫</span>
                      Do Not Disturb
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Person Filter */}
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">People:</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      {personFilter.length === 0
                        ? 'All People'
                        : personFilter.length === 1
                        ? getProfileData(personFilter[0])?.display_name || 'Selected'
                        : `${personFilter.length} people selected`
                      }
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="max-h-60 overflow-y-auto w-64" onCloseAutoFocus={(e) => e.preventDefault()}>
                    <DropdownMenuItem 
                      onSelect={(e) => e.preventDefault()}
                    >
                      <div className="flex items-center space-x-2">
                        <div className="relative flex items-center">
                          <input
                            type="checkbox"
                            checked={personFilter.length === 0}
                            onChange={(e) => {
                              e.stopPropagation();
                              setPersonFilter([]);
                            }}
                            className="h-3 w-3 rounded border border-gray-300 bg-white checked:bg-primary checked:border-primary focus:ring-1 focus:ring-primary focus:ring-offset-0 cursor-pointer"
                          />
                        </div>
                        <span className="text-sm">All People</span>
                      </div>
                    </DropdownMenuItem>
                    {uniquePeople.map(person => (
                      <DropdownMenuItem
                        key={person.userId}
                        onSelect={(e) => e.preventDefault()}
                      >
                        <div className="flex items-center space-x-2">
                          <div className="relative flex items-center">
                            <input
                              type="checkbox"
                              checked={personFilter.length === 0 || personFilter.includes(person.userId)}
                              onChange={(e) => {
                                e.stopPropagation();
                                if (personFilter.includes(person.userId)) {
                                  setPersonFilter(personFilter.filter(id => id !== person.userId));
                                } else {
                                  setPersonFilter([...personFilter, person.userId]);
                                }
                              }}
                              className="h-3 w-3 rounded border border-gray-300 bg-white checked:bg-primary checked:border-primary focus:ring-1 focus:ring-primary focus:ring-offset-0 cursor-pointer"
                            />
                          </div>
                          <Avatar className="h-5 w-5">
                            <AvatarImage
                              src={person.profile.avatar_url}
                              alt={person.profile.display_name}
                            />
                            <AvatarFallback className="text-xs">
                              {person.profile.display_name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{person.profile.display_name}</span>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        )}


      </div>

      {/* Horizontal Calendar Grid */}
      <Card className="shadow-card-custom">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">
            Weekly Schedule
            {showTimezoneToggle && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({showInUserTimezone ? 'My timezone' : 'Their timezone'})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="grid grid-rows-7 gap-1 min-w-[1000px]">
              {/* Hour boundary headers - 25 boundaries for 24 intervals */}
              <div className="relative px-5">
                <div className="flex">
                  <div className="w-24 text-sm font-medium py-2">Day</div>
                  <div className="flex-1 relative">
                    {/* Time boundary labels positioned absolutely */}
                    {timeBoundaries.map((boundary, index) => {
                      const leftPosition = (index / 24) * 100; // Position as percentage

                      return (
                        <div
                          key={boundary.hour}
                          className="absolute text-xs text-center py-2 text-muted-foreground"
                          style={{
                            left: `${leftPosition}%`,
                            transform: 'translateX(-50%)',
                            width: '32px'
                          }}
                        >
                          <div className="relative">
                            {boundary.display}
                          </div>
                        </div>
                      );
                    })}

                    {/* Smooth moving current time indicator */}
                    <div
                      className="absolute top-0 left-0 w-full h-full"
                      style={{ zIndex: 50 }}
                    >
                      <div
                        className={`absolute transition-all duration-1000 ease-in-out cursor-pointer ${
                          isTimeIndicatorHovered 
                            ? 'w-24 h-8 bg-primary rounded-lg shadow-lg' 
                            : 'w-3 h-3 bg-primary rounded-full shadow-sm'
                        }`}
                        style={{
                          left: `${getCurrentTimePosition()}%`,
                          top: isTimeIndicatorHovered ? '-4px' : '0px',
                          transform: 'translateX(-50%)',
                          zIndex: 100
                        }}
                        onMouseEnter={() => setIsTimeIndicatorHovered(true)}
                        onMouseLeave={() => setIsTimeIndicatorHovered(false)}
                      >
                        {isTimeIndicatorHovered && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-xs">
                            <div className="font-medium">Current Time</div>
                            <div className="font-bold">
                              {(() => {
                                const { hour, minute, second } = getCurrentTimeInUserTimezone();
                                return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:${second.toString().padStart(2, '0')}`;
                              })()}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Days and time slots */}
              {DAYS_OF_WEEK.map((dayName, dayIndex) => (
                <div key={dayIndex} className="flex px-4 gap-1">
                  <div className="w-24 text-sm font-medium py-2 border-r">
                    {dayName}
                  </div>
                  <div className="flex-1 flex gap-1">
                    {/* Time slot cells positioned between boundaries */}
                    {timeSlots.map((timeSlot) => {
                      const existingSlots = getSlotsAtTime(dayIndex, timeSlot.hour);
                      const existingSlot = existingSlots[0]; // Primary slot for background color
                      const isDragSelection = isInDragSelection(dayIndex, timeSlot.hour);
                      const hasSharedSlots = existingSlots.some(slot => isSharedSlot(slot));

                      return (
                        <div
                          key={`${dayIndex}-${timeSlot.hour}`}
                          className={`
                            h-12 border rounded relative group transition-colors flex-1 min-w-[48px]
                            ${isCalendarMode ? 'cursor-pointer' : 'cursor-default'}
                            ${existingSlot ? STATUS_COLORS[existingSlot.status] : (isCalendarMode ? 'bg-muted/20 hover:bg-muted/40' : 'bg-muted/10')}
                            ${isDragSelection ? 'bg-primary/20 border-primary' : ''}
                            ${hasSharedSlots ? 'border-dashed border-2' : ''}
                          `}
                          onMouseDown={() => !existingSlot && isCalendarMode && handleMouseDown(dayIndex, timeSlot.hour)}
                          onMouseEnter={() => isCalendarMode && handleMouseEnter(timeSlot.hour)}
                          onMouseUp={() => isCalendarMode && handleMouseUp()}
                        >
                          {existingSlots.length > 0 && (
                            <div className="absolute inset-0 flex items-center justify-center px-1">
                              <div className="flex items-center space-x-1">
                                {/* Render avatars for shared slots - constrained to fit in box */}
                                {(() => {
                                  const sharedSlots = existingSlots.filter(slot => isSharedSlot(slot));
                                  if (sharedSlots.length === 0) return null;

                                  // Calculate how many avatars can fit in the 48px box (h-12)
                                  // Each avatar is 24px (h-6), with -4px overlap (-space-x-1)
                                  // Box width is about 40px usable space
                                  const maxAvatarsToShow = Math.min(sharedSlots.length, 2); // Show max 2 avatars to fit in box
                                  const remainingCount = sharedSlots.length - maxAvatarsToShow;

                                  return (
                                    <HoverCard>
                                      <HoverCardTrigger asChild>
                                        <div className="flex items-center justify-center w-full h-full cursor-pointer">
                                          <div className="flex items-center -space-x-3">
                                            {/* Show first few avatars */}
                                            {sharedSlots.slice(0, maxAvatarsToShow).map((slot, index) => (
                                              <div
                                                key={slot.originalSlot.userId}
                                                className="relative"
                                                style={{ zIndex: 10 - index }}
                                              >
                                                <Avatar className="h-5 w-5 border-2 border-white shadow-sm">
                                                  <AvatarImage
                                                    src={getProfileData(slot.originalSlot.userId)?.avatar_url}
                                                    alt={getProfileData(slot.originalSlot.userId)?.display_name || 'User'}
                                                  />
                                                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-xs">
                                                    {getProfileData(slot.originalSlot.userId)?.display_name
                                                      ? getProfileData(slot.originalSlot.userId).display_name.charAt(0).toUpperCase()
                                                      : slot.originalSlot.userId.slice(0, 1).toUpperCase()}
                                                  </AvatarFallback>
                                                </Avatar>
                                              </div>
                                            ))}

                                            {/* Show +N indicator if there are more users */}
                                            {remainingCount > 0 && (
                                              <div className="relative" style={{ zIndex: 5 }}>
                                                <div className="h-5 w-5 border-2 border-white shadow-sm rounded-full bg-primary/80 text-white flex items-center justify-center">
                                                  <span className="text-xs font-bold leading-none">
                                                    +{remainingCount}
                                                  </span>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </HoverCardTrigger>
                                      <HoverCardContent side="left" className="w-auto p-0">
                                        {sharedSlots.length === 1 ? (
                                          <UserProfileCard
                                            name={getProfileData(sharedSlots[0].originalSlot.userId)?.name}
                                            email={getProfileData(sharedSlots[0].originalSlot.userId)?.email}
                                            country={getProfileData(sharedSlots[0].originalSlot.userId)?.country}
                                            bio={getProfileData(sharedSlots[0].originalSlot.userId)?.bio}
                                            avatar_url={getProfileData(sharedSlots[0].originalSlot.userId)?.avatar_url}
                                            userId={sharedSlots[0].originalSlot.userId}
                                            loading={!profilesData[sharedSlots[0].originalSlot.userId] && Object.keys(profilesData).length === 0}
                                            error={!getProfileData(sharedSlots[0].originalSlot.userId)?.name && !getProfileData(sharedSlots[0].originalSlot.userId)?.email ? "Profile data unavailable" : null}

                                          />
                                        ) : (
                                          <MultipleUsersCard
                                            users={sharedSlots.map(slot => ({
                                              userId: slot.originalSlot.userId,
                                              profileData: getProfileData(slot.originalSlot.userId),
                                              slot: slot
                                            }))}
                                          />
                                        )}
                                      </HoverCardContent>
                                    </HoverCard>
                                  );
                                })()}

                                {/* Dropdown menu for actions - positioned in corner - Only show in calendar mode */}
                                {isCalendarMode && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity absolute top-0 right-0 m-1"
                                      >
                                        <MoreVertical className="h-3 w-3" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="bg-popover border border-border">
                                      {existingSlots.some(slot => !isSharedSlot(slot)) && (
                                        <>
                                          <DropdownMenuItem
                                            onClick={() => {
                                              const ownSlot = existingSlots.find(slot => !isSharedSlot(slot));
                                              if (ownSlot) setEditingSlot(ownSlot.id);
                                            }}
                                          >
                                            <Edit className="mr-2 h-4 w-4" />
                                            Change Status
                                          </DropdownMenuItem>
                                          {editingSlot === existingSlots.find(slot => !isSharedSlot(slot))?.id && (
                                            <>
                                              <DropdownMenuItem onClick={() => {
                                                const ownSlot = existingSlots.find(slot => !isSharedSlot(slot));
                                                if (ownSlot) {
                                                  onUpdateSlot(ownSlot.id, { status: 'available' });
                                                  setEditingSlot(null);
                                                }
                                              }}>
                                                <span className="mr-2">✅</span>
                                                Available
                                              </DropdownMenuItem>
                                              <DropdownMenuItem onClick={() => {
                                                const ownSlot = existingSlots.find(slot => !isSharedSlot(slot));
                                                if (ownSlot) {
                                                  onUpdateSlot(ownSlot.id, { status: 'idle' });
                                                  setEditingSlot(null);
                                                }
                                              }}>
                                                <span className="mr-2">🟡</span>
                                                Idle
                                              </DropdownMenuItem>
                                              <DropdownMenuItem onClick={() => {
                                                const ownSlot = existingSlots.find(slot => !isSharedSlot(slot));
                                                if (ownSlot) {
                                                  onUpdateSlot(ownSlot.id, { status: 'do_not_disturb' });
                                                  setEditingSlot(null);
                                                }
                                              }}>
                                                <span className="mr-2">🚫</span>
                                                Do Not Disturb
                                              </DropdownMenuItem>
                                            </>
                                          )}
                                        </>
                                      )}
                                      {existingSlots.some(slot => !isSharedSlot(slot)) && (
                                        <DropdownMenuItem
                                          onClick={() => {
                                            const ownSlot = existingSlots.find(slot => !isSharedSlot(slot));
                                            if (ownSlot) onDeleteSlot(ownSlot.id);
                                          }}
                                          className="text-destructive focus:text-destructive"
                                        >
                                          <Trash2 className="mr-2 h-4 w-4" />
                                          Delete
                                        </DropdownMenuItem>
                                      )}
                                      <DropdownMenuItem>
                                        <span className="mr-2">{STATUS_ICONS[existingSlot?.status || 'available']}</span>
                                        {STATUS_LABELS[existingSlot?.status || 'available']}
                                      </DropdownMenuItem>
                                      {existingSlots.length > 1 && (
                                        <DropdownMenuItem disabled>
                                          <span className="text-xs text-muted-foreground">
                                            {existingSlots.length} users available
                                          </span>
                                        </DropdownMenuItem>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {loading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5 animate-spin text-primary" />
            <span>Saving availability...</span>
          </div>
        </div>
      )}

      {/* Status Selection Modal - Only show in calendar mode */}
      {showStatusModal && pendingSlot && isCalendarMode && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <Card className="w-96 shadow-elegant">
            <CardHeader>
              <CardTitle className="text-lg">Select Availability Status</CardTitle>
              <CardDescription>
                Choose your availability status for {DAYS_OF_WEEK[pendingSlot.dayOfWeek]} {pendingSlot.startTime} - {pendingSlot.endTime}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start h-12 text-left"
                onClick={() => createSlotsForStatus('available')}
              >
                <span className="mr-3 text-lg">✅</span>
                <div>
                  <div className="font-medium">Available</div>
                  <div className="text-sm text-muted-foreground">Ready to chat and collaborate</div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start h-12 text-left"
                onClick={() => createSlotsForStatus('idle')}
              >
                <span className="mr-3 text-lg">🟡</span>
                <div>
                  <div className="font-medium">Idle</div>
                  <div className="text-sm text-muted-foreground">Available but may be slow to respond</div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start h-12 text-left"
                onClick={() => createSlotsForStatus('do_not_disturb')}
              >
                <span className="mr-3 text-lg">🚫</span>
                <div>
                  <div className="font-medium">Do Not Disturb</div>
                  <div className="text-sm text-muted-foreground">Please don't message during this time</div>
                </div>
              </Button>

              <Button
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setShowStatusModal(false);
                  setPendingSlot(null);
                }}
              >
                Cancel
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default HorizontalCalendar;