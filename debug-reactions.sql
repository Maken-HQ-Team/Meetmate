-- Debug script to check the current state of the reaction system
-- Run this in your Supabase SQL editor

-- 1. Check if the messages table has the reactions column
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'messages' 
  AND column_name = 'reactions';

-- 2. Check if the message_reactions table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'message_reactions';

-- 3. Check the current structure of the messages table
SELECT 
  column_name, 
  data_type
FROM information_schema.columns 
WHERE table_name = 'messages'
ORDER BY ordinal_position;

-- 4. Check if there are any messages with reactions
SELECT id, content, reactions 
FROM messages 
WHERE reactions IS NOT NULL AND reactions != '{}'::jsonb
LIMIT 5;

-- 5. Check if the message_reactions table has any data
SELECT COUNT(*) as reaction_count FROM message_reactions;

-- 6. Check if the get_message_reactions function exists
SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_name = 'get_message_reactions';
