import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  Plus
} from 'lucide-react';
import { useContacts } from '@/hooks/useContacts';
import { ContactList } from '@/components/chat/ContactList';
import { ConversationArea } from '@/components/chat/ConversationArea';
import { NewChatModal } from './../components/chat/NewChatModal';

interface SelectedContact {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
}

const Conversations = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedContact, setSelectedContact] = useState<SelectedContact | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newChatOpen, setNewChatOpen] = useState(false);

  const {
    contacts,
    loading: contactsLoading,
    refreshContacts,
    markContactAsRead
  } = useContacts();
  
  // Always refresh contacts when the component mounts
  useEffect(() => {
    if (user) {
      console.log('Conversations page loaded, refreshing contacts');
      refreshContacts();
      
      // Listen for force-refresh-contacts event from ChatInterface
      const handleForceRefresh = () => {
        console.log('Force refresh contacts event received');
        refreshContacts();
      };
      
      // Add event listener
      window.addEventListener('force-refresh-contacts', handleForceRefresh);
      
      // Cleanup
      return () => {
        window.removeEventListener('force-refresh-contacts', handleForceRefresh);
      };
    }
  }, [user, refreshContacts]);

  // Filter contacts based on search
  const filteredContacts = (contacts || []).filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleContactClick = async (contact: any) => {
    setSelectedContact({
      id: contact.id,
      name: contact.name,
      email: contact.email,
      avatar_url: contact.avatar_url
    });
    
    // Immediately remove unread label when contact is clicked and update database
    await markContactAsRead(contact.id);
  };

  const handleInviteSent = () => {
    refreshContacts();
    setNewChatOpen(false);
  };

  if (!user) {
    return <div>Please log in to access conversations.</div>;
  }

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="h-8 w-8"
            title="Back to Dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">Chat</h1>
            <p className="text-sm text-muted-foreground">Your conversations</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => refreshContacts()}
            className="mr-2"
          >
            Refresh
          </Button>
          <Button
            onClick={() => setNewChatOpen(true)}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        </div>
      </div>

      {/* Main Layout - Fixed Height */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Side - Contact List Component */}
        <ContactList
          contacts={contacts || []}
          loading={contactsLoading}
          searchQuery={searchQuery}
          selectedContactId={selectedContact?.id}
          onSearchChange={setSearchQuery}
          onContactSelect={handleContactClick}
        />

        {/* Right Side - Conversation Area Component */}
        <ConversationArea
          selectedContact={selectedContact}
          onBack={() => setSelectedContact(null)}
        />
      </div>

      {/* New Chat Modal */}
      <NewChatModal
        isOpen={newChatOpen}
        onClose={() => setNewChatOpen(false)}
        onInviteSent={handleInviteSent}
      />
    </div>
  );
};

export default Conversations;
