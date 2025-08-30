import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface GroupMember {
  id: string;
  name: string;
  avatar_url?: string;
  role: 'admin' | 'member';
  joined_at: string;
  is_online?: boolean;
}

interface Group {
  id: string;
  name: string;
  description?: string;
  avatar_url?: string;
  member_count: number;
  members: GroupMember[];
  is_admin: boolean;
  created_at: string;
  created_by: string;
  last_message?: {
    content: string;
    created_at: string;
    sender_name: string;
  };
  unread_count: number;
}

export const useGroups = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGroups = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      // TODO: Implement groups when group_members and group_messages tables are created
      console.log('Groups not yet implemented - waiting for database tables');
      setGroups([]);
    } catch (error: any) {
      console.error('Error fetching groups:', error);
      toast({
        title: "Error",
        description: "Failed to load groups. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  // Set up real-time subscription for group updates
  useEffect(() => {
    if (!user) return;

    fetchGroups();

    // TODO: Enable real-time subscriptions when group tables are created
    console.log('Group real-time subscriptions not yet implemented');
  }, [user, fetchGroups]);

  const refreshGroups = useCallback(() => {
    fetchGroups();
  }, [fetchGroups]);

  return {
    groups,
    loading,
    refreshGroups
  };
};
