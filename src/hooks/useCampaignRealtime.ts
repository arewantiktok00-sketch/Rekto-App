import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef } from 'react';

interface UseCampaignRealtimeOptions {
  userId?: string;
  campaignId?: string;
  enabled?: boolean;
  onUpdate?: (payload: {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    new?: any;
    old?: any;
  }) => void;
}

/**
 * Independent Supabase Realtime subscription for campaigns
 * Works even when Lovable web app is closed
 */
export const useCampaignRealtime = ({
  userId,
  campaignId,
  enabled = true,
  onUpdate,
}: UseCampaignRealtimeOptions) => {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onUpdateRef = useRef(onUpdate);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);

  // Keep callback ref updated to prevent stale closures
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  const cleanup = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    if (channelRef.current && supabase) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  const subscribe = useCallback(() => {
    if (!enabled || (!userId && !campaignId)) return;
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    if (channelRef.current && supabase) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channelName = campaignId ? `campaign-${campaignId}` : `user-campaigns-${userId}`;
    const filter = campaignId ? `id=eq.${campaignId}` : `user_id=eq.${userId}`;
    if (__DEV__) {
      console.log('[Realtime] Setting up campaign subscription:', channelName);
    }
    if (!supabase) return;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'campaigns',
          filter,
        },
        (payload) => {
          retryCountRef.current = 0;
          if (__DEV__) {
            console.log('[Realtime] Campaign update:', payload.eventType, payload.new?.id || payload.old?.id);
          }
          onUpdateRef.current?.({
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            new: payload.new,
            old: payload.old,
          });
        }
      )
      .subscribe((status, err) => {
        if (__DEV__) {
          console.log('[Realtime] Subscription status:', status, err?.message || '');
        }
        if (status === 'SUBSCRIBED') {
          retryCountRef.current = 0;
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          const retryDelay = Math.min(1000 * (2 ** retryCountRef.current), 15000);
          retryCountRef.current += 1;
          if (__DEV__) {
            console.warn('[Realtime] Channel error - retrying in', retryDelay, 'ms', err?.message);
          }
          if (!retryTimeoutRef.current) {
            retryTimeoutRef.current = setTimeout(() => {
              retryTimeoutRef.current = null;
              subscribe();
            }, retryDelay);
          }
        }
      });

    channelRef.current = channel;
  }, [userId, campaignId, enabled]);

  useEffect(() => {
    if (!enabled || (!userId && !campaignId)) {
      cleanup();
      retryCountRef.current = 0;
      return;
    }
    cleanup();
    retryCountRef.current = 0;
    subscribe();
    return cleanup;
  }, [userId, campaignId, enabled, subscribe, cleanup]);

  const reconnect = useCallback(() => {
    retryCountRef.current = 0;
    cleanup();
    subscribe();
  }, [cleanup, subscribe]);

  return { reconnect };
};
