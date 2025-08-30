-- Apply the RLS policy fix migration
-- This should be run in the Supabase SQL editor

-- Fix RLS policies for profiles table to resolve conflicts and enable shared profile viewing

-- Drop all existing SELECT policies for profiles to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view shared profiles" ON public.profiles;

-- Create a single comprehensive policy for profile viewing
CREATE POLICY "Users can view profiles" 
ON public.profiles 
FOR SELECT 
USING (
  -- Users can always view their own profile
  auth.uid() = user_id 
  OR 
  -- Users can view profiles of users who have shared their availability
  EXISTS (
    SELECT 1 FROM public.shares 
    WHERE shares.owner_id = profiles.user_id 
    AND shares.viewer_id = auth.uid() 
    AND shares.is_active = true
  )
);

-- Add debugging function to help troubleshoot RLS issues
CREATE OR REPLACE FUNCTION debug_profile_access(target_user_id uuid)
RETURNS TABLE (
  can_access boolean,
  is_own_profile boolean,
  has_active_share boolean,
  current_user_id uuid
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (auth.uid() = target_user_id OR EXISTS (
      SELECT 1 FROM public.shares 
      WHERE shares.owner_id = target_user_id 
      AND shares.viewer_id = auth.uid() 
      AND shares.is_active = true
    )) as can_access,
    auth.uid() = target_user_id as is_own_profile,
    EXISTS (
      SELECT 1 FROM public.shares 
      WHERE shares.owner_id = target_user_id 
      AND shares.viewer_id = auth.uid() 
      AND shares.is_active = true
    ) as has_active_share,
    auth.uid() as current_user_id;
END;
$$;