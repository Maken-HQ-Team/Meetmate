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

      // Get contacts based on shared availability relationships
      const { data: shares, error: sharesError } = await supabase
        .from('shares')
        .select('*')
        .or(`owner_id.eq.${user.id},viewer_id.eq.${user.id}`)
        .eq('is_active', true);

      console.log('Shares data:', shares); // Debug log
      console.log('Shares error:', sharesError); // Debug log

      if (sharesError) throw sharesError;

      // Get unique contact IDs (excluding the current user)
      const contactIds = new Set<string>();
      shares?.forEach(share => {
        if (share.owner_id === user.id) {
          contactIds.add(share.viewer_id);
        } else {
          contactIds.add(share.owner_id);
        }
      });

      console.log('Contact IDs extracted:', Array.from(contactIds));

      // If no shares exist, return empty contacts list
      if (contactIds.size === 0) {
        console.log('No shares found');
        setContacts([]);
        return;
      }

      // Get contact profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', Array.from(contactIds));

      console.log('Contact IDs:', Array.from(contactIds)); // Debug log
      console.log('Profiles data:', profiles); // Debug log
      console.log('Profiles error:', profilesError); // Debug log

      if (profilesError) throw profilesError;

      // Get last messages
      let lastMessages = {};
      try {
        const { data: messageData, error: messageError } = await supabase
          .from('messages')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (!messageError && messageData) {
          profiles.forEach(profile => {
            const lastMessage = messageData.find(msg => 
              (msg.sender_id === profile.user_id && msg.receiver_id === user.id) ||
              (msg.sender_id === user.id && msg.receiver_id === profile.user_id)
            );
            lastMessages[profile.user_id] = lastMessage;
          });
        }
      } catch (error) {
        console.log('Error getting messages:', error);
      }

              // Process contacts
        const contactsWithMessages = profiles.map(profile => {
          // Get last message for this contact
          const lastMessage = lastMessages[profile.user_id];

          // Simplified status flags
          const isBlocked = false; // TODO: Implement user blocking
          const isOnline = false; // TODO: Implement real-time presence
          const lastSeen = new Date().toISOString(); // TODO: Implement last seen tracking

          return {
            id: profile.user_id,
            name: profile.name,
            email: profile.email,
            avatar_url: profile.avatar_url,
            bio: profile.bio,
            country: profile.country,
            timezone: profile.timezone,
            last_message: lastMessage || undefined,
            unread_count: 0, // Always set to 0 since we removed unread count logic
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
            console.log('New message received:', payload);
            // Refresh contacts to show new messages
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
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('receiver_id', user.id)
        .eq('sender_id', contactId)
        .is('is_read', false) as { error: any };
          
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
