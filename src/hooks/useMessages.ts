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

        // Mark messages as read
        const unreadMessages = transformedMessages.filter(
          msg => msg.sender_id === chatId && !msg.read_at
        );

        if (unreadMessages.length > 0) {
          const { error: updateError } = await supabase
            .from('messages')
            .update({ read_at: new Date().toISOString() })
            .in('id', unreadMessages.map(msg => msg.id));

          if (updateError) {
            console.error('Error marking messages as read:', updateError);
          }
        }
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
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
            filter: `or(and(sender_id.eq.${chatId},receiver_id.eq.${user.id}),and(sender_id.eq.${user.id},receiver_id.eq.${chatId}))`,
        },
          (payload) => {
          console.log('New message received:', payload);
            // Add new message directly to state instead of refetching
            if (payload.new) {
            const newMessage: Message = {
                id: payload.new.id,
                content: payload.new.content,
                sender_id: payload.new.sender_id,
                receiver_id: payload.new.receiver_id,
                created_at: payload.new.created_at,
                reply_to: undefined,
                reactions: {},
                read_at: payload.new.read_at,
                is_read: !!payload.new.read_at,
                status: payload.new.read_at ? 'read' : 'delivered',
                delivered_at: payload.new.created_at
              };
              setMessages(prev => [...prev, newMessage]);
              
              // If this is a message sent TO us, mark it as delivered and then read
              if (payload.new.sender_id === chatId && payload.new.receiver_id === user.id) {
                // Mark as delivered first
                setTimeout(() => {
                  setMessages(prev => prev.map(msg => 
                    msg.id === payload.new.id ? { ...msg, status: 'delivered' } : msg
                  ));
                }, 1000);
                
                // Mark as read after a short delay
                setTimeout(async () => {
                  const { error } = await supabase
                    .from('messages')
                    .update({ read_at: new Date().toISOString() })
                    .eq('id', payload.new.id);
                  
                  if (!error) {
                    setMessages(prev => prev.map(msg => 
                      msg.id === payload.new.id ? { ...msg, status: 'read' } : msg
                    ));
                  }
                }, 2000);
              }
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
            filter: `or(and(sender_id.eq.${chatId},receiver_id.eq.${user.id}),and(sender_id.eq.${user.id},receiver_id.eq.${chatId}))`,
          },
          (payload) => {
            console.log('Message updated:', payload);
            // Update specific message in state
            if (payload.new) {
              setMessages(prev => prev.map(msg => 
                msg.id === payload.new.id ? { 
                  ...msg, 
                  ...payload.new,
                  status: payload.new.read_at ? 'read' : 'delivered'
                } : msg
              ));
            }
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

  return {
    messages,
    sendMessage,
    loading,
    refreshMessages
  };
};
