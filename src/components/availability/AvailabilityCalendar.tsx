import { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  DAYS_OF_WEEK, 
  STATUS_COLORS, 
  STATUS_LABELS,
  type AvailabilitySlot, 
  type AvailabilityStatus,
  type CalendarView 
} from '@/types/availability';
import { 
  Calendar, 
  Clock, 
  Plus, 
  MoreVertical,
  Edit,
  Trash2,
  CalendarDays,
  Grid3X3,
  List
} from 'lucide-react';

interface AvailabilityCalendarProps {
  availabilitySlots: AvailabilitySlot[];
  onCreateSlot: (slot: Omit<AvailabilitySlot, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateSlot: (id: string, updates: Partial<AvailabilitySlot>) => void;
  onDeleteSlot: (id: string) => void;
  loading: boolean;
}

const AvailabilityCalendar = ({ 
  availabilitySlots, 
  onCreateSlot, 
  onUpdateSlot, 
  onDeleteSlot, 
  loading 
}: AvailabilityCalendarProps) => {
  const [view, setView] = useState<CalendarView['type']>('weekly');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    startHour: number;
    endHour: number;
    dayOfWeek: number;
  } | null>(null);
  
  const calendarRef = useRef<HTMLDivElement>(null);

  // Generate time slots (24-hour format)
  const timeSlots = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    display: `${hour.toString().padStart(2, '0')}:00`,
  }));

  // Group slots by day
  const slotsByDay = availabilitySlots.reduce((acc, slot) => {
    if (!acc[slot.dayOfWeek]) {
      acc[slot.dayOfWeek] = [];
    }
    acc[slot.dayOfWeek].push(slot);
    return acc;
  }, {} as Record<number, AvailabilitySlot[]>);

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
    if (dragState?.isDragging) {
      const startHour = Math.min(dragState.startHour, dragState.endHour);
      const endHour = Math.max(dragState.startHour, dragState.endHour) + 1;
      
      const newSlot = {
        dayOfWeek: dragState.dayOfWeek,
        startTime: `${startHour.toString().padStart(2, '0')}:00`,
        endTime: `${endHour.toString().padStart(2, '0')}:00`,
        status: 'available' as AvailabilityStatus,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
      
      onCreateSlot(newSlot);
      setDragState(null);
    }
  }, [dragState, onCreateSlot]);

  const getSlotAtTime = (dayOfWeek: number, hour: number) => {
    const daySlots = slotsByDay[dayOfWeek] || [];
    return daySlots.find(slot => {
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

  const renderTimeSlot = (dayOfWeek: number, hour: number) => {
    const existingSlot = getSlotAtTime(dayOfWeek, hour);
    const isDragSelection = isInDragSelection(dayOfWeek, hour);
    
    return (
      <div
        key={`${dayOfWeek}-${hour}`}
        className={`
          calendar-time-slot relative group
          ${existingSlot ? STATUS_COLORS[existingSlot.status] : ''}
          ${isDragSelection ? 'drag-active' : ''}
        `}
        onMouseDown={() => !existingSlot && handleMouseDown(dayOfWeek, hour)}
        onMouseEnter={() => handleMouseEnter(hour)}
        onMouseUp={handleMouseUp}
      >
        <div className="flex items-center justify-between h-full">
          <span className="text-xs font-medium opacity-60">
            {timeSlots[hour].display}
          </span>
          
          {existingSlot && (
            <div className="flex items-center space-x-1">
              <Badge variant="secondary" className="text-xs">
                {STATUS_LABELS[existingSlot.status]}
              </Badge>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-popover border border-border">
                  <DropdownMenuItem 
                    onClick={() => {
                      // TODO: Open edit dialog
                    }}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onDeleteSlot(existingSlot.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with View Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            My Availability
          </h2>
          <p className="text-muted-foreground">
            Drag to create time blocks, click to edit
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Select value={view} onValueChange={(value: CalendarView['type']) => setView(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border border-border">
              <SelectItem value="daily">
                <div className="flex items-center">
                  <Calendar className="mr-2 h-4 w-4" />
                  Daily
                </div>
              </SelectItem>
              <SelectItem value="weekly">
                <div className="flex items-center">
                  <CalendarDays className="mr-2 h-4 w-4" />
                  Weekly
                </div>
              </SelectItem>
              <SelectItem value="monthly">
                <div className="flex items-center">
                  <Grid3X3 className="mr-2 h-4 w-4" />
                  Monthly
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid gap-6">
        {view === 'weekly' && (
          <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
            {DAYS_OF_WEEK.map((dayName, dayIndex) => (
              <Card key={dayIndex} className="shadow-card-custom">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-center">
                    {dayName}
                  </CardTitle>
                  <div className="text-xs text-center text-muted-foreground">
                    {slotsByDay[dayIndex]?.length || 0} slots
                  </div>
                </CardHeader>
                <CardContent 
                  ref={calendarRef}
                  className="space-y-1 p-2"
                  onMouseLeave={() => setDragState(null)}
                >
                  {timeSlots.map((timeSlot) => 
                    renderTimeSlot(dayIndex, timeSlot.hour)
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {view === 'daily' && (
          <div className="max-w-2xl mx-auto">
            <div className="mb-4">
              <Select 
                value={selectedDay?.toString() || "1"} 
                onValueChange={(value) => setSelectedDay(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a day" />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border">
                  {DAYS_OF_WEEK.map((day, index) => (
                    <SelectItem key={index} value={index.toString()}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Card className="shadow-card-custom">
              <CardHeader>
                <CardTitle>
                  {DAYS_OF_WEEK[selectedDay || 1]}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {timeSlots.map((timeSlot) => 
                  renderTimeSlot(selectedDay || 1, timeSlot.hour)
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {view === 'monthly' && (
          <Card className="shadow-card-custom">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Grid3X3 className="mr-2 h-5 w-5" />
                Monthly Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2 text-center">
                {DAYS_OF_WEEK.map((day, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="font-medium text-sm mb-2">{day}</div>
                    <div className="space-y-1">
                      {(slotsByDay[index] || []).slice(0, 3).map((slot) => (
                        <div
                          key={slot.id}
                          className={`text-xs p-1 rounded ${STATUS_COLORS[slot.status]}`}
                        >
                          {slot.startTime}-{slot.endTime}
                        </div>
                      ))}
                      {(slotsByDay[index]?.length || 0) > 3 && (
                        <div className="text-xs text-muted-foreground">
                          +{(slotsByDay[index]?.length || 0) - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex justify-center">
        <Button 
          variant="outline" 
          className="flex items-center space-x-2"
          onClick={() => {
            // TODO: Open quick add dialog
          }}
        >
          <Plus className="h-4 w-4" />
          <span>Quick Add Availability</span>
        </Button>
      </div>
      
      {loading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5 animate-spin text-primary" />
            <span>Saving availability...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AvailabilityCalendar;