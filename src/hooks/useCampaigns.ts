import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMonotonicMetrics } from '@/utils/metricsCache';
import { hydrateCampaignPublicUrls } from '@/utils/tiktokVideoLink';
import { getCampaignMemoryCache, setCampaignMemoryCache } from '@/services/campaignCache';
import { setCampaignsCache, getCached } from '@/services/globalCache';
import { prepareAndUpdateWidgetCampaigns } from '@/utils/widgetBridge';

const CACHE_KEY = 'campaigns_cache';
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

interface Campaign {
  id: string;
  title: string;
  status: string;
  objective?: string;
  updated_at?: string | null;
  spend?: number | null;
  views?: number | null;
  impressions?: number | null;
  clicks?: number | null;
  leads?: number | null;
  video_url?: string | null;
  tiktok_public_url?: string | null;
  tiktok_username?: string | null;
  tiktok_video_id?: string | null;
  tiktokRejectionReason?: string | null;
  tiktokAdStatus?: string | null;
  tiktokAdgroupStatus?: string | null;
  tiktokCampaignStatus?: string | null;
  created_at: string;
}

interface UseCampaignsOptions {
  userId: string;
}

/** Fetches ALL campaigns once. Filtering is client-side in the screen (instant). */
export function useCampaigns(options: UseCampaignsOptions) {
  const { userId } = options;
  // Seed only from THIS user's memory cache — never use global cache (could be another user's data)
  const initialFromMemory = userId ? getCampaignMemoryCache(userId) : [];
  const initialSeed = userId && initialFromMemory.length > 0 ? initialFromMemory : [];
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialSeed);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const fetchInProgressRef = useRef(false);
  const lastFetchRef = useRef(0);
  const MIN_FETCH_INTERVAL = 2000;
  const cacheKey = userId ? `${CACHE_KEY}_${userId}` : null;

  const persistCampaigns = useCallback(
    async (items: Campaign[]) => {
      if (cacheKey) {
        try {
          await AsyncStorage.setItem(
            cacheKey,
            JSON.stringify({
              data: items,
              timestamp: Date.now(),
            })
          );
        } catch (cacheError) {
          console.warn('Failed to cache campaigns:', cacheError);
        }
      }

      setCampaigns(items);
      setCampaignMemoryCache(userId, items);
      setCampaignsCache(items);
      const topResultsFallback = getCached<any[]>('topResults', []);
      prepareAndUpdateWidgetCampaigns(items, topResultsFallback).catch(() => {});
    },
    [cacheKey, userId]
  );

  const fetchCampaigns = useCallback(async (showLoading = false, force = false) => {
    if (!userId || fetchInProgressRef.current) return;

    const now = Date.now();
    if (!force && now - lastFetchRef.current < MIN_FETCH_INTERVAL) {
      return;
    }

    fetchInProgressRef.current = true;
    lastFetchRef.current = now;

    if (showLoading) {
      setIsRefreshing(true);
    }

    try {
      if (!supabase) {
        console.error('[Campaigns] Supabase client not available');
        return [];
      }
      // RLS: requires authenticated session; use user_id filter
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[Campaigns] Fetch error:', error.message, error);
        await persistCampaigns([]);
        return [];
      }

      const raw = (data || []) as Campaign[];
      const normalized = raw.map((campaign) => ({
        ...campaign,
        ...getMonotonicMetrics(
          campaign.id,
          campaign.views ?? 0,
          campaign.spend ?? 0,
          campaign.leads ?? 0,
          campaign.clicks ?? 0
        ),
      } as Campaign));
      
      await persistCampaigns(normalized);
      hydrateCampaignPublicUrls(normalized)
        .then((hydrated) => {
          const changed = hydrated.some(
            (campaign, index) => campaign.tiktok_public_url !== normalized[index]?.tiktok_public_url
          );
          if (changed) {
            void persistCampaigns(hydrated);
          }
        })
        .catch(() => {});
      setIsFirstLoad(false);
      return normalized;
    } catch (error: any) {
      console.error('Error fetching campaigns:', error);
      return [];
    } finally {
      fetchInProgressRef.current = false;
      setIsRefreshing(false);
    }
  }, [persistCampaigns, userId]);

  // Load cached data first, then fetch fresh
  useEffect(() => {
    if (!userId) {
      setCampaigns([]);
      setIsFirstLoad(false);
      return;
    }

    const loadCachedAndFetch = async () => {
      // Load from cache FIRST (instant)
      if (cacheKey) {
        try {
        const cached = await AsyncStorage.getItem(cacheKey);
          if (cached) {
            const parsed = JSON.parse(cached);
            const cacheAge = Date.now() - (parsed.timestamp || 0);
            
            // Use cache if less than 5 minutes old
            if (parsed.data && cacheAge < CACHE_EXPIRY) {
              const normalized = (parsed.data as Campaign[]).map((campaign) => ({
                ...campaign,
                ...getMonotonicMetrics(
                  campaign.id,
                  campaign.views ?? 0,
                  campaign.spend ?? 0,
                  campaign.leads ?? 0,
                  campaign.clicks ?? 0
                ),
              }));
              await persistCampaigns(normalized);
              setIsFirstLoad(false); // Hide loading immediately
            }
          }
        } catch (error) {
          console.warn('Failed to load cached campaigns:', error);
        }
      }

      // Then fetch fresh data in BACKGROUND (no loading spinner)
      void fetchCampaigns(false, true);
    };

    void loadCachedAndFetch();
  }, [userId, fetchCampaigns, cacheKey, persistCampaigns]);

  const refresh = useCallback(() => {
    return fetchCampaigns(true, true); // Show loading on manual refresh
  }, [fetchCampaigns]);

  const refreshSilent = useCallback(() => {
    return fetchCampaigns(false, true); // No spinner, but still fetch fresh data
  }, [fetchCampaigns]);

  const applyRealtimeUpdate = useCallback((payload: {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    new?: any;
    old?: any;
  }) => {
    setCampaigns((prev: Campaign[]) => {
      if (payload.eventType === 'DELETE') {
        const id = payload.old?.id;
        if (!id) return prev;
        return prev.filter((campaign) => campaign.id !== id);
      }

      const incoming = payload.new as Campaign | undefined;
      if (!incoming?.id) return prev;

      // Never show deleted_external in list — remove from state
      if ((incoming.status || '').toLowerCase() === 'deleted_external') {
        if (payload.eventType === 'UPDATE') {
          const next = prev.filter((c) => c.id !== incoming.id);
          setCampaignMemoryCache(userId, next);
          setCampaignsCache(next);
          return next;
        }
        if (payload.eventType === 'INSERT') return prev;
      }

      const index = prev.findIndex((campaign) => campaign.id === incoming.id);
      // Incoming row wins for budget/dates/status; only metrics are monotonic
      const metrics = getMonotonicMetrics(
        incoming.id,
        incoming.views ?? 0,
        incoming.spend ?? 0,
        incoming.leads ?? 0,
        incoming.clicks ?? 0
      );
      const merged = {
        ...(index >= 0 ? { ...prev[index], ...incoming } : { ...incoming }),
        views: metrics.views,
        spend: metrics.spend,
        leads: metrics.leads,
        clicks: metrics.clicks,
      };
      const next = [...prev];
      if (index >= 0) {
        next[index] = merged as Campaign;
      } else {
        next.unshift(merged);
      }
      setCampaignMemoryCache(userId, next);
      setCampaignsCache(next);
      if (cacheKey) {
        void AsyncStorage.setItem(
          cacheKey,
          JSON.stringify({
            data: next,
            timestamp: Date.now(),
          })
        ).catch(() => {});
      }
      const topResultsFallback = getCached<any[]>('topResults', []);
      prepareAndUpdateWidgetCampaigns(next, topResultsFallback).catch(() => {});
      return next;
    });
  }, [cacheKey, userId]);

  return {
    campaigns,
    isLoading: isFirstLoad && campaigns.length === 0,
    hasCached: campaigns.length > 0,
    isRefreshing,
    refresh,
    refreshSilent,
    applyRealtimeUpdate,
  };
}
