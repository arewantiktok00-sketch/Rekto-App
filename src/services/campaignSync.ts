import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabaseRead } from '@/integrations/supabase/client';
import { setCampaignMemoryCache } from '@/services/campaignCache';
import { setCampaignsCache } from '@/services/globalCache';

const CACHE_KEY = 'campaigns_cache';

export const syncCampaignsWithThumbnails = async (userId: string) => {
  if (!userId) return [];

  const { data: campaigns } = await supabaseRead
    .from('campaigns')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (!campaigns) return [];

  const resolved = campaigns;

  try {
    const timestamp = Date.now();
    await AsyncStorage.setItem(
      `${CACHE_KEY}_${userId}_all`,
      JSON.stringify({ data: resolved, timestamp })
    );

    // Pre-cache individual campaigns for instant CampaignDetail
    const entries = resolved.map((campaign: any) => [
      `campaign_cache_${campaign.id}`,
      JSON.stringify({ data: campaign, timestamp }),
    ]);
    if (entries.length > 0) {
      await AsyncStorage.multiSet(entries);
    }
  } catch {
    // Silent cache failure
  }

  setCampaignMemoryCache(userId, resolved);
  setCampaignsCache(resolved);

  return resolved;
};
