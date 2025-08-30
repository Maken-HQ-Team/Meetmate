import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { 
  Search, 
  UserPlus, 
  Mail, 
  Users, 
  Check,
  MessageCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useContacts } from '@/hooks/useContacts';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInviteSent: () => void;
}

interface Contact {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  last_message?: {
    content: string;
    created_at: string;
  };
}

interface InviteData {
  email: string;
  message: string;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({
  isOpen,
  onClose,
  onInviteSent
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { contacts, refreshContacts } = useContacts();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [inviteData, setInviteData] = useState<InviteData>({
    email: '',
    message: ''
  });
  const [sendingInvite, setSendingInvite] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [emailStatus, setEmailStatus] = useState<{
    exists: boolean;
    user: any;
    loading: boolean;
  }>({
    exists: false,
    user: null,
    loading: false
  });

  // Filter contacts based on search
  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-red-500',
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-teal-500'
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const handleEmailCheck = async (email: string) => {
    if (!email.trim()) {
      setEmailStatus({ exists: false, user: null, loading: false });
      return;
    }
    
    setEmailStatus(prev => ({ ...prev, loading: true }));
    
    try {
      // Check if user already exists
      const { data: existingUsers, error: userError } = await supabase
        .from('profiles')
        .select('id, name, email')
        .eq('email', email.trim().toLowerCase());

      if (userError) {
        console.error('Supabase error:', userError);
        throw userError;
      }

      if (existingUsers && existingUsers.length > 0) {
        // User exists
        const existingUser = existingUsers[0];
        setEmailStatus({
          exists: true,
          user: existingUser,
          loading: false
        });
      } else {
        // User doesn't exist
        setEmailStatus({
          exists: false,
          user: null,
          loading: false
        });
      }
    } catch (error: any) {
      console.error('Error checking user:', error);
      setEmailStatus({
        exists: false,
        user: null,
        loading: false
      });
    }
  };

  const handleSendInvite = async (email: string) => {
    if (!email.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    setSendingInvite(true);
    try {
        // User doesn't exist, open Gmail with pre-filled email
        const subject = encodeURIComponent("You've been invited to chat!");
        const body = encodeURIComponent(`Hi there!

I'd like to invite you to chat and sync our availability schedules. 

Click the link below to create an account and start chatting:
[Your app registration link here]

Best regards,
${user?.user_metadata?.name || 'A friend'}`);

        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${email}&su=${subject}&body=${body}`;
        window.open(gmailUrl, '_blank');

        toast({
          title: "Gmail opened!",
          description: "Please send the invitation email manually.",
        });
    } catch (error: any) {
      console.error('Error sending invite:', error);
      toast({
        title: "Error",
        description: "Failed to send invite. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSendingInvite(false);
    }
  };

  const handleContactSelect = (contactId: string) => {
    setSelectedContacts(prev => 
      prev.includes(contactId) 
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleStartGroupChat = () => {
    if (selectedContacts.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one contact.",
        variant: "destructive",
      });
      return;
    }

    // TODO: Implement group chat creation
    toast({
      title: "Group chat created!",
      description: `Started group chat with ${selectedContacts.length} contacts`,
    });
    
    setSelectedContacts([]);
    onClose();
  };

  const handleStartChat = async (userId: string, userName: string) => {
    // Prevent users from messaging themselves
    if (userId === user?.id) {
      toast({
        title: "Cannot message yourself",
        description: "You cannot start a chat with your own email address.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Check if contact already exists
      const { data: existingContact, error: contactError } = await supabase
        .from('contacts')
        .select('id')
        .eq('user_id', user?.id)
        .eq('contact_id', userId)
        .single();

      if (contactError && contactError.code !== 'PGRST116') {
        throw contactError;
      }

      if (!existingContact) {
        // Create new contact
        const { error: insertError } = await supabase
          .from('contacts')
          .insert([
            {
              user_id: user?.id,
              contact_id: userId,
              name: userName,
              email: emailStatus.user.email
            }
          ]);

        if (insertError) {
          throw insertError;
        }
      }

      // Close modal and trigger contact refresh
      onClose();
      onInviteSent(); // This will refresh contacts
      
      toast({
        title: "Chat started!",
        description: `You can now chat with ${userName}`,
      });
    } catch (error: any) {
      console.error('Error starting chat:', error);
      toast({
        title: "Error",
        description: "Failed to start chat. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    setInviteData({ email: '', message: '' });
    setSelectedContacts([]);
    setSearchQuery('');
    setEmailStatus({ exists: false, user: null, loading: false });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <UserPlus className="h-5 w-5" />
            <span>New Chat</span>
          </DialogTitle>
          <DialogDescription>
            Start a new conversation by inviting someone via email or creating a group chat with existing contacts.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Email Invitation Section */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="email-input">Invite by Email</Label>
              <div className="flex space-x-2">
                <Input
                  id="email-input"
                  type="email"
                  placeholder="Enter email address"
                  value={inviteData.email}
                  onChange={(e) => {
                    setInviteData(prev => ({ ...prev, email: e.target.value }));
                    if (e.target.value.trim()) {
                      handleEmailCheck(e.target.value);
                    } else {
                      setEmailStatus({ exists: false, user: null, loading: false });
                    }
                  }}
                  className="flex-1"
                />
                {emailStatus.loading ? (
                  <Button disabled className="bg-muted text-muted-foreground">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  </Button>
                                 ) : emailStatus.exists && emailStatus.user ? (
                   <Button
                     onClick={() => handleStartChat(emailStatus.user.id, emailStatus.user.name)}
                     disabled={emailStatus.user.id === user?.id}
                     className={`${
                       emailStatus.user.id === user?.id 
                         ? 'bg-gray-400 cursor-not-allowed' 
                         : 'bg-green-600 hover:bg-green-700'
                     } text-white`}
                   >
                     <MessageCircle className="h-4 w-4 mr-2" />
                     {emailStatus.user.id === user?.id ? 'Your Email' : 'Message'}
                   </Button>
                ) : (
                <Button
                  onClick={() => handleSendInvite(inviteData.email)}
                  disabled={sendingInvite || !inviteData.email.trim()}
                  className="bg-primary hover:bg-primary/90"
                >
                  {sendingInvite ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Invite
                    </>
                  )}
                </Button>
                )}
              </div>
              
              {/* Email Status Messages */}
              {inviteData.email && (
                <div className="space-y-2">
                                     {emailStatus.loading && (
                     <div className="text-sm text-muted-foreground flex items-center">
                       <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary mr-2"></div>
                       Checking if user exists...
                     </div>
                   )}
                  {!emailStatus.loading && emailStatus.exists && emailStatus.user && (
                    <div className={`p-3 border rounded-lg ${
                      emailStatus.user.id === user?.id 
                        ? 'bg-yellow-50 border-yellow-200' 
                        : 'bg-green-50 border-green-200'
                    }`}>
                      {emailStatus.user.id === user?.id ? (
                        <>
                          <p className="text-sm text-yellow-800 font-medium">
                            ⚠️ This is your own email address
                          </p>
                          <p className="text-xs text-yellow-600 mt-1">
                            You cannot message yourself. Try entering a different email address.
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm text-green-800 font-medium">
                            ✅ {emailStatus.user.name} is already on MeetMate!
                          </p>
                          <p className="text-xs text-green-600 mt-1">
                            Click "Message" to start chatting with them.
                          </p>
                        </>
                      )}
                    </div>
                  )}
                  {!emailStatus.loading && !emailStatus.exists && inviteData.email.trim() && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800 font-medium">
                        📧 User not found
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        Click "Invite" to send them an invitation to join MeetMate.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or start a group chat with existing contacts
              </span>
            </div>
          </div>

          {/* Contact Selection */}
          <div>
            <Label>Select Contacts ({selectedContacts.length} selected)</Label>
            <p className="text-sm text-muted-foreground mb-3">
              Choose contacts to add to your group chat.
            </p>
            
            <div className="mb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search contacts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <ScrollArea className="h-48 border rounded-lg p-2">
              {contacts.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No contacts available</p>
                  <p className="text-xs text-muted-foreground">
                    Add contacts first to create a group chat
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredContacts.map((contact) => (
                    <div
                      key={contact.id}
                      className={`flex items-center space-x-3 p-2 rounded-lg border cursor-pointer transition-colors ${
                        selectedContacts.includes(contact.id)
                          ? 'bg-primary/10 border-primary'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => handleContactSelect(contact.id)}
                    >
                      <div className="relative">
                        <Avatar className="h-8 w-8">
                          {contact.avatar_url ? (
                            <AvatarImage src={contact.avatar_url} alt={contact.name} />
                          ) : (
                            <AvatarFallback className={`${getAvatarColor(contact.name)} text-white text-xs`}>
                              {getInitials(contact.name)}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        {selectedContacts.includes(contact.id) && (
                          <div className="absolute -top-1 -right-1 h-4 w-4 bg-primary rounded-full flex items-center justify-center">
                            <Check className="h-2 w-2 text-white" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium truncate">{contact.name}</h4>
                        <p className="text-xs text-muted-foreground truncate">{contact.email}</p>
                        {contact.last_message && (
                          <span className="text-xs text-muted-foreground">
                            Last message: {contact.last_message.content.substring(0, 30)}...
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {selectedContacts.length} contact{selectedContacts.length !== 1 ? 's' : ''} selected
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleStartGroupChat}
                disabled={selectedContacts.length === 0}
              >
                Start Group Chat
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
