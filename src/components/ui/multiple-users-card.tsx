import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { getCountryFlag } from '@/data/countries';

interface MultipleUsersCardProps {
  users: Array<{
    userId: string;
    profileData: any;
    slot: any;
  }>;
  className?: string;
}

export const MultipleUsersCard = ({ users, className = "" }: MultipleUsersCardProps) => {
  return (
    <div className={`p-3 space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">Available Users</h4>
        <Badge variant="secondary" className="text-xs">
          {users.length} user{users.length > 1 ? 's' : ''}
        </Badge>
      </div>
      
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {users.map(({ userId, profileData, slot }) => (
          <div key={userId} className="flex items-center space-x-3 p-2 rounded-lg bg-muted/30">
            <Avatar className="h-8 w-8">
              <AvatarImage src={profileData?.avatar_url} alt={profileData?.display_name || 'User'} />
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-xs">
                {profileData?.display_name
                  ? profileData.display_name.charAt(0).toUpperCase()
                  : userId.slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium truncate">
                  {profileData?.display_name || `User ${userId.slice(0, 8)}`}
                </p>
                {profileData?.country && (
                  <span className="text-sm">{getCountryFlag(profileData.country)}</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {profileData?.email || 'No email available'}
              </p>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {slot.startTime} - {slot.endTime}
                </Badge>
                {slot.timezone && (
                  <span className="text-xs text-muted-foreground">
                    {slot.timezone}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};