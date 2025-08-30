import React from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNotifications, type Notification } from '@/hooks/useNotifications';
import { Bell, Check, CheckCheck, Trash2, Share2, MessageCircle, Calendar, User, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getCountryFlag } from '@/data/countries';
import { useToast } from '@/hooks/use-toast';

const NotificationsDropdown = () => {
  const { notifications, loading, unreadCount, markAsRead, markAllAsRead, deleteNotification, acceptShare, rejectShare } = useNotifications();
  const { toast } = useToast();

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'share_received':
        return <Share2 className="h-4 w-4 text-blue-500" />;
      case 'share_accepted':
        return <Check className="h-4 w-4 text-green-500" />;
      case 'share_rejected':
        return <X className="h-4 w-4 text-red-500" />;
      case 'message':
        return <MessageCircle className="h-4 w-4 text-purple-500" />;
      case 'availability_updated':
        return <Calendar className="h-4 w-4 text-orange-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read_at) {
      markAsRead(notification.id);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs p-0 min-w-[20px]"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        className="w-80 max-h-[400px] bg-popover border border-border shadow-elegant" 
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs h-6 px-2"
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <ScrollArea className="max-h-[300px]">
          {loading ? (
            <div className="p-3 text-center text-sm text-muted-foreground">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-6 text-center">
              <Bell className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <div className="py-1">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`relative p-2 hover:bg-muted/50 cursor-pointer border-b border-border/30 last:border-b-0 ${
                    !notification.read_at ? 'bg-primary/5' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  {/* Unread indicator */}
                  {!notification.read_at && (
                    <div className="absolute left-1 top-3 w-2 h-2 bg-primary rounded-full" />
                  )}
                  
                  <div className="flex items-start space-x-2 ml-3">
                    {/* Avatar or Icon */}
                    {notification.from_profile ? (
                      <div className="relative">
                        <Avatar className="h-6 w-6">
                          <AvatarImage 
                            src={notification.from_profile.avatar_url} 
                            alt={notification.from_profile.name} 
                          />
                          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-xs">
                            {notification.from_profile.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {notification.from_profile.country && (
                          <div className="absolute -bottom-0.5 -right-0.5 text-xs">
                            {getCountryFlag(notification.from_profile.country)}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                        {getNotificationIcon(notification.type)}
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-xs font-medium text-foreground leading-tight">
                            {notification.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-tight">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </p>
                          
                          {/* Accept/Reject buttons for share notifications */}
                          {notification.type === 'share_received' && !notification.read_at && (
                            <div className="flex items-center space-x-1.5 mt-1.5">
                              <Button
                                size="sm"
                                variant="default"
                                className="h-5 px-2 text-xs bg-green-600 hover:bg-green-700"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  acceptShare(notification);
                                }}
                              >
                                <Check className="h-2.5 w-2.5 mr-1" />
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-5 px-2 text-xs border-red-200 text-red-600 hover:bg-red-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  rejectShare(notification);
                                }}
                              >
                                <X className="h-2.5 w-2.5 mr-1" />
                                Reject
                              </Button>
                            </div>
                          )}
                          
                          {/* Show status for processed share notifications */}
                          {notification.type === 'share_received' && notification.read_at && (
                            <div className="mt-1">
                              <Badge variant="secondary" className="text-xs h-4 px-1.5">
                                Processed
                              </Badge>
                            </div>
                          )}
                        </div>
                        
                        {/* Delete button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                          className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-2.5 w-2.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>


      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationsDropdown;