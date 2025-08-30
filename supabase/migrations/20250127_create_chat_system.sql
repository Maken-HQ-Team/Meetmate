-- Create chat system tables and relationships
-- This migration adds support for individual chats, group chats, and messaging features

-- Create groups table
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  member_count INTEGER NOT NULL DEFAULT 1,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create group_members table
CREATE TABLE IF NOT EXISTS public.group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Create group_messages table
CREATE TABLE IF NOT EXISTS public.group_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  content TEXT NOT NULL,
  reply_to_id UUID REFERENCES public.group_messages(id) ON DELETE SET NULL,
  reactions JSONB DEFAULT '{}',
  read_by TEXT[] DEFAULT '{}',
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'image', 'file')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chat_invitations table
CREATE TABLE IF NOT EXISTS public.chat_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(inviter_id, invitee_id)
);

-- Create email_invitations table
CREATE TABLE IF NOT EXISTS public.email_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_email TEXT NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_blocks table
CREATE TABLE IF NOT EXISTS public.user_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

-- Update existing messages table to support replies and reactions
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '{}';

-- Enable RLS on new tables
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_groups_created_by ON public.groups(created_by);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON public.group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_group_id ON public.group_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_sender_id ON public.group_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_created_at ON public.group_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_invitations_inviter_id ON public.chat_invitations(inviter_id);
CREATE INDEX IF NOT EXISTS idx_chat_invitations_invitee_id ON public.chat_invitations(invitee_id);
CREATE INDEX IF NOT EXISTS idx_email_invitations_inviter_id ON public.email_invitations(inviter_id);
CREATE INDEX IF NOT EXISTS idx_email_invitations_invitee_email ON public.email_invitations(invitee_email);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker_id ON public.user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked_id ON public.user_blocks(blocked_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_groups_updated_at
  BEFORE UPDATE ON public.groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chat_invitations_updated_at
  BEFORE UPDATE ON public.chat_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_invitations_updated_at
  BEFORE UPDATE ON public.email_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for groups
CREATE POLICY "Users can view groups they are members of" 
  ON public.groups 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members 
      WHERE group_id = id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Group creators can manage their groups" 
  ON public.groups 
  FOR ALL 
  USING (created_by = auth.uid());

-- RLS Policies for group_members
CREATE POLICY "Users can view members of groups they belong to" 
  ON public.group_members 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm2
      WHERE gm2.group_id = group_id AND gm2.user_id = auth.uid()
    )
  );

CREATE POLICY "Group admins can manage members" 
  ON public.group_members 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_id AND gm.user_id = auth.uid() AND gm.role = 'admin'
    )
  );

CREATE POLICY "Users can join groups they are invited to" 
  ON public.group_members 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = group_id AND g.created_by = auth.uid()
    )
  );

-- RLS Policies for group_messages
CREATE POLICY "Users can view messages in groups they belong to" 
  ON public.group_messages 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members 
      WHERE group_id = group_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages to groups they belong to" 
  ON public.group_messages 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.group_members 
      WHERE group_id = group_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own messages" 
  ON public.group_messages 
  FOR UPDATE 
  USING (sender_id = auth.uid());

-- RLS Policies for chat_invitations
CREATE POLICY "Users can view invitations they sent or received" 
  ON public.chat_invitations 
  FOR SELECT 
  USING (inviter_id = auth.uid() OR invitee_id = auth.uid());

CREATE POLICY "Users can send chat invitations" 
  ON public.chat_invitations 
  FOR INSERT 
  WITH CHECK (inviter_id = auth.uid());

CREATE POLICY "Users can update invitations they received" 
  ON public.chat_invitations 
  FOR UPDATE 
  USING (invitee_id = auth.uid());

-- RLS Policies for email_invitations
CREATE POLICY "Users can view email invitations they sent" 
  ON public.email_invitations 
  FOR SELECT 
  USING (inviter_id = auth.uid());

CREATE POLICY "Users can send email invitations" 
  ON public.email_invitations 
  FOR INSERT 
  WITH CHECK (inviter_id = auth.uid());

-- RLS Policies for user_blocks
CREATE POLICY "Users can view blocks they created" 
  ON public.user_blocks 
  FOR SELECT 
  USING (blocker_id = auth.uid());

CREATE POLICY "Users can create blocks" 
  ON public.user_blocks 
  FOR INSERT 
  WITH CHECK (blocker_id = auth.uid());

CREATE POLICY "Users can delete blocks they created" 
  ON public.user_blocks 
  FOR DELETE 
  USING (blocker_id = auth.uid());

-- Enable realtime for new tables
ALTER TABLE public.groups REPLICA IDENTITY FULL;
ALTER TABLE public.group_members REPLICA IDENTITY FULL;
ALTER TABLE public.group_messages REPLICA IDENTITY FULL;
ALTER TABLE public.chat_invitations REPLICA IDENTITY FULL;
ALTER TABLE public.email_invitations REPLICA IDENTITY FULL;
ALTER TABLE public.user_blocks REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.groups;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_invitations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.email_invitations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_blocks;
