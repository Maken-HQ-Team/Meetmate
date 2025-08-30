import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  ArrowLeft, 
  Users, 
  Crown, 
  Settings, 
  Edit, 
  Save, 
  X,
  UserPlus,
  UserMinus,
  Shield,
  ShieldOff,
  MoreVertical,
  Calendar,
  MapPin
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface GroupMember {
  id: string;
  name: string;
  avatar_url?: string;
  role: 'admin' | 'member';
  joined_at: string;
  is_online?: boolean;
}

interface Group {
  id: string;
  name: string;
  description?: string;
  avatar_url?: string;
  member_count: number;
  members: GroupMember[];
  is_admin: boolean;
  created_at: string;
  created_by: string;
}

interface GroupProfileProps {
  group: Group;
  onBack: () => void;
}

export const GroupProfile: React.FC<GroupProfileProps> = ({
  group,
  onBack
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: group.name,
    description: group.description || ''
  });
  const [showAddMember, setShowAddMember] = useState(false);
  const [showRemoveMember, setShowRemoveMember] = useState<GroupMember | null>(null);
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

  const handleSaveChanges = async () => {
    if (!editData.name.trim()) {
      toast({
        title: "Error",
        description: "Group name cannot be empty.",
        variant: "destructive",
      });
      return;
    }

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('groups')
        .update({
          name: editData.name,
          description: editData.description
        })
        .eq('id', group.id);

      if (error) throw error;

      toast({
        title: "Group updated",
        description: "Group information has been updated successfully.",
      });

      setIsEditing(false);
    } catch (error: any) {
      console.error('Error updating group:', error);
      toast({
        title: "Error",
        description: "Failed to update group. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleCancelEdit = () => {
    setEditData({
      name: group.name,
      description: group.description || ''
    });
    setIsEditing(false);
  };

  const handleRemoveMember = async (member: GroupMember) => {
    if (member.role === 'admin') {
      toast({
        title: "Error",
        description: "Cannot remove admin members.",
        variant: "destructive",
      });
      return;
    }

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', group.id)
        .eq('user_id', member.id);

      if (error) throw error;

      toast({
        title: "Member removed",
        description: `${member.name} has been removed from the group.`,
      });

      setShowRemoveMember(null);
      // TODO: Refresh group data
    } catch (error: any) {
      console.error('Error removing member:', error);
      toast({
        title: "Error",
        description: "Failed to remove member. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (group.is_admin && group.members.filter(m => m.role === 'admin').length === 1) {
      toast({
        title: "Error",
        description: "Cannot leave group as the only admin. Transfer admin role first.",
        variant: "destructive",
      });
      return;
    }

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', group.id)
        .eq('user_id', user?.id);

      if (error) throw error;

      toast({
        title: "Left group",
        description: `You have left ${group.name}.`,
      });

      onBack();
    } catch (error: any) {
      console.error('Error leaving group:', error);
      toast({
        title: "Error",
        description: "Failed to leave group. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
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
        <h2 className="text-lg font-semibold">Group Info</h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </div>

      {/* Group Content */}
      <ScrollArea className="h-full">
        <div className="p-6 space-y-6">
          {/* Group Avatar and Basic Info */}
          <div className="text-center">
            <div className="relative inline-block mb-4">
              <Avatar className="h-24 w-24">
                {group.avatar_url ? (
                  <AvatarImage src={group.avatar_url} alt={group.name} />
                ) : (
                  <AvatarFallback className={`${getAvatarColor(group.name)} text-white text-2xl`}>
                    <Users className="h-12 w-12" />
                  </AvatarFallback>
                )}
              </Avatar>
            </div>
            
            {isEditing ? (
              <div className="space-y-3">
                <Input
                  value={editData.name}
                  onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                  className="text-center text-lg font-bold"
                  maxLength={50}
                />
                <Textarea
                  value={editData.description}
                  onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Add a group description..."
                  className="text-center"
                  rows={2}
                  maxLength={200}
                />
                <div className="flex items-center justify-center space-x-2">
                  <Button
                    size="sm"
                    onClick={handleSaveChanges}
                    disabled={updating}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelEdit}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <h1 className="text-2xl font-bold mb-2">{group.name}</h1>
                {group.description && (
                  <p className="text-muted-foreground mb-4">{group.description}</p>
                )}
                
                <div className="flex items-center justify-center space-x-2 mb-4">
                  <Badge variant="secondary">
                    <Users className="h-4 w-4 mr-1" />
                    {group.member_count} members
                  </Badge>
                  {group.is_admin && (
                    <Badge variant="default">
                      <Crown className="h-4 w-4 mr-1" />
                      Admin
                    </Badge>
                  )}
                </div>

                {group.is_admin && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Group
                  </Button>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Group Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Group Details</h3>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Created</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(group.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Members</p>
                  <p className="text-sm text-muted-foreground">
                    {group.member_count} total members
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Members List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Members</h3>
              {group.is_admin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddMember(true)}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Member
                </Button>
              )}
            </div>
            
            <div className="space-y-2">
              {group.members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        {member.avatar_url ? (
                          <AvatarImage src={member.avatar_url} alt={member.name} />
                        ) : (
                          <AvatarFallback className={`${getAvatarColor(member.name)} text-white`}>
                            {getInitials(member.name)}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      {member.is_online && (
                        <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 border-2 border-background rounded-full"></div>
                      )}
                    </div>
                    
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium">{member.name}</h4>
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
                  
                  {group.is_admin && member.id !== user?.id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowRemoveMember(member)}
                      disabled={member.role === 'admin'}
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Group Actions */}
          <div className="space-y-3">
            {group.is_admin ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  // TODO: Implement group settings
                  toast({
                    title: "Coming soon",
                    description: "Advanced group settings will be available in a future update.",
                  });
                }}
              >
                <Settings className="h-4 w-4 mr-2" />
                Advanced Settings
              </Button>
            ) : (
              <Button
                variant="outline"
                className="w-full"
                onClick={handleLeaveGroup}
                disabled={updating}
              >
                <UserMinus className="h-4 w-4 mr-2" />
                Leave Group
              </Button>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Remove Member Confirmation */}
      <Dialog open={!!showRemoveMember} onOpenChange={() => setShowRemoveMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              Are you sure you want to remove <strong>{showRemoveMember?.name}</strong> from the group?
            </p>
            <p className="text-sm text-muted-foreground">
              This action cannot be undone. The member will lose access to all group conversations.
            </p>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowRemoveMember(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => showRemoveMember && handleRemoveMember(showRemoveMember)}
                disabled={updating}
              >
                {updating ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <>
                    <UserMinus className="h-4 w-4 mr-2" />
                    Remove
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Member Modal */}
      <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Add new members to your group. They will receive an invitation to join.
            </p>
            {/* TODO: Implement add member functionality */}
            <div className="text-center py-8">
              <UserPlus className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Coming soon</p>
            </div>
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => setShowAddMember(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
