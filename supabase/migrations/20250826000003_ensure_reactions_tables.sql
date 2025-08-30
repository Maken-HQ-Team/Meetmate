-- Ensure all reaction-related tables and columns exist
-- This migration makes sure the reaction system is fully set up

-- Add reply_to_id column to messages if it doesn't exist
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL;

-- Add reactions JSONB column to messages if it doesn't exist
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '{}';

-- Create message_reactions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- Enable RLS on message_reactions if not already enabled
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view reactions on messages they can see" ON public.message_reactions;
DROP POLICY IF EXISTS "Users can add reactions to messages they can see" ON public.message_reactions;
DROP POLICY IF EXISTS "Users can remove their own reactions" ON public.message_reactions;

-- Create RLS Policies for message_reactions
CREATE POLICY "Users can view reactions on messages they can see" 
  ON public.message_reactions 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.messages 
      WHERE id = message_reactions.message_id 
      AND (sender_id = auth.uid() OR receiver_id = auth.uid())
    )
  );

CREATE POLICY "Users can add reactions to messages they can see" 
  ON public.message_reactions 
  FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.messages 
      WHERE id = message_reactions.message_id 
      AND (sender_id = auth.uid() OR receiver_id = auth.uid())
    )
  );

CREATE POLICY "Users can remove their own reactions" 
  ON public.message_reactions 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Enable realtime for message_reactions
ALTER TABLE public.message_reactions REPLICA IDENTITY FULL;

-- Add to realtime publication if not already there
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'message_reactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON public.message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_messages_reply_to_id ON public.messages(reply_to_id);

-- Create a function to get aggregated reactions for messages
CREATE OR REPLACE FUNCTION get_message_reactions(message_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_object_agg(emoji, user_ids) INTO result
  FROM (
    SELECT 
      emoji,
      jsonb_agg(user_id) as user_ids
    FROM message_reactions
    WHERE message_id = message_id_param
    GROUP BY emoji
  ) reactions;
  
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;
