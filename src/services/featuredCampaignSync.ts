import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/integrations/supabase/client';

const TOP_RESULTS_CACHE_KEY = 'top_results_cache';

export const syncFeaturedCampaigns = async () => {
  const results: { topResults: any[]; featured: any | null } = {
    topResults: [],
    featured: null,
  };

  try {
    const { data, error } = await supabase.functions.invoke('featured-campaign', {
      body: { action: 'get_top' },
    });

    if (!error && data?.campaigns) {
      results.topResults = data.campaigns;
      await AsyncStorage.setItem(
        TOP_RESULTS_CACHE_KEY,
        JSON.stringify({ data: data.campaigns, timestamp: Date.now() })
      );
    }
  } catch {
    // Silent fail
  }

  try {
    const { data, error } = await supabase.functions.invoke('featured-campaign', {
      body: { action: 'get' },
    });

    if (!error && data?.campaign) {
      results.featured = data.campaign;
    }
  } catch {
    // Silent fail
  }

  return results;
};
