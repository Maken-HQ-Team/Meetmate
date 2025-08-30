# Chat System - AvailabilitySync

## Overview

This is a completely new, modern chat system built for the AvailabilitySync application. It provides WhatsApp-like functionality including individual chats, group chats, message replies, reactions, and user management.

## Features

### 🗨️ Individual Chats
- **Direct Messaging**: Chat with users you've shared availability with
- **Message Replies**: Reply to specific messages in conversations
- **Message Reactions**: React to messages with emojis (like, love, laugh, sad, angry, thumbs up/down)
- **Read Receipts**: See when messages are delivered and read
- **Real-time Updates**: Live message delivery using Supabase subscriptions

### 👥 Group Chats
- **Group Creation**: Create groups with selected contacts
- **Member Management**: Add/remove members, manage admin roles
- **Group Settings**: Edit group name, description, and manage permissions
- **Member Roles**: Admin and member roles with different permissions

### 🔐 Security & Privacy
- **User Blocking**: Block and unblock specific users
- **Contact Management**: Only chat with users you have shared availability with
- **Row Level Security**: Secure data access with Supabase policies
- **Invitation System**: Invite new users via email or direct chat invitations

### 📱 User Experience
- **WhatsApp-like Interface**: Familiar chat interface design
- **Responsive Design**: Works on desktop and mobile devices
- **Search Functionality**: Search through contacts and groups
- **Real-time Presence**: Online/offline status indicators
- **Message History**: Complete conversation history with timestamps

## Database Schema

### New Tables Created

1. **`groups`** - Group chat information
2. **`group_members`** - Group membership and roles
3. **`group_messages`** - Group chat messages
4. **`chat_invitations`** - Direct chat invitations
5. **`email_invitations`** - Email-based invitations
6. **`user_blocks`** - User blocking relationships

### Updated Tables

1. **`messages`** - Added reply support and reactions
2. **`profiles`** - Enhanced user profile information

## Setup Instructions

### 1. Database Migration

Run the SQL migration file to create the necessary tables:

```sql
-- Run this in your Supabase SQL editor
-- File: supabase/migrations/20250127_create_chat_system.sql
```

### 2. Component Structure

The chat system is organized into these main components:

```
src/components/chat/
├── ContactList.tsx          # Contact and group list
├── ChatInterface.tsx        # Individual chat interface
├── GroupChatInterface.tsx   # Group chat interface
├── NewChatModal.tsx         # New chat/contact invitation modal
├── NewGroupModal.tsx        # Group creation modal
├── ContactProfile.tsx       # Contact information and settings
└── GroupProfile.tsx         # Group information and management
```

### 3. Hooks

The system uses these custom hooks:

```
src/hooks/
├── useContacts.ts           # Manage contacts and relationships
├── useGroups.ts             # Manage groups and memberships
├── useMessages.ts           # Handle individual and group messages
└── useConversations.ts      # Manage conversation metadata
```

### 4. Routing

Add the conversations route to your app:

```tsx
// In App.tsx
<Route path="/conversations" element={<Conversations />} />
```

### 5. Navigation

Add a Conversations button to your main page:

```tsx
// In Index.tsx
<Button variant="outline" onClick={() => window.location.href = '/conversations'}>
  <MessageCircle className="h-4 w-4 mr-2" />
  Conversations
</Button>
```

## Usage

### Starting a New Chat

1. Click the "Conversations" button on the main page
2. Click the "+" button to start a new chat
3. Choose between:
   - **Existing Contacts**: Select from users you've shared availability with
   - **Invite New Contact**: Send an email invitation to someone new

### Creating a Group

1. In the Conversations page, click the group icon
2. Enter group name and description
3. Select contacts to add to the group
4. Click "Create Group"

### Managing Groups

- **Admins** can:
  - Edit group name and description
  - Add/remove members
  - Manage group settings
- **Members** can:
  - View group information
  - Leave the group
  - Send messages

### Blocking Users

1. Open a contact's profile
2. Click the "Block" button
3. Blocked users cannot send you messages
4. Use "Unblock" to restore communication

## Security Features

### Row Level Security (RLS)

All chat tables have RLS policies that ensure:
- Users can only see conversations they're part of
- Users can only send messages to contacts they have relationships with
- Group access is restricted to members only
- Invitations are properly secured

### Data Validation

- Message content is sanitized and validated
- User permissions are checked before actions
- Group membership is verified for all operations

## Real-time Features

### Supabase Subscriptions

The system uses Supabase real-time subscriptions for:
- Live message delivery
- Contact status updates
- Group membership changes
- Message read receipts

### Presence System

- Online/offline indicators
- Last seen timestamps
- Real-time status updates

## Customization

### Styling

The chat system uses Tailwind CSS and shadcn/ui components. You can customize:
- Color schemes
- Typography
- Spacing and layout
- Component variants

### Functionality

You can extend the system with:
- File attachments
- Voice/video calling
- Message encryption
- Advanced search
- Message pinning
- Custom reactions

## Troubleshooting

### Common Issues

1. **Messages not loading**: Check Supabase RLS policies
2. **Real-time not working**: Verify Supabase real-time is enabled
3. **Permission errors**: Check user authentication and relationships
4. **Group creation fails**: Verify contact selection and permissions

### Debug Mode

Enable console logging to debug issues:
- Check browser console for error messages
- Verify Supabase connection
- Check database permissions

## Performance Considerations

### Database Optimization

- Indexes on frequently queried columns
- Efficient queries with proper joins
- Pagination for large message histories

### Real-time Optimization

- Channel subscriptions are properly managed
- Unused subscriptions are cleaned up
- Efficient payload handling

## Future Enhancements

### Planned Features

- [ ] File and media sharing
- [ ] Voice and video messages
- [ ] Message encryption
- [ ] Advanced search and filters
- [ ] Message scheduling
- [ ] Chat bots and automation
- [ ] Message translation
- [ ] Advanced notification settings

### Integration Possibilities

- [ ] Email notifications
- [ ] Push notifications
- [ ] Calendar integration
- [ ] Task management
- [ ] Team collaboration tools

## Support

For issues or questions about the chat system:
1. Check the console for error messages
2. Verify database permissions and RLS policies
3. Test with a fresh user account
4. Check Supabase logs for backend errors

## License

This chat system is part of the AvailabilitySync application and follows the same licensing terms.
