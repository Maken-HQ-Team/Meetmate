export interface Timezone {
  id: string;
  city: string;
  country: string;
  flag: string;
  offset: string;
  utc: string;
}

export const TIMEZONES: Timezone[] = [
  // UTC-12 to UTC-11
  { id: 'Pacific/Baker_Island', city: 'Baker Island', country: 'USA', flag: '🇺🇸', offset: '-12:00', utc: 'UTC-12:00' },
  { id: 'Pacific/Midway', city: 'Midway', country: 'USA', flag: '🇺🇸', offset: '-11:00', utc: 'UTC-11:00' },
  { id: 'Pacific/Niue', city: 'Niue', country: 'Niue', flag: '🇳🇺', offset: '-11:00', utc: 'UTC-11:00' },
  { id: 'Pacific/Pago_Pago', city: 'Pago Pago', country: 'American Samoa', flag: '🇦🇸', offset: '-11:00', utc: 'UTC-11:00' },

  // UTC-10
  { id: 'Pacific/Honolulu', city: 'Honolulu', country: 'USA', flag: '🇺🇸', offset: '-10:00', utc: 'UTC-10:00' },
  { id: 'Pacific/Tahiti', city: 'Tahiti', country: 'French Polynesia', flag: '🇵🇫', offset: '-10:00', utc: 'UTC-10:00' },

  // UTC-9
  { id: 'America/Anchorage', city: 'Anchorage', country: 'USA', flag: '🇺🇸', offset: '-09:00', utc: 'UTC-09:00' },
  { id: 'Pacific/Marquesas', city: 'Marquesas', country: 'French Polynesia', flag: '🇵🇫', offset: '-09:30', utc: 'UTC-09:30' },

  // UTC-8
  { id: 'America/Los_Angeles', city: 'Los Angeles', country: 'USA', flag: '🇺🇸', offset: '-08:00', utc: 'UTC-08:00' },
  { id: 'America/Vancouver', city: 'Vancouver', country: 'Canada', flag: '🇨🇦', offset: '-08:00', utc: 'UTC-08:00' },
  { id: 'America/Tijuana', city: 'Tijuana', country: 'Mexico', flag: '🇲🇽', offset: '-08:00', utc: 'UTC-08:00' },

  // UTC-7
  { id: 'America/Denver', city: 'Denver', country: 'USA', flag: '🇺🇸', offset: '-07:00', utc: 'UTC-07:00' },
  { id: 'America/Phoenix', city: 'Phoenix', country: 'USA', flag: '🇺🇸', offset: '-07:00', utc: 'UTC-07:00' },
  { id: 'America/Edmonton', city: 'Calgary', country: 'Canada', flag: '🇨🇦', offset: '-07:00', utc: 'UTC-07:00' },

  // UTC-6
  { id: 'America/Chicago', city: 'Chicago', country: 'USA', flag: '🇺🇸', offset: '-06:00', utc: 'UTC-06:00' },
  { id: 'America/Mexico_City', city: 'Mexico City', country: 'Mexico', flag: '🇲🇽', offset: '-06:00', utc: 'UTC-06:00' },
  { id: 'America/Winnipeg', city: 'Winnipeg', country: 'Canada', flag: '🇨🇦', offset: '-06:00', utc: 'UTC-06:00' },

  // UTC-5
  { id: 'America/New_York', city: 'New York', country: 'USA', flag: '🇺🇸', offset: '-05:00', utc: 'UTC-05:00' },
  { id: 'America/Toronto', city: 'Toronto', country: 'Canada', flag: '🇨🇦', offset: '-05:00', utc: 'UTC-05:00' },
  { id: 'America/Bogota', city: 'Bogotá', country: 'Colombia', flag: '🇨🇴', offset: '-05:00', utc: 'UTC-05:00' },
  { id: 'America/Lima', city: 'Lima', country: 'Peru', flag: '🇵🇪', offset: '-05:00', utc: 'UTC-05:00' },

  // UTC-4
  { id: 'America/Halifax', city: 'Halifax', country: 'Canada', flag: '🇨🇦', offset: '-04:00', utc: 'UTC-04:00' },
  { id: 'America/Caracas', city: 'Caracas', country: 'Venezuela', flag: '🇻🇪', offset: '-04:00', utc: 'UTC-04:00' },
  { id: 'America/Santiago', city: 'Santiago', country: 'Chile', flag: '🇨🇱', offset: '-04:00', utc: 'UTC-04:00' },

  // UTC-3
  { id: 'America/Sao_Paulo', city: 'São Paulo', country: 'Brazil', flag: '🇧🇷', offset: '-03:00', utc: 'UTC-03:00' },
  { id: 'America/Argentina/Buenos_Aires', city: 'Buenos Aires', country: 'Argentina', flag: '🇦🇷', offset: '-03:00', utc: 'UTC-03:00' },
  { id: 'America/Montevideo', city: 'Montevideo', country: 'Uruguay', flag: '🇺🇾', offset: '-03:00', utc: 'UTC-03:00' },

  // UTC-2
  { id: 'America/Noronha', city: 'Fernando de Noronha', country: 'Brazil', flag: '🇧🇷', offset: '-02:00', utc: 'UTC-02:00' },

  // UTC-1
  { id: 'Atlantic/Azores', city: 'Azores', country: 'Portugal', flag: '🇵🇹', offset: '-01:00', utc: 'UTC-01:00' },
  { id: 'Atlantic/Cape_Verde', city: 'Cape Verde', country: 'Cape Verde', flag: '🇨🇻', offset: '-01:00', utc: 'UTC-01:00' },

  // UTC+0
  { id: 'Europe/London', city: 'London', country: 'United Kingdom', flag: '🇬🇧', offset: '+00:00', utc: 'UTC+00:00' },
  { id: 'Africa/Casablanca', city: 'Casablanca', country: 'Morocco', flag: '🇲🇦', offset: '+00:00', utc: 'UTC+00:00' },
  { id: 'Atlantic/Reykjavik', city: 'Reykjavik', country: 'Iceland', flag: '🇮🇸', offset: '+00:00', utc: 'UTC+00:00' },

  // UTC+1
  { id: 'Europe/Paris', city: 'Paris', country: 'France', flag: '🇫🇷', offset: '+01:00', utc: 'UTC+01:00' },
  { id: 'Europe/Berlin', city: 'Berlin', country: 'Germany', flag: '🇩🇪', offset: '+01:00', utc: 'UTC+01:00' },
  { id: 'Europe/Rome', city: 'Rome', country: 'Italy', flag: '🇮🇹', offset: '+01:00', utc: 'UTC+01:00' },
  { id: 'Europe/Madrid', city: 'Madrid', country: 'Spain', flag: '🇪🇸', offset: '+01:00', utc: 'UTC+01:00' },
  { id: 'Africa/Lagos', city: 'Lagos', country: 'Nigeria', flag: '🇳🇬', offset: '+01:00', utc: 'UTC+01:00' },

  // UTC+2
  { id: 'Europe/Athens', city: 'Athens', country: 'Greece', flag: '🇬🇷', offset: '+02:00', utc: 'UTC+02:00' },
  { id: 'Europe/Helsinki', city: 'Helsinki', country: 'Finland', flag: '🇫🇮', offset: '+02:00', utc: 'UTC+02:00' },
  { id: 'Africa/Cairo', city: 'Cairo', country: 'Egypt', flag: '🇪🇬', offset: '+02:00', utc: 'UTC+02:00' },
  { id: 'Africa/Johannesburg', city: 'Johannesburg', country: 'South Africa', flag: '🇿🇦', offset: '+02:00', utc: 'UTC+02:00' },

  // UTC+3
  { id: 'Europe/Moscow', city: 'Moscow', country: 'Russia', flag: '🇷🇺', offset: '+03:00', utc: 'UTC+03:00' },
  { id: 'Asia/Riyadh', city: 'Riyadh', country: 'Saudi Arabia', flag: '🇸🇦', offset: '+03:00', utc: 'UTC+03:00' },
  { id: 'Africa/Nairobi', city: 'Nairobi', country: 'Kenya', flag: '🇰🇪', offset: '+03:00', utc: 'UTC+03:00' },

  // UTC+3:30
  { id: 'Asia/Tehran', city: 'Tehran', country: 'Iran', flag: '🇮🇷', offset: '+03:30', utc: 'UTC+03:30' },

  // UTC+4
  { id: 'Asia/Dubai', city: 'Dubai', country: 'UAE', flag: '🇦🇪', offset: '+04:00', utc: 'UTC+04:00' },
  { id: 'Asia/Baku', city: 'Baku', country: 'Azerbaijan', flag: '🇦🇿', offset: '+04:00', utc: 'UTC+04:00' },

  // UTC+4:30
  { id: 'Asia/Kabul', city: 'Kabul', country: 'Afghanistan', flag: '🇦🇫', offset: '+04:30', utc: 'UTC+04:30' },

  // UTC+5
  { id: 'Asia/Karachi', city: 'Karachi', country: 'Pakistan', flag: '🇵🇰', offset: '+05:00', utc: 'UTC+05:00' },
  { id: 'Asia/Tashkent', city: 'Tashkent', country: 'Uzbekistan', flag: '🇺🇿', offset: '+05:00', utc: 'UTC+05:00' },

  // UTC+5:30
  { id: 'Asia/Kolkata', city: 'Mumbai', country: 'India', flag: '🇮🇳', offset: '+05:30', utc: 'UTC+05:30' },
  { id: 'Asia/Colombo', city: 'Colombo', country: 'Sri Lanka', flag: '🇱🇰', offset: '+05:30', utc: 'UTC+05:30' },

  // UTC+5:45
  { id: 'Asia/Kathmandu', city: 'Kathmandu', country: 'Nepal', flag: '🇳🇵', offset: '+05:45', utc: 'UTC+05:45' },

  // UTC+6
  { id: 'Asia/Dhaka', city: 'Dhaka', country: 'Bangladesh', flag: '🇧🇩', offset: '+06:00', utc: 'UTC+06:00' },
  { id: 'Asia/Almaty', city: 'Almaty', country: 'Kazakhstan', flag: '🇰🇿', offset: '+06:00', utc: 'UTC+06:00' },

  // UTC+6:30
  { id: 'Asia/Yangon', city: 'Yangon', country: 'Myanmar', flag: '🇲🇲', offset: '+06:30', utc: 'UTC+06:30' },

  // UTC+7
  { id: 'Asia/Bangkok', city: 'Bangkok', country: 'Thailand', flag: '🇹🇭', offset: '+07:00', utc: 'UTC+07:00' },
  { id: 'Asia/Jakarta', city: 'Jakarta', country: 'Indonesia', flag: '🇮🇩', offset: '+07:00', utc: 'UTC+07:00' },
  { id: 'Asia/Ho_Chi_Minh', city: 'Ho Chi Minh City', country: 'Vietnam', flag: '🇻🇳', offset: '+07:00', utc: 'UTC+07:00' },

  // UTC+8
  { id: 'Asia/Shanghai', city: 'Shanghai', country: 'China', flag: '🇨🇳', offset: '+08:00', utc: 'UTC+08:00' },
  { id: 'Asia/Singapore', city: 'Singapore', country: 'Singapore', flag: '🇸🇬', offset: '+08:00', utc: 'UTC+08:00' },
  { id: 'Asia/Manila', city: 'Manila', country: 'Philippines', flag: '🇵🇭', offset: '+08:00', utc: 'UTC+08:00' },
  { id: 'Australia/Perth', city: 'Perth', country: 'Australia', flag: '🇦🇺', offset: '+08:00', utc: 'UTC+08:00' },

  // UTC+9
  { id: 'Asia/Tokyo', city: 'Tokyo', country: 'Japan', flag: '🇯🇵', offset: '+09:00', utc: 'UTC+09:00' },
  { id: 'Asia/Seoul', city: 'Seoul', country: 'South Korea', flag: '🇰🇷', offset: '+09:00', utc: 'UTC+09:00' },

  // UTC+9:30
  { id: 'Australia/Adelaide', city: 'Adelaide', country: 'Australia', flag: '🇦🇺', offset: '+09:30', utc: 'UTC+09:30' },

  // UTC+10
  { id: 'Australia/Sydney', city: 'Sydney', country: 'Australia', flag: '🇦🇺', offset: '+10:00', utc: 'UTC+10:00' },
  { id: 'Australia/Melbourne', city: 'Melbourne', country: 'Australia', flag: '🇦🇺', offset: '+10:00', utc: 'UTC+10:00' },
  { id: 'Pacific/Port_Moresby', city: 'Port Moresby', country: 'Papua New Guinea', flag: '🇵🇬', offset: '+10:00', utc: 'UTC+10:00' },

  // UTC+11
  { id: 'Pacific/Noumea', city: 'Noumea', country: 'New Caledonia', flag: '🇳🇨', offset: '+11:00', utc: 'UTC+11:00' },
  { id: 'Pacific/Guadalcanal', city: 'Honiara', country: 'Solomon Islands', flag: '🇸🇧', offset: '+11:00', utc: 'UTC+11:00' },

  // UTC+12
  { id: 'Pacific/Auckland', city: 'Auckland', country: 'New Zealand', flag: '🇳🇿', offset: '+12:00', utc: 'UTC+12:00' },
  { id: 'Pacific/Fiji', city: 'Suva', country: 'Fiji', flag: '🇫🇯', offset: '+12:00', utc: 'UTC+12:00' },

  // UTC+13
  { id: 'Pacific/Apia', city: 'Apia', country: 'Samoa', flag: '🇼🇸', offset: '+13:00', utc: 'UTC+13:00' },
  { id: 'Pacific/Tongatapu', city: 'Nuku\'alofa', country: 'Tonga', flag: '🇹🇴', offset: '+13:00', utc: 'UTC+13:00' },

  // UTC+14
  { id: 'Pacific/Kiritimati', city: 'Kiritimati', country: 'Kiribati', flag: '🇰🇮', offset: '+14:00', utc: 'UTC+14:00' },
];

export const getTimezoneById = (id: string): Timezone | undefined => {
  return TIMEZONES.find(tz => tz.id === id);
};

export const getCurrentTimeInTimezone = (timezoneId: string): string => {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezoneId,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    return formatter.format(now);
  } catch {
    return '00:00 AM';
  }
};