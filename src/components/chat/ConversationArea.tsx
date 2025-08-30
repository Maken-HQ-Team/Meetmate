import React from 'react';
import { MessageSquare } from 'lucide-react';
import { ChatInterface } from './ChatInterface';

interface Contact {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
}

interface ConversationAreaProps {
  selectedContact: Contact | null;
  onBack: () => void;
}

export const ConversationArea: React.FC<ConversationAreaProps> = ({
  selectedContact,
  onBack
}) => {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      {selectedContact ? (
        <ChatInterface
          contactId={selectedContact.id}
          contactName={selectedContact.name}
          contactAvatar={selectedContact.avatar_url}
          onBack={onBack}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center bg-muted/20">
          <div className="text-center">
            <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              Select a contact to start chatting
            </h3>
            <p className="text-sm text-muted-foreground">
              Choose a contact from the list to begin your conversation
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
