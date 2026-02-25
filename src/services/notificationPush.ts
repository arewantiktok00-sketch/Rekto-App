/**
 * Push notifications for user ↔ owner.
 * Rule: every notification (in-app) must also be sent as a push ("push up") so the recipient sees it on the device.
 * - Owner → User: use sendPushToUsers or sendPushToCampaignUser from this module (invokes send-onesignal-push Edge Function).
 * - Backend: after creating any DB notification, also invoke send-onesignal-push with same user_id(s), title, body, and data for navigation.
 * - User → Owner: backend (e.g. notify-owners-new-ad) must send push to owners.
 */
import { supabase } from '@/integrations/supabase/client';

export type PushDataTag = 'ad_accepted' | 'ad_submitted' | 'ad_rejected' | 'owner-notification' | 'promo' | 'broadcast';

export interface SendPushOptions {
  data?: Record<string, any>;
  tag?: PushDataTag | string;
}

/**
 * Send a push notification to one or more users (owner → user).
 * Call this whenever you create an in-app notification for a user so they get a push-up too.
 */
export async function sendPushToUsers(
  userIds: string[],
  title: string,
  body: string,
  options: SendPushOptions = {}
): Promise<void> {
  if (userIds.length === 0) return;
  try {
    await supabase.functions.invoke('send-onesignal-push', {
      body: {
        external_user_ids: userIds,
        title,
        body,
        type: options.tag ?? 'notification',
        data: options.data ?? {},
      },
    });
  } catch (e) {
    console.warn('[notificationPush] sendPushToUsers failed:', e);
  }
}

/**
 * Send a push to the campaign owner (the user who created the ad). Use after accept-content, verify-and-run, or reject.
 */
export async function sendPushToCampaignUser(
  campaignId: string,
  title: string,
  body: string,
  dataType: 'ad_accepted' | 'ad_submitted' | 'ad_rejected'
): Promise<void> {
  try {
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('user_id')
      .eq('id', campaignId)
      .single();
    if (!campaign?.user_id) return;
    await sendPushToUsers([campaign.user_id], title, body, {
      data: { type: dataType, campaign_id: campaignId },
      tag: dataType,
    });
  } catch (e) {
    console.warn('[notificationPush] sendPushToCampaignUser failed:', e);
  }
}

/**
 * Send a push to all owners (e.g. "User paid – approve his content").
 * Invokes notify-owners-user-paid Edge Function which resolves owner user_ids and calls send-onesignal-push.
 */
export async function sendPushToOwners(
  campaignId: string,
  title: string,
  body: string
): Promise<void> {
  try {
    await supabase.functions.invoke('notify-owners-user-paid', {
      body: { campaignId, title, body },
    });
  } catch (e) {
    console.warn('[notificationPush] sendPushToOwners failed:', e);
  }
}
