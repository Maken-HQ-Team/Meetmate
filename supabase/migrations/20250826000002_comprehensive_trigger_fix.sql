-- Comprehensive fix for all trigger-related issues
-- This migration addresses the "record 'old' has no field 'content'" error

-- First, let's identify and drop ONLY user-created triggers that might be causing conflicts
-- We'll exclude system-generated triggers (like RI_ConstraintTrigger_*)
DO $$
DECLARE
  trigger_record RECORD;
BEGIN
  -- Drop only user-created triggers on profiles, availability, and messages tables
  -- Exclude system-generated triggers that start with 'RI_ConstraintTrigger_'
  FOR trigger_record IN 
    SELECT 
      tgname as trigger_name,
      tgrelid::regclass as table_name
    FROM pg_trigger 
    WHERE (tgrelid::regclass::text LIKE '%profiles%'
      OR tgrelid::regclass::text LIKE '%availability%'
      OR tgrelid::regclass::text LIKE '%messages%'
      OR tgrelid::regclass::text LIKE '%groups%'
      OR tgrelid::regclass::text LIKE '%chat_invitations%'
      OR tgrelid::regclass::text LIKE '%email_invitations%')
      AND tgname NOT LIKE 'RI_ConstraintTrigger_%'  -- Exclude system FK triggers
      AND tgname NOT LIKE 'pg_%'                    -- Exclude other system triggers
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %s', trigger_record.trigger_name, trigger_record.table_name);
    RAISE NOTICE 'Dropped trigger: % on table %', trigger_record.trigger_name, trigger_record.table_name;
  END LOOP;
END $$;

-- Drop ALL update_updated_at_column functions to ensure a clean slate
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

-- Create a single, clean update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update the updated_at timestamp, don't reference any specific fields
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Now recreate ALL triggers with the correct function
-- Profiles table
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Availability table
CREATE TRIGGER update_availability_updated_at
  BEFORE UPDATE ON public.availability
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Messages table
CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Groups table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'groups' AND table_schema = 'public') THEN
    CREATE TRIGGER update_groups_updated_at
      BEFORE UPDATE ON public.groups
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Chat invitations table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_invitations' AND table_schema = 'public') THEN
    CREATE TRIGGER update_chat_invitations_updated_at
      BEFORE UPDATE ON public.chat_invitations
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Email invitations table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_invitations' AND table_schema = 'public') THEN
    CREATE TRIGGER update_email_invitations_updated_at
      BEFORE UPDATE ON public.email_invitations
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Verify that all triggers are properly set up
DO $$
DECLARE
  trigger_record RECORD;
BEGIN
  RAISE NOTICE '=== VERIFICATION: All triggers after fix ===';
  FOR trigger_record IN 
    SELECT 
      tgname as trigger_name,
      tgrelid::regclass as table_name,
      tgfoid::regproc as function_name
    FROM pg_trigger 
    WHERE (tgrelid::regclass::text LIKE '%profiles%'
      OR tgrelid::regclass::text LIKE '%availability%'
      OR tgrelid::regclass::text LIKE '%messages%'
      OR tgrelid::regclass::text LIKE '%groups%'
      OR tgrelid::regclass::text LIKE '%chat_invitations%'
      OR tgrelid::regclass::text LIKE '%email_invitations%')
    ORDER BY table_name, trigger_name
  LOOP
    RAISE NOTICE 'Trigger: % on table % using function %', 
      trigger_record.trigger_name, 
      trigger_record.table_name, 
      trigger_record.function_name;
  END LOOP;
END $$;
