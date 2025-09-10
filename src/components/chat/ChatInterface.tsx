import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Paperclip, 
  Reply, 
  Smile, 
  X,
  ArrowLeft
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useMessages } from '@/hooks/useMessages';
import { useReactions } from '@/hooks/useReactions';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  receiver_id?: string;
  created_at: string;
  reply_to?: {
    id: string;
    content: string;
    sender_name: string;
  };
  reactions: {
    [key: string]: string[];
  };
  read_at?: string;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  delivered_at?: string;
}

interface ChatInterfaceProps {
  contactId: string;
  contactName: string;
  contactAvatar?: string;
  onBack: () => void;
}

const REACTIONS = [
  { emoji: '👍', label: 'Like' },
  { emoji: '❤️', label: 'Love' },
  { emoji: '😂', label: 'Laugh' },
  { emoji: '😮', label: 'Wow' },
  { emoji: '😢', label: 'Sad' },
  { emoji: '😠', label: 'Angry' },
];

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  contactId,
  contactName,
  contactAvatar,
  onBack
}) => {
  const { user } = useAuth();
  const { messages, sendMessage, loading, markInboundAsRead } = useMessages(contactId, 'contact');
  const { toggleReaction, loading: reactionLoading } = useReactions();
  const [message, setMessage] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [showReactions, setShowReactions] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const isOwnMessage = (msg: Message) => msg.sender_id !== contactId;

  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };
  // Removed unread divider logic

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    
    const success = await sendMessage(message, replyTo?.id);
    if (success) {
      setMessage('');
      setReplyTo(null);
      inputRef.current?.focus();
      // Auto-scroll to bottom after sending message
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleReaction = async (messageId: string, reactionType: string) => {
    const success = await toggleReaction(messageId, reactionType);
    if (success) {
      setShowReactions(null);
    }
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-scroll to bottom when contact changes
  useEffect(() => {
    scrollToBottom();
  }, [contactId]);

  // Auto-scroll to bottom on initial load
  useEffect(() => {
    scrollToBottom();
  }, []);

  // Mark inbound messages as read when viewing this chat
  useEffect(() => {
    console.log('[ChatInterface] markInboundAsRead on messages/contact change', { contactId, messagesCount: messages.length });
    markInboundAsRead();
    window.dispatchEvent(new Event('force-refresh-contacts'));
  }, [messages, contactId]);

  // Record last seen time for this contact (client-side override for unread calc)
  useEffect(() => {
    if (!contactId) return;
    const now = new Date().toISOString();
    sessionStorage.setItem(`lastSeen_${contactId}`, now);
    console.log('[ChatInterface] set lastSeen for contact', { contactId, now });
    window.dispatchEvent(new Event('force-refresh-contacts'));
  }, [contactId]);

  // Also refresh contacts when navigating away from this page
  useEffect(() => {
    console.log('[ChatInterface] cleanup: dispatch force-refresh-contacts on unmount');
    return () => {
      window.dispatchEvent(new Event('force-refresh-contacts'));
    };
  }, []);

  

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center p-4 border-b bg-card">
        <Button
          variant="ghost"
          size="icon"
              onClick={onBack}
          className="h-8 w-8 mr-3 md:hidden"
          title="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Avatar className="h-10 w-10 mr-3">
          {contactAvatar ? (
            <AvatarImage src={contactAvatar} alt={contactName} />
          ) : (
            <AvatarFallback className="bg-primary text-primary-foreground">
              {getInitials(contactName)}
            </AvatarFallback>
          )}
        </Avatar>
        <div>
          <h3 className="font-medium">{contactName}</h3>
          <p className="text-xs text-muted-foreground">Tap to view profile</p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4" ref={scrollRef}>
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <Send className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">Start a conversation</h3>
            <p className="text-sm text-muted-foreground">
              Send a message to begin chatting with {contactName}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map((msg, index) => {
              const isLastInGroup = index === messages.length - 1 || 
                messages[index + 1]?.sender_id !== msg.sender_id;
              const isFirstInGroup = index === 0 || 
                messages[index - 1]?.sender_id !== msg.sender_id;
              
              return (
                <div
                  key={msg.id}
                  className={`flex ${isOwnMessage(msg) ? 'justify-end' : 'justify-start'}`}
                >
                  {/* Removed new messages divider */}
                  {/* Left avatar for other user's messages */}
                  {!isOwnMessage(msg) && isFirstInGroup && (
                    <div className="mr-2">
                      <Avatar className="h-8 w-8 mb-1">
                        {contactAvatar ? (
                          <AvatarImage src={contactAvatar} alt={contactName} />
                        ) : (
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                            {getInitials(contactName)}
                          </AvatarFallback>
                        )}
                      </Avatar>
                    </div>
                  )}

                  <div className={`max-w-[70%] ${isOwnMessage(msg) ? 'ml-auto' : ''}`}>
                    {/* Reply to message */}
                    {msg.reply_to && (
                      <div className={`mb-1 p-2 rounded-lg bg-muted/50 border-l-4 border-primary/50 ${
                        isOwnMessage(msg) ? 'text-right' : 'text-left'
                      }`}>
                        <p className="text-xs text-muted-foreground mb-1">
                          Replying to {msg.reply_to.sender_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {msg.reply_to.content.length > 50 
                            ? msg.reply_to.content.substring(0, 50) + '...' 
                            : msg.reply_to.content}
                        </p>
                </div>
                    )}
                    
                    {/* Message bubble */}
                    <div
                      className={`relative group p-3 ${
                        isOwnMessage(msg)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      } rounded-2xl`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      
                      {/* Message time and status - only show on last message of group */}
                      {isLastInGroup && (
  <div
    className={`flex items-center justify-end space-x-1 mt-1 ${
      isOwnMessage(msg)
        ? "text-primary-foreground/70"
        : "text-muted-foreground"
    }`}
  >
    <span className="text-xs">
      {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
    </span>

    {isOwnMessage(msg) && (
      <div
        className={`flex items-center ${
          msg.status === "read"
            ? "text-green-500"
            : msg.status === "delivered"
            ? "text-gray-400"
            : "text-gray-300"
        }`}
      >
        {msg.status === "read" ? (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="text-green-500"
          >
            <path d="M16.6 5.29l-8.89 8.88-3.3-3.29-1.41 1.41 4.71 4.71L18 6.7z" />
            <path d="M22.24 5.29l-12.53 12.53-4.71-4.71-1.41 1.41 6.12 6.12L23.65 6.7z" />
          </svg>
        ) : msg.status === "delivered" ? (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="text-gray-400"
          >
            <path d="M16.6 5.29l-8.89 8.88-3.3-3.29-1.41 1.41 4.71 4.71L18 6.7z" />
            <path d="M22.24 5.29l-12.53 12.53-4.71-4.71-1.41 1.41 6.12 6.12L23.65 6.7z" />
          </svg>
        ) : msg.status === "sent" ? (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="text-gray-300"
          >
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
          </svg>
        ) : (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="text-gray-400"
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
        )}
      </div>
    )}
  </div>
)}

                    
                      {/* Action buttons */}
                      <div className="absolute -bottom-2 -right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 bg-background border shadow-sm"
                          onClick={() => {
                            setReplyTo(msg);
                            // Auto-focus input when reply is clicked
                            setTimeout(() => inputRef.current?.focus(), 100);
                          }}
                          title="Reply"
                        >
                          <Reply className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 bg-background border shadow-sm"
                          onClick={() => setShowReactions(showReactions === msg.id ? null : msg.id)}
                          title="React"
                        >
                          {msg.reactions && Object.keys(msg.reactions).length > 0 ? (
                            // Show the first reaction emoji if any exist
                            <span className="text-sm">
                              {Object.keys(msg.reactions)[0]}
                            </span>
                          ) : (
                            <Smile className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                      
                                              {/* Reactions display */}
                        {Object.keys(msg.reactions).length > 0 && (
                          <div className="flex items-center space-x-1 mt-2">
                            {Object.entries(msg.reactions).map(([emoji, userIds]) => (
                              <Badge
                                key={emoji}
                                variant="secondary"
                                className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground"
                                onClick={() => handleReaction(msg.id, emoji)}
                              >
                                <span className="mr-1">{emoji}</span>
                                {userIds.length > 1 && <span>{userIds.length}</span>}
                              </Badge>
                            ))}
                          </div>
                        )}
                    </div>
                    
                    {/* Reactions popup */}
                    {showReactions === msg.id && (
                      <div className="absolute bottom-full right-0 mb-2 p-2 bg-popover border rounded-lg shadow-lg z-10">
                        <div className="flex items-center space-x-1">
                                                     {REACTIONS.map((reaction) => (
                             <Button
                               key={reaction.emoji}
                               variant="ghost"
                               size="icon"
                               className="h-8 w-8 hover:bg-muted"
                               onClick={() => handleReaction(msg.id, reaction.emoji)}
                               title={reaction.label}
                             >
                               {reaction.emoji}
                             </Button>
                           ))}
                        </div>
                      </div>
                    )}
                  </div>
                    </div>
                  );
                })}
            </div>
        )}
        </div>

      {/* Message Input */}
      <div className="p-4 border-t bg-card flex-shrink-0">
        {/* Reply preview */}
        {replyTo && (
          <div className="mb-3 p-2 bg-muted rounded-lg border-l-4 border-primary">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">
                  Replying to {isOwnMessage(replyTo) ? 'yourself' : contactName}
                </p>
                <p className="text-sm text-muted-foreground">
                  {replyTo.content.length > 50 
                    ? replyTo.content.substring(0, 50) + '...' 
                    : replyTo.content}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setReplyTo(null);
                  // Focus input when reply is cleared
                  inputRef.current?.focus();
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
        
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            title="Attach file"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pr-20"
            />
      </div>

          <Button
            onClick={handleSendMessage}
            disabled={!message.trim()}
            className="h-9 px-4"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
