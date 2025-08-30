-- Update availability_status enum to only include the three needed statuses
-- First, update any existing records that use the old statuses to map to the new ones
UPDATE availability 
SET status = CASE 
  WHEN status = 'busy' THEN 'do_not_disturb'
  WHEN status = 'sleeping' THEN 'idle'
  WHEN status = 'lunch_time' THEN 'idle'
  WHEN status = 'breakfast' THEN 'idle'
  WHEN status = 'dinner' THEN 'idle'
  ELSE status
END
WHERE status NOT IN ('available', 'idle', 'do_not_disturb');

-- Create new enum with only the three statuses
CREATE TYPE availability_status_new AS ENUM ('available', 'idle', 'do_not_disturb');

-- Update the table to use the new enum
ALTER TABLE availability 
  ALTER COLUMN status TYPE availability_status_new 
  USING status::text::availability_status_new;

-- Drop the old enum and rename the new one
DROP TYPE availability_status;
ALTER TYPE availability_status_new RENAME TO availability_status;