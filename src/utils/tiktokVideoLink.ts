import { supabase } from '@/integrations/supabase/client';

type CampaignLike = {
  id: string;
  status?: string | null;
  video_url?: string | null;
  tiktok_public_url?: string | null;
};

const HYDRATABLE_STATUSES = new Set(['active', 'running', 'approved', 'live', 'completed']);
const inflight = new Map<string, Promise<string | null>>();

export function isValidTikTokPublicUrl(url?: string | null): boolean {
  return typeof url === 'string' && url.includes('/@');
}

export function shouldHydrateTikTokPublicUrl(campaign?: CampaignLike | null): boolean {
  if (!campaign?.id || !campaign?.video_url) return false;
  if (isValidTikTokPublicUrl(campaign.tiktok_public_url)) return false;
  const status = (campaign.status || '').toLowerCase();
  return HYDRATABLE_STATUSES.has(status);
}

export async function fetchTikTokPublicUrl(campaign: CampaignLike): Promise<string | null> {
  if (!campaign.id || !campaign.video_url || !supabase) return null;
  if (inflight.has(campaign.id)) {
    return inflight.get(campaign.id) ?? null;
  }

  const request = (async () => {
    try {
      const { data, error } = await supabase.functions.invoke('tiktok-video-info', {
        body: {
          authCode: campaign.video_url,
          campaignId: campaign.id,
        },
      });

      if (error) {
        if (__DEV__) {
          console.warn('[TikTokVideoLink] Resolve failed:', campaign.id, error.message);
        }
        return null;
      }

      const url = data?.videoInfo?.tiktokUrl || data?.tiktokUrl || null;
      return isValidTikTokPublicUrl(url) ? url : null;
    } catch (error) {
      if (__DEV__) {
        console.warn('[TikTokVideoLink] Resolve error:', campaign.id, error);
      }
      return null;
    } finally {
      inflight.delete(campaign.id);
    }
  })();

  inflight.set(campaign.id, request);
  return request;
}

export async function hydrateCampaignPublicUrl<T extends CampaignLike>(campaign: T): Promise<T> {
  if (!shouldHydrateTikTokPublicUrl(campaign)) {
    return campaign;
  }

  const url = await fetchTikTokPublicUrl(campaign);
  if (!url) {
    return campaign;
  }

  return {
    ...campaign,
    tiktok_public_url: url,
  };
}

export async function hydrateCampaignPublicUrls<T extends CampaignLike>(campaigns: T[]): Promise<T[]> {
  const hydrated = await Promise.all(campaigns.map((campaign) => hydrateCampaignPublicUrl(campaign)));
  return hydrated;
}
