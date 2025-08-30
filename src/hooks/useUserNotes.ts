import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface UserNote {
  id: string;
  user_id: string;
  about_user_id: string;
  nickname?: string;
  note?: string;
  created_at: string;
  updated_at: string;
}

export const useUserNotes = () => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Record<string, UserNote>>({});
  const [loading, setLoading] = useState(true);

  const fetchNotes = async () => {
    if (!user) {
      setNotes({});
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_notes')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      // Convert to map for easy lookup
      const notesMap = (data || []).reduce((acc, note) => {
        acc[note.about_user_id] = note;
        return acc;
      }, {} as Record<string, UserNote>);

      setNotes(notesMap);
    } catch (error) {
      console.error('Error fetching user notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveNote = async (aboutUserId: string, nickname?: string, note?: string) => {
    if (!user) return false;

    try {
      const { data, error } = await supabase
        .from('user_notes')
        .upsert({
          user_id: user.id,
          about_user_id: aboutUserId,
          nickname: nickname || null,
          note: note || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setNotes(prev => ({
        ...prev,
        [aboutUserId]: data
      }));

      return true;
    } catch (error) {
      console.error('Error saving user note:', error);
      return false;
    }
  };

  const deleteNote = async (aboutUserId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('user_notes')
        .delete()
        .eq('user_id', user.id)
        .eq('about_user_id', aboutUserId);

      if (error) throw error;

      // Update local state
      setNotes(prev => {
        const newNotes = { ...prev };
        delete newNotes[aboutUserId];
        return newNotes;
      });

      return true;
    } catch (error) {
      console.error('Error deleting user note:', error);
      return false;
    }
  };

  const getNoteForUser = (aboutUserId: string): UserNote | null => {
    return notes[aboutUserId] || null;
  };

  // Set up real-time subscription
  useEffect(() => {
    if (!user) return;

    fetchNotes();

    const channel = supabase
      .channel('user-notes-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_notes',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchNotes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    notes,
    loading,
    saveNote,
    deleteNote,
    getNoteForUser,
    refetch: fetchNotes,
  };
};