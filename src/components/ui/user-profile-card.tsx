import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useUserNotes } from '@/hooks/useUserNotes';
import { useToast } from '@/hooks/use-toast';
import { getCountryFlag } from '@/data/countries';
import { Edit3, Save, X, StickyNote } from 'lucide-react';

interface UserProfileCardProps {
  name?: string | null;
  email?: string | null;
  country?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  userId?: string;
  className?: string;
  loading?: boolean;
  error?: string | null;
}

export const UserProfileCard = ({
  name,
  email,
  country,
  bio,
  avatar_url,
  userId,
  className = "",
  loading = false,
  error = null,
}: UserProfileCardProps) => {
  const { getNoteForUser, saveNote } = useUserNotes();
  const { toast } = useToast();
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [nickname, setNickname] = useState('');
  const [note, setNote] = useState('');

  const userNote = userId ? getNoteForUser(userId) : null;
  
  // Enhanced display logic with better fallbacks
  const displayName = userNote?.nickname || name || (email ? email.split('@')[0] : null) || (userId ? `User ${userId.slice(0, 8)}` : 'Unknown User');
  const displayEmail = email || (userId ? `${userId.slice(0, 8)}@unknown.com` : 'No email available');
  const displayAvatar = avatar_url;
  const initials = displayName && displayName !== 'Unknown User' 
    ? displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : (userId ? userId.slice(0, 2).toUpperCase() : 'U');

  // Show loading state
  if (loading) {
    return (
      <Card className={`w-80 shadow-lg border ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center space-x-3 mb-3">
            <div className="h-12 w-12 bg-gray-200 rounded-full animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded animate-pulse" />
              <div className="h-3 bg-gray-200 rounded w-3/4 animate-pulse" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded animate-pulse" />
            <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show error state
  if (error) {
    return (
      <Card className={`w-80 shadow-lg border border-red-200 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center space-x-3 mb-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-red-100 text-red-600">
                !
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h4 className="font-semibold text-sm text-red-600">Profile Error</h4>
              <p className="text-xs text-red-500">{error}</p>
            </div>
          </div>
          {userId && (
            <p className="text-xs text-muted-foreground">User ID: {userId.slice(0, 8)}...</p>
          )}
        </CardContent>
      </Card>
    );
  }

  console.log('🎭 UserProfileCard render:', {
    name,
    email,
    avatar_url,
    userId,
    userNote,
    displayName,
    displayEmail,
    displayAvatar,
    initials
  });

  React.useEffect(() => {
    if (userNote) {
      setNickname(userNote.nickname || '');
      setNote(userNote.note || '');
    }
  }, [userNote]);

  const handleSaveNote = async () => {
    if (!userId) return;

    const success = await saveNote(userId, nickname.trim() || undefined, note.trim() || undefined);
    if (success) {
      toast({
        title: "Note saved",
        description: "Your personal note has been saved.",
      });
      setIsEditingNote(false);
    } else {
      toast({
        title: "Error",
        description: "Failed to save note. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCancelEdit = () => {
    setNickname(userNote?.nickname || '');
    setNote(userNote?.note || '');
    setIsEditingNote(false);
  };

  return (
    <Card className={`w-80 shadow-lg border ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-center space-x-3 mb-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={avatar_url} alt={displayName} />
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h4 className="font-semibold text-sm truncate">{displayName}</h4>
              {country && (
                <span className="text-sm">{getCountryFlag(country)}</span>
              )}
            </div>
            {userNote?.nickname && name && name !== userNote.nickname && (
              <p className="text-xs text-muted-foreground truncate">Real name: {name}</p>
            )}
            <p className="text-xs text-muted-foreground truncate">{displayEmail}</p>
            {!name && !email && userId && (
              <p className="text-xs text-orange-500 truncate">Profile data unavailable</p>
            )}
          </div>
        </div>
        
        {bio && (
          <div className="mb-3">
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
              {bio}
            </p>
          </div>
        )}
        
        <div className="flex justify-between items-center mb-3">
          <Badge variant={country ? "secondary" : "outline"} className="text-xs">
            {country || 'Location unknown'}
          </Badge>
          {(!name || !email) && (
            <Badge variant="outline" className="text-xs text-orange-600 border-orange-200">
              Limited data
            </Badge>
          )}
        </div>

        {/* Personal Notes Section */}
        {userId && (
          <>
            <Separator className="my-3" />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium flex items-center space-x-1">
                  <StickyNote className="h-3 w-3" />
                  <span>Personal Note</span>
                </Label>
                {!isEditingNote && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingNote(true)}
                    className="h-6 px-2 text-xs"
                  >
                    <Edit3 className="h-3 w-3 mr-1" />
                    {userNote ? 'Edit' : 'Add'}
                  </Button>
                )}
              </div>

              {isEditingNote ? (
                <div className="space-y-2">
                  <Input
                    placeholder="Nickname (optional)"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="text-xs h-7"
                  />
                  <Textarea
                    placeholder="Add a personal note to remember who this is..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    className="text-xs resize-none"
                  />
                  <div className="flex space-x-1">
                    <Button
                      size="sm"
                      onClick={handleSaveNote}
                      className="h-6 px-2 text-xs"
                    >
                      <Save className="h-3 w-3 mr-1" />
                      Save
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelEdit}
                      className="h-6 px-2 text-xs"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">
                  {userNote?.note ? (
                    <p className="leading-relaxed">{userNote.note}</p>
                  ) : (
                    <p className="italic">Click "Add" to add a personal note</p>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};