import { supabase } from '@/integrations/supabase/client';
import { sendPushToUsers } from '@/services/notificationPush';

export async function broadcastToAllUsers(
  title: string,
  body: string,
  data?: any
) {
  try {
    const { data: preferences, error } = await supabase
      .from('notification_preferences')
      .select('user_id, push_subscription')
      .eq('push_enabled', true);

    if (error || !preferences) {
      throw new Error('Failed to get users');
    }

    const usersWithTokens = preferences.filter(
      (p) => p.push_subscription && typeof p.push_subscription === 'object' && 'deviceToken' in p.push_subscription
    );

    if (usersWithTokens.length === 0) {
      console.warn('No users with push tokens found');
      return { success: false, message: 'No users with push tokens' };
    }

    const userIds = usersWithTokens.map((p) => p.user_id);
    await sendPushToUsers(userIds, title, body, { data: data || {}, tag: 'broadcast' });

    return {
      success: true,
      sentTo: userIds.length,
    };
  } catch (e) {
    console.error('Broadcast error:', e);
    throw e;
  }
}
