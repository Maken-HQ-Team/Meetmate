import React from 'react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Users } from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  last_message?: {
    content: string;
    created_at: string;
  };
  unread_count?: number;
}

interface ContactListProps {
  contacts: Contact[];
  loading: boolean;
  searchQuery: string;
  selectedContactId?: string;
  onSearchChange: (query: string) => void;
  onContactSelect: (contact: Contact) => void;
}

export const ContactList: React.FC<ContactListProps> = ({
  contacts,
  loading,
  searchQuery,
  selectedContactId,
  onSearchChange,
  onContactSelect
}) => {
  // Filter contacts based on search
  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className="w-1/3 border-r bg-card flex flex-col">
      {/* Search Header - Fixed */}
      <div className="p-3 border-b flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>
      
      {/* Contacts List - Scrollable */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {loading ? (
          <div className="p-4 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground mt-2">Loading contacts...</p>
          </div>
        ) : contacts.length === 0 ? (
          <div className="p-4 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No contacts available</p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredContacts.map((contact) => (
              <div
                key={contact.id}
                className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                  selectedContactId === contact.id ? 'bg-muted' : ''
                }`}
                onClick={() => onContactSelect(contact)}
              >
                <div className="flex items-center space-x-3">
                  <div className="relative">
                  <Avatar className="h-10 w-10">
                    {contact.avatar_url ? (
                      <AvatarImage src={contact.avatar_url} alt={contact.name} />
                    ) : (
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getInitials(contact.name)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  {contact.unread_count && contact.unread_count > 0 && (
                    <span className="absolute -top-1 -right-1 inline-flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                  )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{contact.name}</h4>
                    <p className="text-sm text-muted-foreground truncate">
                      {contact.last_message?.content || 'No messages yet'}
                    </p>
                  </div>
                  {/* Removed numeric unread badge per request */}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
