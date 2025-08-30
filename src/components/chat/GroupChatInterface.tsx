import React, { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Smile, 
  Paperclip, 
  MoreHorizontal,
  Reply,
  Heart,
  ThumbsUp,
  ThumbsDown,
  Laugh,
  Frown,
  Zap,
  Users,
  Crown
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useReactions } from '@/hooks/useReactions';

interface GroupMessage {
  id: string;
  content: string;
  sender_id: string;
  sender_name: string;
  group_id: string;
  created_at: string;
  reply_to?: {
    id: string;
    content: string;
    sender_name: string;
  };
  reactions: {
    [key: string]: string[]; // reaction_type -> user_ids
  };
  is_read: boolean; // Whether the message has been read
}

interface Group {
  id: string;
  name: string;
  avatar_url?: string;
  member_count: number;
  members: {
    id: string;
    name: string;
    avatar_url?: string;
    role: 'admin' | 'member';
    joined_at: string;
  }[];
  is_admin: boolean;
}

interface GroupChatInterfaceProps {
  group: Group;
  messages: GroupMessage[];
  onSendMessage: (content: string, replyTo?: string) => Promise<boolean>;
  loading: boolean;
  onShowProfile: () => void;
}

const REACTIONS = [
  { emoji: '❤️', label: 'Love' },
  { emoji: '👍', label: 'Like' },
  { emoji: '😂', label: 'Laugh' },
  { emoji: '😢', label: 'Sad' },
  { emoji: '😠', label: 'Angry' },
  { emoji: '👎', label: 'Thumbs Down' },
];

