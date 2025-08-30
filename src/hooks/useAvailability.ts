import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { AvailabilitySlot } from '@/types/availability';

// Transform database row to TypeScript interface
const transformDbToSlot = (dbRow: any): AvailabilitySlot => ({
  id: dbRow.id,
  userId: dbRow.user_id,
  dayOfWeek: dbRow.day_of_week,
  startTime: dbRow.start_time,
  endTime: dbRow.end_time,
  status: dbRow.status,
  timezone: dbRow.timezone,
  createdAt: dbRow.created_at,
  updatedAt: dbRow.updated_at,
});

export const useAvailability = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Fetch availability slots
  const fetchAvailability = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('availability')
        .select('*')
        .eq('user_id', user.id)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;

      setAvailabilitySlots(data ? data.map(transformDbToSlot) : []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load availability. Please try again.",
        variant: "destructive",
      });
      console.error('Error fetching availability:', error);
    } finally {
      setLoading(false);
    }
  };

  // Create new availability slot
  const createSlot = async (slot: Omit<AvailabilitySlot, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!user) return;

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('availability')
        .insert({
          user_id: user.id,
          day_of_week: slot.dayOfWeek,
          start_time: slot.startTime,
          end_time: slot.endTime,
          status: slot.status,
          timezone: slot.timezone,
        })
        .select()
        .single();

      if (error) throw error;

      setAvailabilitySlots(prev => [...prev, transformDbToSlot(data)]);
      
      toast({
        title: "Success",
        description: "Availability slot created successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to create availability slot. Please try again.",
        variant: "destructive",
      });
      console.error('Error creating availability slot:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Update availability slot
  const updateSlot = async (id: string, updates: Partial<AvailabilitySlot>) => {
    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('availability')
        .update({
          day_of_week: updates.dayOfWeek,
          start_time: updates.startTime,
          end_time: updates.endTime,
          status: updates.status,
          timezone: updates.timezone,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setAvailabilitySlots(prev => 
        prev.map(slot => slot.id === id ? transformDbToSlot(data) : slot)
      );
      
      toast({
        title: "Success",
        description: "Availability slot updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update availability slot. Please try again.",
        variant: "destructive",
      });
      console.error('Error updating availability slot:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete availability slot
  const deleteSlot = async (id: string) => {
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('availability')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setAvailabilitySlots(prev => prev.filter(slot => slot.id !== id));
      
      toast({
        title: "Success",
        description: "Availability slot deleted successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete availability slot. Please try again.",
        variant: "destructive",
      });
      console.error('Error deleting availability slot:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Set up real-time subscription
  useEffect(() => {
    if (!user) return;

    fetchAvailability();

    const channel = supabase
      .channel('availability-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'availability',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Availability change:', payload);
          // Refetch data on changes from other sessions
          fetchAvailability();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    availabilitySlots,
    loading,
    submitting,
    createSlot,
    updateSlot,
    deleteSlot,
    refetch: fetchAvailability,
  };
};