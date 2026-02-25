import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, supabaseRead } from '@/integrations/supabase/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMonotonicMetrics } from '@/utils/metricsCache';
import { getCampaignMemoryCache, setCampaignMemoryCache } from '@/services/campaignCache';
import { setCampaignsCache, getCached } from '@/services/globalCache';

const CACHE_KEY = 'campaigns_cache';
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes
const REJECTED_HIDE_AFTER_MS = 30 * 60 * 1000; // 30 minutes

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
  filter?: 'all' | 'active' | 'pending' | 'completed' | 'rejected';
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useCampaigns(options: UseCampaignsOptions) {
  const { userId, filter = 'all', autoRefresh = true, refreshInterval = 30000 } = options;
  const initialFromMemory = userId ? getCampaignMemoryCache(userId) : [];
  const cachedCampaigns = getCached<Campaign[]>('campaigns', []);
  const initialSeed = initialFromMemory.length > 0 ? initialFromMemory : cachedCampaigns;
  const filteredInitial =
    filter === 'all'
      ? initialSeed
      : initialSeed.filter((campaign) => {
          const status = (campaign.status || '').toLowerCase();
          if (filter === 'active') {
            return ['active', 'running'].includes(status);
          }
          if (filter === 'pending') {
            return ['pending', 'waiting_for_admin', 'in_review', 'scheduled'].includes(status);
          }
          if (filter === 'completed') {
            return ['completed', 'paused'].includes(status);
          }
          if (filter === 'rejected') {
            return ['rejected', 'failed'].includes(status);
          }
          return true;
        });
  const [campaigns, setCampaigns] = useState<Campaign[]>(filteredInitial);
  const [isFirstLoad, setIsFirstLoad] = useState(filteredInitial.length === 0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const fetchInProgressRef = useRef(false);
  const lastFetchRef = useRef(0);
  const MIN_FETCH_INTERVAL = 2000;
  const cacheKey = userId ? `${CACHE_KEY}_${userId}_${filter}` : null;

  const filterStaleRejections = useCallback((items: Campaign[]) => {
    const now = Date.now();
    return items.filter((campaign) => {
      const status = (campaign.status || '').toLowerCase();
      if (status !== 'rejected' && status !== 'failed') {
        return true;
      }
      const rawTimestamp =
        (campaign as any).status_updated_at ||
        campaign.updated_at ||
        campaign.created_at;
      const timestamp = rawTimestamp ? new Date(rawTimestamp).getTime() : 0;
      if (!timestamp || Number.isNaN(timestamp)) {
        return true;
      }
      return now - timestamp < REJECTED_HIDE_AFTER_MS;
    });
  }, []);

  const fetchCampaigns = useCallback(async (showLoading = false) => {
    if (!userId || fetchInProgressRef.current) return;

    const now = Date.now();
    if (now - lastFetchRef.current < MIN_FETCH_INTERVAL) {
      return;
    }

    fetchInProgressRef.current = true;
    lastFetchRef.current = now;

    if (showLoading) {
      setIsRefreshing(true);
    }

    try {
      let query = supabaseRead
        .from('campaigns')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        if (filter === 'active') {
          query = query.in('status', ['active', 'running']);
        } else if (filter === 'pending') {
          query = query.in('status', ['pending', 'waiting_for_admin', 'in_review', 'scheduled']);
        } else if (filter === 'completed') {
          query = query.in('status', ['completed', 'paused']);
        } else if (filter === 'rejected') {
          query = query.in('status', ['rejected', 'failed']);
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching campaigns:', error);
        return [];
      }

      const campaignsData = filterStaleRejections((data || []) as Campaign[]);
      const normalized = campaignsData.map((campaign) => ({
        ...campaign,
        ...getMonotonicMetrics(
          campaign.id,
          campaign.views ?? 0,
          campaign.spend ?? 0,
          campaign.leads ?? 0,
          campaign.clicks ?? 0
        ),
      }));
      
      // Cache to AsyncStorage
      if (cacheKey) {
        try {
          await AsyncStorage.setItem(cacheKey, JSON.stringify({
            data: normalized,
            timestamp: Date.now(),
          }));
        } catch (cacheError) {
          console.warn('Failed to cache campaigns:', cacheError);
        }
      }

      setCampaigns(normalized);
      if (filter === 'all') {
        setCampaignMemoryCache(userId, normalized);
        setCampaignsCache(normalized);
      }
      setIsFirstLoad(false);
      return normalized;
    } catch (error: any) {
      console.error('Error fetching campaigns:', error);
      return [];
    } finally {
      fetchInProgressRef.current = false;
      setIsRefreshing(false);
    }
  }, [userId, filter]);

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
              const filtered = filterStaleRejections(parsed.data as Campaign[]);
              const normalized = filtered.map((campaign) => ({
                ...campaign,
                ...getMonotonicMetrics(
                  campaign.id,
                  campaign.views ?? 0,
                  campaign.spend ?? 0,
                  campaign.leads ?? 0,
                  campaign.clicks ?? 0
                ),
              }));
              setCampaigns(normalized);
              if (filter === 'all') {
                setCampaignMemoryCache(userId, normalized);
                setCampaignsCache(normalized);
              }
              setIsFirstLoad(false); // Hide loading immediately
            }
          }
        } catch (error) {
          console.warn('Failed to load cached campaigns:', error);
        }
      }

      // Then fetch fresh data in BACKGROUND (no loading spinner)
      fetchCampaigns(false);
    };

    loadCachedAndFetch();
  }, [userId, filter, fetchCampaigns, cacheKey]);

  // Auto-refresh in background
  useEffect(() => {
    if (!autoRefresh || !userId) return;

    let timeout: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      const jitter = 5000 + Math.random() * 5000;
      timeout = setTimeout(() => {
        fetchCampaigns(false);
        schedule();
      }, jitter);
    };

    schedule();

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [autoRefresh, userId, fetchCampaigns]);

  // Real-time subscription
  useEffect(() => {
    if (!userId || !supabase) return;

    const channel = supabase
      .channel(`user-campaigns-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'campaigns',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          // Silent background refresh on change
          fetchCampaigns(false);
        }
      )
      .subscribe();

    return () => {
      if (supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [userId, fetchCampaigns]);

  const refresh = useCallback(() => {
    return fetchCampaigns(true); // Show loading on manual refresh
  }, [fetchCampaigns]);

  const refreshSilent = useCallback(() => {
    return fetchCampaigns(false); // No spinner
  }, [fetchCampaigns]);

  const applyRealtimeUpdate = useCallback((payload: {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    new?: any;
    old?: any;
  }) => {
    setCampaigns((prev) => {
      if (payload.eventType === 'DELETE') {
        const id = payload.old?.id;
        if (!id) return prev;
        return prev.filter((campaign) => campaign.id !== id);
      }

      const incoming = payload.new as Campaign | undefined;
      if (!incoming?.id) return prev;

      const index = prev.findIndex((campaign) => campaign.id === incoming.id);
      const existing = index >= 0 ? prev[index] : null;
      const merged = {
        ...incoming,
        views: Math.max(existing?.views || 0, incoming.views || 0),
        spend: Math.max(existing?.spend || 0, incoming.spend || 0),
        leads: Math.max(existing?.leads || 0, incoming.leads || 0),
      };
      const next = [...prev];
      if (index >= 0) {
        next[index] = { ...next[index], ...merged };
      } else {
        next.unshift(merged);
      }
      setCampaignsCache(next);
      return filterStaleRejections(next);
    });
  }, [filterStaleRejections]);

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
