-- Test script for the reaction system
-- Run this in your Supabase SQL editor to test reactions

-- First, let's check if the tables exist
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('messages', 'message_reactions')
ORDER BY table_name, ordinal_position;

-- Check if the message_reactions table has the right structure
SELECT * FROM message_reactions LIMIT 5;

-- Check if messages table has the reactions column
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'messages' AND column_name = 'reactions';

-- Test inserting a reaction (replace with actual message_id and user_id)
-- INSERT INTO message_reactions (message_id, user_id, emoji) 
-- VALUES ('your-message-id-here', 'your-user-id-here', '👍');

-- Test the get_message_reactions function
-- SELECT get_message_reactions('your-message-id-here');

-- Check all triggers on the messages table
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'messages';
