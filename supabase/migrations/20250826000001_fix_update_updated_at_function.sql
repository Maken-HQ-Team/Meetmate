-- Fix the update_updated_at_column function and all related triggers
-- This migration addresses the "record 'old' has no field 'content'" error

-- First, drop all existing triggers that might be causing conflicts
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_availability_updated_at ON public.availability;
DROP TRIGGER IF EXISTS update_messages_updated_at ON public.messages;

-- Drop the existing function to ensure a clean slate
DROP FUNCTION IF EXISTS public.update_updated_at_column();

-- Recreate the function with a clean, simple implementation
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update the updated_at timestamp, don't reference any specific fields
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate all triggers with the correct function
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_availability_updated_at
  BEFORE UPDATE ON public.availability
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Verify that no other problematic triggers exist
-- This will help identify if there are any other triggers causing issues
DO $$
DECLARE
  trigger_record RECORD;
BEGIN
  FOR trigger_record IN 
    SELECT 
      tgname as trigger_name,
      tgrelid::regclass as table_name,
      tgfoid::regproc as function_name
    FROM pg_trigger 
    WHERE tgrelid::regclass::text LIKE '%profiles%'
      OR tgrelid::regclass::text LIKE '%availability%'
      OR tgrelid::regclass::text LIKE '%messages%'
  LOOP
    RAISE NOTICE 'Trigger: % on table % using function %', 
      trigger_record.trigger_name, 
      trigger_record.table_name, 
      trigger_record.function_name;
  END LOOP;
END $$;
