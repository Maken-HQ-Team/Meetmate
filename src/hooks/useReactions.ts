import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Reaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export const useReactions = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const addReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!user) return false;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('message_reactions')
        .insert({
          message_id: messageId,
          user_id: user.id,
          emoji: emoji
        });

      if (error) {
        console.error('Error adding reaction:', error);
        toast({
          title: "Error",
          description: "Failed to add reaction. Please try again.",
          variant: "destructive",
        });
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error adding reaction:', error);
      toast({
        title: "Error",
        description: "Failed to add reaction. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  const removeReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!user) return false;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .eq('emoji', emoji);

      if (error) {
        console.error('Error removing reaction:', error);
        toast({
          title: "Error",
          description: "Failed to remove reaction. Please try again.",
          variant: "destructive",
        });
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error removing reaction:', error);
      toast({
        title: "Error",
        description: "Failed to remove reaction. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  const toggleReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!user) return false;
    
    setLoading(true);
    try {
      // Check if reaction already exists
      const { data: existingReaction } = await supabase
        .from('message_reactions')
        .select('id')
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .eq('emoji', emoji)
        .single();

      if (existingReaction) {
        // Remove existing reaction
        return await removeReaction(messageId, emoji);
      } else {
        // Add new reaction
        return await addReaction(messageId, emoji);
      }
    } catch (error) {
      console.error('Error toggling reaction:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, addReaction, removeReaction]);

  const getReactionsForMessage = useCallback(async (messageId: string) => {
    try {
      const { data, error } = await supabase
        .from('message_reactions')
        .select('*')
        .eq('message_id', messageId);

      if (error) {
        console.error('Error fetching reactions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching reactions:', error);
      return [];
    }
  }, []);

  return {
    addReaction,
    removeReaction,
    toggleReaction,
    getReactionsForMessage,
    loading
  };
};
