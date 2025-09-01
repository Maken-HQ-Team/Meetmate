import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Notification {
  id: string;
  user_id: string;
  type: 'share_received' | 'share_accepted' | 'share_rejected' | 'message' | 'availability_updated';
  title: string;
  message: string;
  from_user_id?: string;
  metadata?: any;
  read_at?: string;
  created_at: string;
  from_profile?: {
    name: string;
    avatar_url?: string;
    country?: string;
  };
}

export const useNotifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const notificationsData = data || [];
      
      // Get unique from_user_ids to fetch profiles
      const fromUserIds = [...new Set(notificationsData
        .map(n => n.from_user_id)
        .filter(Boolean))] as string[];
      
      let profilesData: any[] = [];
      if (fromUserIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, name, avatar_url, country')
          .in('user_id', fromUserIds);
        
        if (!profilesError) {
          profilesData = profiles || [];
        }
      }
      
      // Create profiles map
      const profilesMap = profilesData.reduce((acc, profile) => {
        acc[profile.user_id] = profile;
        return acc;
      }, {} as Record<string, any>);
      
      // Merge notifications with profile data
      const enrichedNotifications = notificationsData.map(notification => ({
        ...notification,
        from_profile: notification.from_user_id ? profilesMap[notification.from_user_id] : null
      }));
      
      console.log('Processed notifications:', enrichedNotifications);
      setNotifications(enrichedNotifications);
      setUnreadCount(enrichedNotifications.filter(n => !n.read_at).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId)
        .eq('user_id', user?.id);

      if (error) throw error;

      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, read_at: new Date().toISOString() }
            : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications' as any)
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('read_at', null);

      if (error) throw error;

      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user?.id);

      if (error) throw error;

      // Update local state
      const notification = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      if (notification && !notification.read_at) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const acceptShare = async (notification: Notification) => {
    if (!user || !notification.from_user_id) return;

    try {
      // Get current user's profile for name
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('user_id', user.id)
        .single();

      const userName = profile?.name || user.user_metadata?.name || user.email || 'Someone';

      // Activate the share (set is_active = true)
      const { error: shareError } = await supabase
        .from('shares')
        .update({ is_active: true })
        .eq('owner_id', notification.from_user_id)
        .eq('viewer_id', user.id);

      if (shareError) throw shareError;

      // Mark notification as read
      await markAsRead(notification.id);

      // Create acceptance notification for the sender
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: notification.from_user_id,
          type: 'share_accepted',
          title: 'Share request accepted! ✅',
          message: `${userName} has accepted your availability share.`,
          from_user_id: user.id,
          metadata: { accepted: true }
        });

      if (notificationError) throw notificationError;

      toast({
        title: "Share accepted!",
        description: "You can now see their availability in the Shared tab.",
      });

    } catch (error) {
      console.error('Error accepting share:', error);
      toast({
        title: "Error",
        description: "Failed to accept share. Please try again.",
        variant: "destructive",
      });
    }
  };

  const rejectShare = async (notification: Notification) => {
    if (!user || !notification.from_user_id) return;

    try {
      // Get current user's profile for name
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('user_id', user.id)
        .single();

      const userName = profile?.name || user.user_metadata?.name || user.email || 'Someone';

      // Delete the pending share (reject it)
      const { error: shareError } = await supabase
        .from('shares')
        .delete()
        .eq('owner_id', notification.from_user_id)
        .eq('viewer_id', user.id)
        .eq('is_active', false);

      if (shareError) throw shareError;

      // Mark notification as read
      await markAsRead(notification.id);

      // Create rejection notification for the sender
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: notification.from_user_id,
          type: 'share_rejected',
          title: 'Share request declined ❌',
          message: `${userName} has declined your availability share.`,
          from_user_id: user.id,
          metadata: { rejected: true }
        });

      if (notificationError) throw notificationError;

      toast({
        title: "Share declined",
        description: "You have declined the availability share.",
      });

    } catch (error) {
      console.error('Error rejecting share:', error);
      toast({
        title: "Error",
        description: "Failed to decline share. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Set up real-time subscription
  useEffect(() => {
    if (!user) return;

    fetchNotifications();

    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    notifications,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    acceptShare,
    rejectShare,
    refetch: fetchNotifications,
  };
};