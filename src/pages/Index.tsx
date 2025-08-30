import { Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
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

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const { availabilitySlots, loading, createSlot, updateSlot, deleteSlot } = useAvailability();
  const { sharedSlots, profilesData, loading: sharedLoading } = useSharedAvailability();
  const { loading: notesLoading } = useUserNotes(); // Initialize user notes
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const userTimezone = user?.user_metadata?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Removed unread count logic

  // Show loading spinner while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect to auth if not logged in
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

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
              onClick={async () => {
                // Navigate to conversations
                window.location.href = '/conversations';
              }} 
              className="relative"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Conversations
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
