import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Conversation {
  id: string;
  contact_id: string;
  contact_profile: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
  };
  last_message?: {
    id: string;
    content: string;
    created_at: string;
    sender_id: string;
  };
  unread_count: number;
  updated_at: string;
}

export const useConversations = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Get all conversations for the user
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (messagesError) throw messagesError;

      // Get unique contact IDs from messages
      const contactIds = new Set<string>();
      messages?.forEach((message) => {
        const isSender = message.sender_id === user.id;
        const contactId = isSender ? message.receiver_id : message.sender_id;
        contactIds.add(contactId);
      });

      // Get contact profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', Array.from(contactIds));

      if (profilesError) throw profilesError;

      // Create a map of profiles by user_id
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Group messages by conversation (contact)
      const conversationMap = new Map<string, Conversation>();

      messages?.forEach((message) => {
        const isSender = message.sender_id === user.id;
        const contactId = isSender ? message.receiver_id : message.sender_id;
        const contactProfile = profileMap.get(contactId);

        if (!contactProfile) return; // Skip if profile not found

        if (!conversationMap.has(contactId)) {
          conversationMap.set(contactId, {
            id: contactId,
            contact_id: contactId,
            contact_profile: {
              id: contactProfile.user_id,
              name: contactProfile.name,
              email: contactProfile.email,
              avatar_url: contactProfile.avatar_url
            },
            last_message: undefined,
            unread_count: 0,
            updated_at: message.created_at
          });
        }

        const conversation = conversationMap.get(contactId)!;

        // Update last message if this message is newer
        if (!conversation.last_message || 
            new Date(message.created_at) > new Date(conversation.last_message.created_at)) {
          conversation.last_message = {
            id: message.id,
            content: message.content,
            created_at: message.created_at,
            sender_id: message.sender_id
          };
          conversation.updated_at = message.created_at;
        }

        // Count unread messages
        if (message.receiver_id === user.id && !message.read_at) {
          conversation.unread_count++;
        }
      });

      // Convert map to array and sort by last message time
      const conversationsArray = Array.from(conversationMap.values())
        .sort((a, b) => {
          if (a.last_message && b.last_message) {
            return new Date(b.last_message.created_at).getTime() - 
                   new Date(a.last_message.created_at).getTime();
          }
          if (a.last_message) return -1;
          if (b.last_message) return 1;
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        });

      setConversations(conversationsArray);
    } catch (error: any) {
      console.error('Error fetching conversations:', error);
      toast({
        title: "Error",
        description: "Failed to load conversations. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  const startConversation = useCallback(async (contactId: string): Promise<Conversation | null> => {
    if (!user) return null;

    try {
      // Check if conversation already exists
      const existingConversation = conversations.find(c => c.contact_id === contactId);
      if (existingConversation) {
        return existingConversation;
      }

      // Get contact profile
      const { data: contactProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', contactId)
        .single();

      if (profileError) throw profileError;

      // Create new conversation entry
      const newConversation: Conversation = {
        id: contactId,
        contact_id: contactId,
        contact_profile: {
          id: contactProfile.user_id,
          name: contactProfile.name,
          email: contactProfile.email,
          avatar_url: contactProfile.avatar_url
        },
        last_message: undefined,
        unread_count: 0,
        updated_at: new Date().toISOString()
      };

      // Add to conversations list
      setConversations(prev => [newConversation, ...prev]);

      return newConversation;
    } catch (error: any) {
      console.error('Error starting conversation:', error);
      toast({
        title: "Error",
        description: "Failed to start conversation. Please try again.",
        variant: "destructive",
      });
      return null;
    }
  }, [user, conversations, toast]);

  const refreshConversations = useCallback(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Set up real-time subscription for conversation updates
  useEffect(() => {
    if (!user) return;

    fetchConversations();

    const channel = supabase
      .channel('conversations-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `or(sender_id.eq.${user.id},receiver_id.eq.${user.id})`,
        },
        (payload) => {
          console.log('Message change:', payload);
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchConversations]);

  return {
    conversations,
    loading,
    startConversation,
    refreshConversations
  };
};
