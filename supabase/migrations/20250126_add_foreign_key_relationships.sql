-- Migration: Add foreign key relationships for availability and messages tables
-- Created: 2025-01-26
-- Purpose: Fix database relationship issues causing JOIN query failures

-- Check if foreign key constraints already exist before creating them
DO $$
BEGIN
    -- Add foreign key constraint for availability table if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_availability_user_id' 
        AND table_name = 'availability'
    ) THEN
        ALTER TABLE availability 
        ADD CONSTRAINT fk_availability_user_id 
        FOREIGN KEY (user_id) REFERENCES profiles(user_id) 
        ON DELETE CASCADE;
        
        RAISE NOTICE 'Added foreign key constraint fk_availability_user_id';
    ELSE
        RAISE NOTICE 'Foreign key constraint fk_availability_user_id already exists';
    END IF;

    -- Add foreign key constraint for messages table if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_messages_sender_id' 
        AND table_name = 'messages'
    ) THEN
        ALTER TABLE messages 
        ADD CONSTRAINT fk_messages_sender_id 
        FOREIGN KEY (sender_id) REFERENCES profiles(user_id) 
        ON DELETE CASCADE;
        
        RAISE NOTICE 'Added foreign key constraint fk_messages_sender_id';
    ELSE
        RAISE NOTICE 'Foreign key constraint fk_messages_sender_id already exists';
    END IF;
END $$;

-- Create indexes for performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_availability_user_id ON availability(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);

-- Additional indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_availability_user_day ON availability(user_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_created ON messages(receiver_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver ON messages(sender_id, receiver_id);

-- Refresh Supabase schema cache to recognize new relationships
NOTIFY pgrst, 'reload schema';

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Migration completed: Foreign key relationships and indexes added successfully';
END $$;