export type AvailabilityStatus = 'available' | 'idle' | 'do_not_disturb';

export interface AvailabilitySlot {
  id: string;
  userId: string;
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  startTime: string; // Format: "HH:mm"
  endTime: string; // Format: "HH:mm"
  status: AvailabilityStatus;
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  userId: string;
  name: string;
  email: string;
  timezone: string;
  country: string;
  createdAt: string;
  updatedAt: string;
}

export interface Share {
  id: string;
  ownerId: string;
  viewerId: string;
  sharedAt: string;
  viewedAt?: string;
  isActive: boolean;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
  readAt?: string;
}

export interface TimeSlot {
  hour: number;
  minute: number;
  display: string;
}

export interface DayAvailability {
  dayOfWeek: number;
  dayName: string;
  slots: AvailabilitySlot[];
}

export interface CalendarView {
  type: 'daily' | 'weekly' | 'monthly';
  date: Date;
}

export const DAYS_OF_WEEK = [
  'Sunday',
  'Monday', 
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

export const STATUS_COLORS: Record<AvailabilityStatus, string> = {
  available: 'bg-green-500/30 border-green-500 border-2',
  idle: 'bg-yellow-400/40 border-yellow-500 border-2',
  do_not_disturb: 'bg-red-600/40 border-red-600 border-2',
};

export const STATUS_LABELS: Record<AvailabilityStatus, string> = {
  available: 'Available',
  idle: 'Idle',
  do_not_disturb: 'Do Not Disturb',
};

export const STATUS_ICONS: Record<AvailabilityStatus, string> = {
  available: '✅',
  idle: '🟡',
  do_not_disturb: '🚫',
};