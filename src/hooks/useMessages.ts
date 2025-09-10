import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  receiver_id?: string;
  group_id?: string;
  sender_name?: string;
  created_at: string;
  reply_to?: {
    id: string;
    content: string;
    sender_name: string;
  };
  reactions: {
    [key: string]: string[]; // reaction_type -> user_ids
  };
  read_at?: string;
  is_read: boolean; // Whether the message has been read
  // Message status tracking
  status: 'sending' | 'sent' | 'delivered' | 'read';
  delivered_at?: string;
}

interface GroupMessage {
  id: string;
  content: string;
  sender_id: string;
  sender_name: string;
  group_id: string;
  created_at: string;
  reply_to?: {
    id: string;
    content: string;
    sender_name: string;
    };
  reactions: {
    [key: string]: string[]; // reaction_type -> user_ids
  };
  is_read: boolean; // Whether the message has been read
}

export const useMessages = (
  chatId: string | null,
  chatType: 'contact' | 'group' | null
) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    if (!chatId || !chatType || !user) return;

    try {
      setLoading(true);

      if (chatType === 'contact') {
        // Fetch individual chat messages
      const { data, error } = await supabase
        .from('messages')
          .select('id, content, sender_id, receiver_id, created_at, read_at, reactions, reply_to_id')
          .or(`and(sender_id.eq.${user.id},receiver_id.eq.${chatId}),and(sender_id.eq.${chatId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;

        // Transform messages
        const transformedMessages = data?.map(msg => ({
        id: msg.id,
          content: msg.content,
        sender_id: msg.sender_id,
        receiver_id: msg.receiver_id,
        created_at: msg.created_at,
          reply_to: undefined, // TODO: Implement reply functionality
          reactions: msg.reactions || {}, // Use reactions from database
        read_at: msg.read_at,
          is_read: !!msg.read_at, // Add is_read field based on read_at
          status: (msg.read_at ? 'read' : 'delivered') as 'read' | 'delivered',
          delivered_at: msg.created_at
        })) || [];

      setMessages(transformedMessages);
      } else if (chatType === 'group') {
        // TODO: Implement group messages when group_messages table is created
        console.log('Group messages not yet implemented');
        setMessages([]);
      }
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      toast({
        title: "Error",
        description: "Failed to load messages. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [chatId, chatType, user, toast]);

  const sendMessage = useCallback(async (
    content: string,
    replyTo?: string
  ): Promise<boolean> => {
    if (!chatId || !chatType || !user || !content.trim()) return false;

    try {
      if (chatType === 'contact') {
        // Create optimistic message for immediate UI update
        const optimisticMessage: Message = {
          id: `temp-${Date.now()}`,
          content: content.trim(),
          sender_id: user.id,
          receiver_id: chatId,
          created_at: new Date().toISOString(),
          reply_to: undefined,
          reactions: {},
          read_at: undefined,
          is_read: false,
          status: 'sending',
          delivered_at: undefined
        };

        // Add optimistic message immediately
        setMessages(prev => [...prev, optimisticMessage]);

        // Send message to server
      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
            receiver_id: chatId,
          content: content.trim(),
            reply_to_id: replyTo || null
          })
          .select()
        .single();

      if (error) throw error;

        // Replace optimistic message with real message and update status
      setMessages(prev => prev.map(msg =>
          msg.id === optimisticMessage.id ? { 
              ...msg,
            id: data.id, 
            status: 'sent' as const,
            delivered_at: new Date().toISOString()
          } : msg
        ));

      } else if (chatType === 'group') {
        // TODO: Implement group messages when group_messages table is created
        console.log('Group messages not yet implemented');
      return false;
    }

      return true;
    } catch (error: any) {
      console.error('Error sending message:', error);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => !msg.id.startsWith('temp-')));
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  }, [chatId, chatType, user, toast]);

  const refreshMessages = useCallback(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Set up real-time subscription for new messages
  useEffect(() => {
    if (!chatId || !chatType || !user) return;

    fetchMessages();

    // Only set up real-time subscription for individual messages for now
    if (chatType === 'contact') {
    const channel = supabase
        .channel(`messages-${chatId}-${user.id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const m = payload.new;
          if (!m) return;
          // Only process messages relevant to this chat
          const isForThisChat =
            (m.sender_id === chatId && m.receiver_id === user.id) ||
            (m.sender_id === user.id && m.receiver_id === chatId);
          if (!isForThisChat) return;
          console.log('[useMessages] realtime INSERT for this chat:', m.id);
          const newMessage: Message = {
            id: m.id,
            content: m.content,
            sender_id: m.sender_id,
            receiver_id: m.receiver_id,
            created_at: m.created_at,
            reply_to: undefined,
            reactions: {},
            read_at: m.read_at,
            is_read: !!m.read_at,
            status: m.read_at ? 'read' : 'delivered',
            delivered_at: m.created_at
          };
          setMessages(prev => [...prev, newMessage]);
        }
      )
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'messages' },
          (payload) => {
            const m = payload.new;
            if (!m) return;
            const isForThisChat =
              (m.sender_id === chatId && m.receiver_id === user.id) ||
              (m.sender_id === user.id && m.receiver_id === chatId);
            if (!isForThisChat) return;
            console.log('[useMessages] realtime UPDATE for this chat:', m.id);
            setMessages(prev => prev.map(msg =>
              msg.id === m.id ? { ...msg, read_at: m.read_at, status: m.read_at ? 'read' : 'delivered' } : msg
            ));
          }
        )
        .subscribe((status) => {
          console.log('Subscription status:', status);
        });

    return () => {
        console.log('Cleaning up subscription for:', chatId);
      supabase.removeChannel(channel);
    };
    }
  }, [chatId, chatType, user, fetchMessages]);

  const markInboundAsRead = useCallback(async () => {
    if (!chatId || !user) return;
    try {
      const inboundUnread = messages.filter(m => m.sender_id === chatId && !m.read_at);
      if (inboundUnread.length === 0) return;

      const { error } = await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .in('id', inboundUnread.map(m => m.id));

      if (!error) {
        const now = new Date().toISOString();
        setMessages(prev => prev.map(m =>
          inboundUnread.some(u => u.id === m.id)
            ? { ...m, read_at: now, status: 'read' }
            : m
        ));
      }
    } catch (e) {
      console.error('Failed to mark inbound as read', e);
    }
  }, [chatId, user, messages]);

  return {
    messages,
    sendMessage,
    loading,
    refreshMessages,
    markInboundAsRead
  };
};
