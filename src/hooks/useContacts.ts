import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Message } from '@/types/message';

interface Contact {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  bio?: string;
  country?: string;
  timezone?: string;
  last_message?: {
    content: string;
    created_at: string;
    sender_id: string;
  };
  unread_count: number;
  is_online?: boolean;
  last_seen?: string;
  is_blocked?: boolean;
}

export const useContacts = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContacts = useCallback(async () => {
    if (!user) return;

          try {
        setLoading(true);

      // Get contacts based on shared availability relationships (both directions, any status)
      const { data: shares, error: sharesError } = await supabase
        .from('shares')
        .select('*')
        .or(`owner_id.eq.${user.id},viewer_id.eq.${user.id}`);

      console.log('[useContacts] Shares data:', shares); // Debug log
      console.log('[useContacts] Shares error:', sharesError); // Debug log

      if (sharesError) throw sharesError;

      // Get unique contact IDs (excluding the current user)
      const contactIds = new Set<string>();
      shares?.forEach(share => {
        if (share.owner_id === user.id) {
          if (share.viewer_id !== user.id) contactIds.add(share.viewer_id);
        } else {
          if (share.owner_id !== user.id) contactIds.add(share.owner_id);
        }
      });

      // Also include anyone we've exchanged messages with (both directions)
      try {
        const { data: partnerMessages, error: partnerErr } = await supabase
          .from('messages')
          .select('sender_id, receiver_id')
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .limit(1000);

        if (!partnerErr && partnerMessages) {
          partnerMessages.forEach((m: any) => {
            if (m.sender_id && m.sender_id !== user.id) contactIds.add(m.sender_id);
            if (m.receiver_id && m.receiver_id !== user.id) contactIds.add(m.receiver_id);
          });
        }
      } catch (e) {
        console.log('[useContacts] Error collecting message partners:', e);
      }

      console.log('[useContacts] Contact IDs extracted:', Array.from(contactIds));

      // If still no contacts, return empty contacts list
      if (contactIds.size === 0) {
        console.log('[useContacts] No contacts found via shares or messages');
        setContacts([]);
        return;
      }

      // Prepare arrays and get contact profiles
      const allContactIds = Array.from(contactIds);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', allContactIds);

      console.log('[useContacts] Contact IDs:', allContactIds); // Debug log
      console.log('[useContacts] Profiles data:', profiles); // Debug log
      console.log('[useContacts] Profiles error:', profilesError); // Debug log

      if (profilesError) throw profilesError;

      // Index profiles by user_id for easy lookup
      const profileMap = new Map<string, any>();
      (profiles || []).forEach((p: any) => profileMap.set(p.user_id, p));

      // Get last messages and unread counts
      let lastMessages = {} as Record<string, any>;
      let unreadCounts = {} as Record<string, number>;
      try {
        const { data: messageData, error: messageError } = await supabase
          .from('messages')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (!messageError && messageData) {
          allContactIds.forEach(contactId => {
            const lastMessage = messageData.find(msg => 
              (msg.sender_id === contactId && msg.receiver_id === user.id) ||
              (msg.sender_id === user.id && msg.receiver_id === contactId)
            );
            lastMessages[contactId] = lastMessage;

            // Count unread messages from this contact to current user
            // Client-side "last seen" override: if last inbound message is before lastSeen, treat as read
            const lastSeen = sessionStorage.getItem(`lastSeen_${contactId}`);
            const unreadForContact = messageData.filter(msg => {
              const isInbound = msg.sender_id === contactId && msg.receiver_id === user.id;
              if (!isInbound) return false;
              if (lastSeen && new Date(msg.created_at) <= new Date(lastSeen)) return false;
              return msg.read_at === null || msg.read_at === undefined;
            }).length;
            unreadCounts[contactId] = unreadForContact;
          });
          console.log('[useContacts] Computed unreadCounts:', unreadCounts);
        }
      } catch (error) {
        console.log('[useContacts] Error getting messages:', error);
      }

      // Process contacts from allContactIds to ensure inclusion even without profile rows
      const contactsWithMessages = allContactIds.map(contactId => {
        const prof = profileMap.get(contactId);
        const lastMessage = lastMessages[contactId];

        // Simplified status flags
        const isBlocked = false; // TODO: Implement user blocking
        const isOnline = false; // TODO: Implement real-time presence
        const lastSeen = new Date().toISOString(); // TODO: Implement last seen tracking

        return {
          id: contactId,
          name: prof?.name || 'Pending share',
          email: prof?.email || '',
          avatar_url: prof?.avatar_url,
          bio: prof?.bio,
          country: prof?.country,
          timezone: prof?.timezone,
          last_message: lastMessage || undefined,
          unread_count: unreadCounts[contactId] || 0,
          is_online: isOnline,
          last_seen: lastSeen,
          is_blocked: isBlocked
        };
      });

      // Sort contacts by last message time or name
      const sortedContacts = contactsWithMessages.sort((a, b) => {
        if (a.last_message && b.last_message) {
          return new Date(b.last_message.created_at).getTime() - new Date(a.last_message.created_at).getTime();
        }
        if (a.last_message) return -1;
        if (b.last_message) return 1;
        return a.name.localeCompare(b.name);
      });

      console.log('[useContacts] Final contacts set (ids, unread):', sortedContacts.map(c => ({ id: c.id, unread: c.unread_count })));
      setContacts(sortedContacts);
    } catch (error: any) {
      console.error('Error fetching contacts:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      toast({
        title: "Error",
        description: `Failed to load contacts: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

      // Initial fetch and real-time subscription
  useEffect(() => {
    if (user) {
      fetchContacts();
      
      // Subscribe to new messages for real-time updates
      const channel = supabase
        .channel('messages-channel')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `receiver_id.eq.${user.id}`,
          },
          (payload) => {
            console.log('[useContacts] INSERT message received:', { id: payload.new?.id, read_at: payload.new?.read_at });
            // Refresh contacts to show new messages
            fetchContacts();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
            filter: `receiver_id.eq.${user.id}`,
          },
          (payload) => {
            console.log('[useContacts] UPDATE message received:', { id: payload.new?.id, read_at: payload.new?.read_at });
            // Refresh contacts to update unread counts immediately
            fetchContacts();
          }
        )
        .subscribe();
        
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, fetchContacts]);

  const refreshContacts = useCallback(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Removed refreshContactUnreadCount function

  // Removed getTotalUnreadCount function

  const markContactAsRead = useCallback(async (contactId: string) => {
    if (!user) return;
    
    // Immediately remove unread label when contact is clicked (UI update)
    console.log(`Marking contact ${contactId} as read (removing unread label)`);
    setContacts(prev => prev.map(contact => 
      contact.id === contactId 
        ? { ...contact, unread_count: 0 }
        : contact
    ));
    
    // Mark all messages from this contact as read
    try {
      // Use proper typing to avoid TypeScript errors
      const { error: updateError } = await supabase
        .from('messages')
        .update({ 
          read_at: new Date().toISOString() 
        })
        .eq('receiver_id', user.id)
        .eq('sender_id', contactId)
        .is('read_at', null) as { error: any };
          
      if (updateError) {
        console.error('Update failed:', updateError);
      } else {
        console.log('Successfully marked messages as read');
        
        // Removed total unread count refresh
        console.log('Messages marked as read');
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }, [user]);

  return {
    contacts,
    loading,
    refreshContacts,
    markContactAsRead
  };
};
