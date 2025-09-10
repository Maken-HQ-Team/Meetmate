import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAvailability } from '@/hooks/useAvailability';
import { useSharedAvailability } from '@/hooks/useSharedAvailability';
import { useUserNotes } from '@/hooks/useUserNotes';
import { useContacts } from '@/hooks/useContacts';
import AppLayout from '@/components/layout/AppLayout';
import HorizontalCalendar from '@/components/availability/HorizontalCalendar';
import ShareModal from '@/components/sharing/ShareModal';
import ShareManager from '@/components/sharing/ShareManager';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Share2, Calendar, Loader2, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { availabilitySlots, loading, createSlot, updateSlot, deleteSlot } = useAvailability();
  const { sharedSlots, profilesData, loading: sharedLoading } = useSharedAvailability();
  const { loading: notesLoading } = useUserNotes(); // Initialize user notes
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [hasRealtimeNew, setHasRealtimeNew] = useState(false);

  const userTimezone = user?.user_metadata?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { contacts, refreshContacts } = useContacts();

  // Ensure unread badge is accurate when returning to dashboard or after read updates
  useEffect(() => {
    // Initial refresh
    console.log('[Index] Initial refreshContacts');
    refreshContacts();

    const handleForceRefresh = () => {
      console.log('[Index] force-refresh-contacts event received');
      refreshContacts();
    };
    const handleFocus = () => {
      console.log('[Index] window focus, refreshing contacts');
      refreshContacts();
    };

    window.addEventListener('force-refresh-contacts', handleForceRefresh);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('force-refresh-contacts', handleForceRefresh);
      window.removeEventListener('focus', handleFocus);
    };
  }, [refreshContacts]);

  // Realtime: show dot on dashboard when a new inbound message arrives
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('index-messages-realtime')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id.eq.${user.id}` },
        (payload) => {
          console.log('[Index] realtime INSERT for receiver', payload.new?.id);
          // Only show dot when not on conversations page
          if (window.location.pathname !== '/conversations') {
            setHasRealtimeNew(true);
          }
          // Also refresh contacts to keep counts consistent
          refreshContacts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refreshContacts]);
  const totalUnread = (contacts || []).reduce((sum, c) => sum + (c.unread_count || 0), 0);

  // Debug whenever inputs to the badge change
  useEffect(() => {
    const suppressed = !!sessionStorage.getItem('suppressConvoDot');
    console.log('[Index] badge eval:', {
      totalUnread,
      path: window.location.pathname,
      suppressed
    });
  }, [totalUnread, contacts]);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              MeetMate
            </h1>
            <p className="text-muted-foreground">
              Manage your schedule and share with others
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button 
              variant="outline" 
              onClick={() => { 
                console.log('[Index] Conversations clicked: setting suppressConvoDot and navigating');
                sessionStorage.setItem('suppressConvoDot', '1'); 
                setHasRealtimeNew(false);
                navigate('/conversations'); 
              }} 
              className="relative"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Conversations
              {/* Only show red dot when not on Conversations route and not suppressed */}
              {(totalUnread > 0 || hasRealtimeNew) && window.location.pathname !== '/conversations' && !sessionStorage.getItem('suppressConvoDot') && (
                <span className="absolute -top-1 -right-1 inline-flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              )}
            </Button>
            <Button onClick={() => setShareModalOpen(true)}>
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="calendar" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="calendar" className="flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>Calendar</span>
            </TabsTrigger>
            <TabsTrigger value="shared" className="flex items-center space-x-2">
              <Share2 className="h-4 w-4" />
              <span>Shared</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar">
            <HorizontalCalendar
              availabilitySlots={availabilitySlots}
              onCreateSlot={createSlot}
              onUpdateSlot={updateSlot}
              onDeleteSlot={deleteSlot}
              loading={loading}
              userTimezone={userTimezone}
            />
          </TabsContent>

          <TabsContent value="shared">
            <div className="space-y-6">
              <HorizontalCalendar
                availabilitySlots={[]}
                onCreateSlot={() => {}}
                onUpdateSlot={() => {}}
                onDeleteSlot={() => {}}
                loading={sharedLoading}
                sharedSlots={sharedSlots}
                userTimezone={userTimezone}
                showTimezoneToggle={true}
                profilesData={profilesData}
              />
              <ShareManager />
            </div>
          </TabsContent>
        </Tabs>

        {/* Share Modal */}
        <ShareModal 
          isOpen={shareModalOpen} 
          onClose={() => setShareModalOpen(false)} 
        />
      </div>
    </AppLayout>
  );
};

export default Index;
