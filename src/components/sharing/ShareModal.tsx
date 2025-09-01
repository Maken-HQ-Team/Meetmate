import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { createShareNotification } from '@/utils/notifications';
import { Share2, Copy, Mail, MessageCircle, Loader2 } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ShareModal = ({ isOpen, onClose }: ShareModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [recipientEmail, setRecipientEmail] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [shareLink, setShareLink] = useState('');

  const handleShare = async () => {
    if (!recipientEmail || !user) return;

    // Prevent sharing with oneself
    if (recipientEmail.toLowerCase() === user.email?.toLowerCase()) {
      toast({
        title: "Cannot share with yourself",
        description: "You cannot share availability with your own email address.",
        variant: "destructive",
      });
      return;
    }

    setIsSharing(true);
    try {
      console.log('Attempting to share with:', recipientEmail);
      // Find recipient by email using secure function
      const { data: userIdData, error: profileError } = await supabase
        .rpc('get_user_id_by_email', { email_input: recipientEmail });

      console.log('User lookup result:', { userIdData, profileError });

      if (profileError || !userIdData) {
        console.error('User lookup failed:', profileError);
        toast({
          title: "User not found",
          description: "No user found with that email address.",
          variant: "destructive",
        });
        return;
      }

      // Check if already shared
      const { data: existingShare } = await supabase
        .from('shares')
        .select('id')
        .eq('owner_id', user.id)
        .eq('viewer_id', userIdData)
        .eq('is_active', true)
        .single();

      if (existingShare) {
        toast({
          title: "Already shared",
          description: "You have already shared your availability with this user.",
          variant: "destructive",
        });
        return;
      }

      // Get current user's profile for notification
      const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('name, country')
        .eq('user_id', user.id)
        .single();

      // Create share record as pending (inactive until accepted)
      console.log('Creating pending share:', { owner_id: user.id, viewer_id: userIdData });
      const { error: shareError } = await supabase
        .from('shares')
        .insert({
          owner_id: user.id,
          viewer_id: userIdData,
          is_active: false, // Pending approval
        });

      if (shareError) {
        console.error('Share creation failed:', shareError);
        toast({
          title: "Error",
          description: "Failed to share availability. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Create notification
      const ownerName = ownerProfile?.name || user.user_metadata?.name || user.email || 'Someone';
      const ownerCountry = ownerProfile?.country || 'US';
      const notificationSuccess = await createShareNotification(
        userIdData,
        ownerName,
        ownerCountry,
        user.id
      );
      if (!notificationSuccess) {
        toast({
          title: "Notification Error",
          description: "Failed to send notification. Please check your connection or try again.",
          variant: "destructive",
        });
      }
      // Optionally, force refresh notifications for the recipient (if you control their client)

      setShareLink(`${window.location.origin}/shared/${user.id}`);
      toast({
        title: "Share request sent!",
        description: "A notification has been sent. They can accept or decline your request.",
      });

      setRecipientEmail('');
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to share availability. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSharing(false);
    }
  };

  const copyShareLink = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      toast({
        title: "Link copied!",
        description: "Share link has been copied to clipboard.",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Share2 className="h-5 w-5" />
            <span>Share Availability</span>
          </DialogTitle>
          <DialogDescription>
            Share your availability calendar with others so they can see when you're free.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="recipient-email">Recipient Email</Label>
            <div className="flex space-x-2">
              <Input
                id="recipient-email"
                type="email"
                placeholder="Enter email address"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
              />
              <Button 
                onClick={handleShare} 
                disabled={!recipientEmail || isSharing}
                className="shrink-0"
              >
                {isSharing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Share
                  </>
                )}
              </Button>
            </div>
          </div>

          {shareLink && (
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <Label>Share Link</Label>
                  <div className="flex space-x-2">
                    <Input 
                      value={shareLink} 
                      readOnly 
                      className="bg-muted"
                    />
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={copyShareLink}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Anyone with this link can view your availability
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <MessageCircle className="h-4 w-4" />
            <span>Recipients will receive a notification message</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareModal;