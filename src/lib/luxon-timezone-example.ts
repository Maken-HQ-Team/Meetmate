// Luxon example for full timezone support
import { DateTime } from 'luxon';

// Convert UTC to Asia/Karachi
const utcDate = DateTime.utc();
const karachiDate = utcDate.setZone('Asia/Karachi');
console.log('Asia/Karachi time:', karachiDate.toString());

// Usage in your app: replace date-fns-tz usage with Luxon
// Example: format a date in Asia/Karachi
const formatted = karachiDate.toFormat('yyyy-MM-dd HH:mm');
console.log('Formatted:', formatted);
