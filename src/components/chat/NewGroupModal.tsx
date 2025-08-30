import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Users, 
  UserPlus, 
  X,
  Check,
  Crown
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface NewGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated: () => void;
  contacts: any[];
}

interface GroupData {
  name: string;
  description: string;
  avatar_url?: string;
}

export const NewGroupModal: React.FC<NewGroupModalProps> = ({
  isOpen,
  onClose,
  onGroupCreated,
  contacts
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [groupData, setGroupData] = useState<GroupData>({
    name: '',
    description: ''
  });
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

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

  const handleContactSelect = (contactId: string) => {
    setSelectedContacts(prev => 
      prev.includes(contactId) 
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleCreateGroup = async () => {
    if (!groupData.name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a group name.",
        variant: "destructive",
      });
      return;
    }

    if (selectedContacts.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one contact.",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      // TODO: Implement group creation when database tables are created
      console.log('Group creation not yet implemented - waiting for database tables');
      
      toast({
        title: "Coming Soon!",
        description: "Group creation will be available once the database is fully set up.",
      });
      
      // Reset form and close modal
      setGroupData({ name: '', description: '' });
      setSelectedContacts([]);
      onGroupCreated();
      onClose();
    } catch (error: any) {
      console.error('Error creating group:', error);
      toast({
        title: "Error",
        description: "Failed to create group. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    setGroupData({ name: '', description: '' });
    setSelectedContacts([]);
    onClose();
  };

  const selectedContactObjects = contacts.filter(contact => 
    selectedContacts.includes(contact.id)
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Create New Group</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Group Details */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="group-name">Group Name *</Label>
              <Input
                id="group-name"
                placeholder="Enter group name"
                value={groupData.name}
                onChange={(e) => setGroupData(prev => ({ ...prev, name: e.target.value }))}
                maxLength={50}
              />
            </div>
            
            <div>
              <Label htmlFor="group-description">Description (Optional)</Label>
              <Textarea
                id="group-description"
                placeholder="Describe what this group is about..."
                value={groupData.description}
                onChange={(e) => setGroupData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                maxLength={200}
              />
            </div>
          </div>

          {/* Contact Selection */}
          <div>
            <Label>Select Contacts ({selectedContacts.length} selected)</Label>
            <p className="text-sm text-muted-foreground mb-3">
              Choose contacts to add to your group. You can add more later.
            </p>
            
            <ScrollArea className="h-48 border rounded-lg p-2">
              {contacts.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No contacts available</p>
                  <p className="text-xs text-muted-foreground">
                    Add contacts first to create a group
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {contacts.map((contact) => (
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
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Selected Contacts Preview */}
          {selectedContacts.length > 0 && (
            <div>
              <Label>Group Members ({selectedContacts.length + 1})</Label>
              <div className="mt-2 p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {getInitials(user?.user_metadata?.name || 'You')}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{user?.user_metadata?.name || 'You'}</span>
                  <Badge variant="secondary" className="text-xs">
                    <Crown className="h-3 w-3 mr-1" />
                    Admin
                  </Badge>
                </div>
                
                <div className="space-y-1">
                  {selectedContactObjects.map((contact) => (
                    <div key={contact.id} className="flex items-center space-x-2">
                      <Avatar className="h-5 w-5">
                        {contact.avatar_url ? (
                          <AvatarImage src={contact.avatar_url} alt={contact.name} />
                        ) : (
                          <AvatarFallback className={`${getAvatarColor(contact.name)} text-white text-xs`}>
                            {getInitials(contact.name)}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <span className="text-sm">{contact.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateGroup}
              disabled={!groupData.name.trim() || selectedContacts.length === 0 || creating}
            >
              {creating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Users className="h-4 w-4 mr-2" />
                  Create Group
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
