-- Add bio and avatar_url columns to profiles table if they don't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS bio text,
ADD COLUMN IF NOT EXISTS avatar_url text;

-- Update availability status enum to include new statuses
ALTER TYPE availability_status RENAME TO availability_status_old;

CREATE TYPE availability_status AS ENUM (
  'available',
  'busy', 
  'do_not_disturb',
  'sleeping',
  'idle',
  'lunch_time',
  'breakfast',
  'dinner'
);

-- Update the availability table to use new enum
ALTER TABLE public.availability ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.availability ALTER COLUMN status TYPE availability_status USING status::text::availability_status;
ALTER TABLE public.availability ALTER COLUMN status SET DEFAULT 'available'::availability_status;

-- Drop the old enum
DROP TYPE availability_status_old;

-- Update profiles RLS policies to allow viewing shared profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can view shared profiles" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.shares 
    WHERE shares.owner_id = profiles.user_id 
    AND shares.viewer_id = auth.uid() 
    AND shares.is_active = true
  )
);