-- Add a test message to demonstrate the chat system
-- This will only work if there are at least 2 users in the system

-- Insert a test message (replace the UUIDs with actual user IDs from your system)
-- You can find user IDs in the auth.users table in Supabase dashboard

-- Example (uncomment and modify with real user IDs):
-- INSERT INTO public.messages (sender_id, receiver_id, content, created_at)
-- SELECT 
--   (SELECT id FROM auth.users LIMIT 1) as sender_id,
--   (SELECT id FROM auth.users OFFSET 1 LIMIT 1) as receiver_id,
--   'Hello! This is a test message to get the chat system started. 🚀',
--   NOW()
-- WHERE EXISTS (SELECT 1 FROM auth.users LIMIT 2);
