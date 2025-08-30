-- Add reactions column to messages table if it doesn't exist
-- This ensures the reaction system works properly

-- Add reactions JSONB column to messages if it doesn't exist
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '{}';

-- Add reply_to_id column to messages if it doesn't exist
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL;

-- Create index on reactions column for better performance
CREATE INDEX IF NOT EXISTS idx_messages_reactions ON public.messages USING GIN (reactions);

-- Update existing messages to have empty reactions if they don't have any
UPDATE public.messages 
SET reactions = '{}'::jsonb 
WHERE reactions IS NULL;

-- Verify the structure
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'messages' 
  AND column_name IN ('reactions', 'reply_to_id')
ORDER BY column_name;
