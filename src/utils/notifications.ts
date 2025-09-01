import { supabase } from '@/integrations/supabase/client';
import { getCountryFlag } from '@/data/countries';

export const createNotification = async (
  userId: string,
  type: 'share_received' | 'share_accepted' | 'share_rejected' | 'message' | 'availability_updated',
  title: string,
  message: string,
  fromUserId?: string,
  metadata?: any
) => {
  const payload = {
    user_id: userId,
    type,
    title,
    message,
    from_user_id: fromUserId,
    metadata: metadata || {},
  };
  console.log('createNotification payload:', payload);
  try {
    const { error } = await supabase
      .from('notifications')
      .insert(payload);

    if (error) {
      console.error('Error creating notification:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error creating notification (catch):', error);
    return false;
  }
};

export const createShareNotification = async (
  viewerId: string,
  ownerName: string,
  ownerCountry: string,
  ownerId: string
) => {
  const countryFlag = getCountryFlag(ownerCountry);
  const title = `${ownerName}${countryFlag} shared their availability`;
  const message = `${ownerName} has shared their availability with you!`;

  return createNotification(
    viewerId,
    'share_received',
    title,
    message,
    ownerId,
    { country: ownerCountry }
  );
};