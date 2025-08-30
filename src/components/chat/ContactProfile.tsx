import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Phone, 
  Video, 
  Mail, 
  MapPin, 
  Clock, 
  Shield, 
  ShieldOff,
  MoreVertical,
  UserX,
  UserCheck
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Contact {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  bio?: string;
  country?: string;
  timezone?: string;
  is_online?: boolean;
  last_seen?: string;
  is_blocked?: boolean;
}

interface ContactProfileProps {
  contact: Contact;
  onBack: () => void;
}

export const ContactProfile: React.FC<ContactProfileProps> = ({
  contact,
  onBack
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isBlocked, setIsBlocked] = useState(contact.is_blocked || false);
  const [updating, setUpdating] = useState(false);

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

  const handleBlockToggle = async () => {
    setUpdating(true);
    try {
      if (isBlocked) {
        // Unblock user
        const { error } = await supabase
          .from('user_blocks')
          .delete()
          .eq('blocker_id', user?.id)
          .eq('blocked_id', contact.id);

        if (error) throw error;

        setIsBlocked(false);
        toast({
          title: "User unblocked",
          description: `You can now receive messages from ${contact.name}`,
        });
      } else {
        // Block user
        const { error } = await supabase
          .from('user_blocks')
          .insert({
            blocker_id: user?.id,
            blocked_id: contact.id,
            blocked_at: new Date().toISOString()
          });

        if (error) throw error;

        setIsBlocked(true);
        toast({
          title: "User blocked",
          description: `You will no longer receive messages from ${contact.name}`,
        });
      }
    } catch (error: any) {
      console.error('Error updating block status:', error);
      toast({
        title: "Error",
        description: "Failed to update block status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleVoiceCall = () => {
    // TODO: Implement voice calling
    toast({
      title: "Coming soon",
      description: "Voice calling will be available in a future update.",
    });
  };

  const handleVideoCall = () => {
    // TODO: Implement video calling
    toast({
      title: "Coming soon",
      description: "Video calling will be available in a future update.",
    });
  };

  const handleSendEmail = () => {
    window.open(`mailto:${contact.email}`, '_blank');
  };

  return (
    <div className="h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="h-8 w-8"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold">Contact Info</h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </div>

      {/* Profile Content */}
      <div className="p-6 space-y-6">
        {/* Avatar and Basic Info */}
        <div className="text-center">
          <div className="relative inline-block mb-4">
            <Avatar className="h-24 w-24">
              {contact.avatar_url ? (
                <AvatarImage src={contact.avatar_url} alt={contact.name} />
              ) : (
                <AvatarFallback className={`${getAvatarColor(contact.name)} text-white text-2xl`}>
                  {getInitials(contact.name)}
                </AvatarFallback>
              )}
            </Avatar>
            
            {/* Online indicator */}
            {contact.is_online && (
              <div className="absolute bottom-2 right-2 h-6 w-6 bg-green-500 border-4 border-background rounded-full"></div>
            )}
          </div>
          
          <h1 className="text-2xl font-bold mb-2">{contact.name}</h1>
          
          <div className="flex items-center justify-center space-x-2 mb-4">
            {contact.is_online ? (
              <Badge variant="default" className="bg-green-500">
                Online
              </Badge>
            ) : (
              <Badge variant="secondary">
                {contact.last_seen 
                  ? `Last seen ${formatDistanceToNow(new Date(contact.last_seen), { addSuffix: true })}`
                  : 'Offline'
                }
              </Badge>
            )}
            
            {isBlocked && (
              <Badge variant="destructive">
                <ShieldOff className="h-3 w-3 mr-1" />
                Blocked
              </Badge>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center space-x-2 mb-6">
            <Button
              variant="outline"
              size="sm"
              onClick={handleVoiceCall}
              className="flex-1"
            >
              <Phone className="h-4 w-4 mr-2" />
              Voice
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleVideoCall}
              className="flex-1"
            >
              <Video className="h-4 w-4 mr-2" />
              Video
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSendEmail}
              className="flex-1"
            >
              <Mail className="h-4 w-4 mr-2" />
              Email
            </Button>
          </div>
        </div>

        <Separator />

        {/* Contact Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Contact Details</h3>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-muted-foreground">{contact.email}</p>
              </div>
            </div>

            {contact.country && (
              <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Country</p>
                  <p className="text-sm text-muted-foreground">{contact.country}</p>
                </div>
              </div>
            )}

            {contact.timezone && (
              <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Timezone</p>
                  <p className="text-sm text-muted-foreground">{contact.timezone}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {contact.bio && (
          <>
            <Separator />
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">About</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {contact.bio}
              </p>
            </div>
          </>
        )}

        <Separator />

        {/* Privacy & Security */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Privacy & Security</h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center space-x-3">
                {isBlocked ? (
                  <ShieldOff className="h-5 w-5 text-red-500" />
                ) : (
                  <Shield className="h-5 w-5 text-green-500" />
                )}
                <div>
                  <p className="text-sm font-medium">
                    {isBlocked ? 'Blocked' : 'Not Blocked'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isBlocked 
                      ? 'You will not receive messages from this user'
                      : 'You can receive messages from this user'
                    }
                  </p>
                </div>
              </div>
              
              <Button
                variant={isBlocked ? "default" : "destructive"}
                size="sm"
                onClick={handleBlockToggle}
                disabled={updating}
              >
                {updating ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : isBlocked ? (
                  <>
                    <UserCheck className="h-4 w-4 mr-2" />
                    Unblock
                  </>
                ) : (
                  <>
                    <UserX className="h-4 w-4 mr-2" />
                    Block
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Additional Actions */}
        <Separator />
        
        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              // TODO: Implement report user functionality
              toast({
                title: "Coming soon",
                description: "Report functionality will be available in a future update.",
              });
            }}
          >
            Report User
          </Button>
          
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              // TODO: Implement share contact functionality
              toast({
                title: "Coming soon",
                description: "Share contact functionality will be available in a future update.",
              });
            }}
          >
            Share Contact
          </Button>
        </div>
      </div>
    </div>
  );
};