export const GroupChatInterface: React.FC<GroupChatInterfaceProps> = ({
  group,
  messages,
  onSendMessage,
  loading,
  onShowProfile
}) => {
  const { user } = useAuth();
  const { toggleReaction, loading: reactionLoading } = useReactions();
  const [message, setMessage] = useState('');
  const [replyTo, setReplyTo] = useState<GroupMessage | null>(null);
  const [showReactions, setShowReactions] = useState<string | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    const success = await onSendMessage(message, replyTo?.id);
    if (success) {
      setMessage('');
      setReplyTo(null);
      inputRef.current?.focus();
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

  const isOwnMessage = (message: GroupMessage) => message.sender_id === user?.id;

  const getMemberById = (id: string) => {
    return group.members.find(member => member.id === id);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Group Chat Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10">
            {group.avatar_url ? (
              <AvatarImage src={group.avatar_url} alt={group.name} />
            ) : (
              <AvatarFallback className={`${getAvatarColor(group.name)} text-white`}>
                <Users className="h-6 w-6" />
              </AvatarFallback>
            )}
          </Avatar>
          <div>
            <h3 className="font-medium">{group.name}</h3>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-muted-foreground">
                {group.member_count} members
              </span>
              {group.is_admin && (
                <Badge variant="secondary" className="text-xs">
                  <Crown className="h-3 w-3 mr-1" />
                  Admin
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowMembers(!showMembers)}
            className="h-8 w-8"
            title="View members"
          >
            <Users className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onShowProfile}
            className="h-8 w-8"
            title="Group settings"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Chat Area */}
        <div className={`flex-1 flex flex-col ${showMembers ? 'w-2/3' : 'w-full'}`}>
          {/* Messages Area */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Send className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">Start a group conversation</h3>
                <p className="text-sm text-muted-foreground">
                  Send a message to begin chatting in {group.name}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => {
                  const sender = getMemberById(msg.sender_id);
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isOwnMessage(msg) ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[70%] ${isOwnMessage(msg) ? 'order-2' : 'order-1'}`}>
                        {!isOwnMessage(msg) && (
                          <div className="flex items-center space-x-2 mb-1">
                            <Avatar className="h-6 w-6">
                              {sender?.avatar_url ? (
                                <AvatarImage src={sender.avatar_url} alt={sender.name} />
                              ) : (
                                <AvatarFallback className={`${getAvatarColor(sender?.name || '')} text-white text-xs`}>
                                  {getInitials(sender?.name || '')}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <span className="text-xs font-medium text-muted-foreground">
                              {sender?.name}
                              {sender?.role === 'admin' && (
                                <Crown className="h-3 w-3 ml-1 inline" />
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className={`max-w-[70%] ${isOwnMessage(msg) ? 'order-1' : 'order-2'}`}>
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
                          className={`relative group p-3 rounded-2xl ${
                            isOwnMessage(msg)
                              ? 'bg-primary text-primary-foreground ml-auto'
                              : 'bg-muted'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          
                          {/* Message time and read status */}
                          <div className={`flex items-center justify-end space-x-1 mt-1 ${
                            isOwnMessage(msg) ? 'text-primary-foreground/70' : 'text-muted-foreground'
                          }`}>
                            <span className="text-xs">
                              {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                            </span>
                            {isOwnMessage(msg) && (
                              <span className="text-xs">
                                {msg.is_read ? 'read' : 'sent'}
                              </span>
                            )}
                          </div>
                          
                          {/* Reaction button */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute -bottom-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity bg-background border shadow-sm"
                            onClick={() => setShowReactions(showReactions === msg.id ? null : msg.id)}
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
                          
                          {/* Reactions display under a message */}
                          {Object.keys(msg.reactions).length > 0 && (
                            <div className="flex items-center space-x-1 mt-2">
                              {Object.entries(msg.reactions).map(([emoji, userIds]) => (
                                <Badge
                                  key={emoji}
                                  variant="secondary"
                                  className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground relative group"
                                  onClick={() => handleReaction(msg.id, emoji)}
                                >
                                  <span className="mr-1">{emoji}</span>
                                  {userIds.length > 1 && <span>{userIds.length}</span>}

                                  {/* Tooltip with user list */}
                                  <div className="absolute bottom-full mb-1 hidden group-hover:block bg-popover border rounded p-2 shadow-lg text-xs z-50">
                                    {userIds.map((id) => (
                                      <div key={id}>{id === user?.id ? "You" : id}</div>
                                    ))}
                                  </div>
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        {/* Reactions popup - WhatsApp style floating pill */}
                        {showReactions === msg.id && (
                          <div className="absolute bottom-full right-0 mb-2 bg-background border rounded-full shadow-lg z-50 px-3 py-2 flex space-x-2">
                            {REACTIONS.map((reaction) => (
                              <button
                                key={reaction.emoji}
                                className="text-xl hover:scale-125 transition-transform duration-150 cursor-pointer"
                                onClick={() => handleReaction(msg.id, reaction.emoji)}
                                title={reaction.label}
                              >
                                {reaction.emoji}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Message Input */}
          <div className="p-4 border-t bg-card">
            {/* Reply preview */}
            {replyTo && (
              <div className="mb-3 p-2 bg-muted rounded-lg border-l-4 border-primary">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Replying to {replyTo.sender_name}: {replyTo.content.length > 50 
                      ? replyTo.content.substring(0, 50) + '...' 
                      : replyTo.content}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() => setReplyTo(null)}
                  >
                    ×
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
                
                {/* Quick reply button */}
                {!replyTo && messages.length > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6"
                    onClick={() => setReplyTo(messages[messages.length - 1])}
                    title="Reply to last message"
                  >
                    <Reply className="h-4 w-4" />
                  </Button>
                )}
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

        {/* Members Sidebar */}
        {showMembers && (
          <div className="w-1/3 border-l bg-muted/30">
            <div className="p-4 border-b">
              <h3 className="font-medium">Group Members</h3>
              <p className="text-sm text-muted-foreground">{group.member_count} members</p>
            </div>
            
            <ScrollArea className="h-full">
              <div className="p-4 space-y-3">
                {group.members.map((member) => (
                  <div key={member.id} className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      {member.avatar_url ? (
                        <AvatarImage src={member.avatar_url} alt={member.name} />
                      ) : (
                        <AvatarFallback className={`${getAvatarColor(member.name)} text-white text-xs`}>
                          {getInitials(member.name)}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium truncate">{member.name}</p>
                        {member.role === 'admin' && (
                          <Badge variant="secondary" className="text-xs">
                            <Crown className="h-3 w-3 mr-1" />
                            Admin
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Joined {formatDistanceToNow(new Date(member.joined_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
};
