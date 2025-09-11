import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Users, Trash2, Eye, EyeOff } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Share {
  id: string;
  viewer_id: string;
  owner_id: string;
  is_active: boolean;
  shared_at: string;
  viewed_at?: string;
  viewer_profile?: {
    name: string;
    email: string;
    country: string;
    bio?: string;
    avatar_url?: string;
  };
}

const ShareManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [myShares, setMyShares] = useState<Share[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMyShares = async () => {
    if (!user) return;

    try {
      // First get shares
      const { data: sharesData, error: sharesError } = await supabase
        .from('shares')
        .select('id, viewer_id, owner_id, is_active, shared_at, viewed_at')
        .eq('owner_id', user.id)
        .order('shared_at', { ascending: false });

      if (sharesError) throw sharesError;

      if (!sharesData || sharesData.length === 0) {
        setMyShares([]);
        return;
      }

      // Get viewer profiles for each share
      const viewerIds = sharesData.map(share => share.viewer_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, name, email, country, bio, avatar_url')
        .in('user_id', viewerIds);

      if (profilesError) throw profilesError;

      // Create a map of profiles by user_id
      const profilesMap = (profilesData || []).reduce((acc, profile) => {
        acc[profile.user_id] = profile;
        return acc;
      }, {} as Record<string, any>);

      // Transform the data to match our interface
      const transformedShares = sharesData.map(share => ({
        ...share,
        viewer_profile: profilesMap[share.viewer_id],
      }));

      setMyShares(transformedShares);
    } catch (error: any) {
      console.error('Error fetching my shares:', error);
      toast({
        title: "Error",
        description: "Failed to load share information.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleShareStatus = async (shareId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('shares')
        .update({ is_active: !currentStatus })
        .eq('id', shareId)
        .eq('owner_id', user?.id);

      if (error) throw error;

      setMyShares(prev => 
        prev.map(share => 
          share.id === shareId 
            ? { ...share, is_active: !currentStatus }
            : share
        )
      );

      toast({
        title: currentStatus ? "Availability hidden" : "Availability shared",
        description: currentStatus 
          ? "Your availability is now hidden from this user."
          : "Your availability is now visible to this user.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update share status.",
        variant: "destructive",
      });
    }
  };

  const deleteShare = async (shareId: string) => {
    try {
      const { error } = await supabase
        .from('shares')
        .delete()
        .eq('id', shareId)
        .eq('owner_id', user?.id);

      if (error) throw error;

      setMyShares(prev => prev.filter(share => share.id !== shareId));
      toast({
        title: "Share removed",
        description: "User can no longer view your availability.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to remove share.",
        variant: "destructive",
      });
    }
  };

  const getCountryFlag = (country: string) => {
    const flagEmojis: Record<string, string> = {
      'US': '🇺🇸', 'GB': '🇬🇧', 'CA': '🇨🇦', 'AU': '🇦🇺', 'DE': '🇩🇪',
      'FR': '🇫🇷', 'JP': '🇯🇵', 'IN': '🇮🇳', 'BR': '🇧🇷', 'MX': '🇲🇽'
    };
    return flagEmojis[country] || '🌍';
  };

  useEffect(() => {
    fetchMyShares();

    // Set up real-time subscription for share changes
    const channel = supabase
      .channel('share-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shares',
          filter: `owner_id=eq.${user?.id}`,
        },
        () => {
          fetchMyShares();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading share information...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Users className="h-5 w-5" />
          <span>Manage Shared Access</span>
          <Badge variant="secondary" className="ml-2">
            {myShares.filter(s => s.is_active).length} active
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {myShares.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>You haven't shared your availability with anyone yet.</p>
            <p className="text-sm mt-2">Use the Share button to start sharing!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {myShares.map((share) => (
              <div
                key={share.id}
                className={`p-4 border rounded-lg ${
                  share.is_active 
                    ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' 
                    : 'bg-gray-50 border-gray-200 dark:bg-gray-900 dark:border-gray-700'
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center space-x-3 min-w-0">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={share.viewer_profile?.avatar_url} alt={share.viewer_profile?.name} />
                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20">
                        {(share.viewer_profile?.name || 'U').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-sm truncate">
                          {share.viewer_profile?.name || 'Unknown User'}
                        </h4>
                        {share.viewer_profile?.country && (
                          <span className="text-sm">
                            {getCountryFlag(share.viewer_profile.country)}
                          </span>
                        )}
                        <Badge 
                          variant={share.is_active ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {share.is_active ? "Active" : "Paused"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {share.viewer_profile?.email}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-1">
                        <span>
                          Shared {formatDistanceToNow(new Date(share.shared_at), { addSuffix: true })}
                        </span>
                        {share.viewed_at && (
                          <span>
                            Last viewed {formatDistanceToNow(new Date(share.viewed_at), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:ml-4 w-full sm:w-auto justify-stretch sm:justify-end flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleShareStatus(share.id, share.is_active)}
                      className="h-10 sm:h-8 w-full sm:w-auto"
                    >
                      {share.is_active ? (
                        <>
                          <EyeOff className="h-3 w-3 mr-1" />
                          Hide
                        </>
                      ) : (
                        <>
                          <Eye className="h-3 w-3 mr-1" />
                          Show
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteShare(share.id)}
                      className="h-10 sm:h-8 text-destructive hover:text-destructive w-full sm:w-auto"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ShareManager;