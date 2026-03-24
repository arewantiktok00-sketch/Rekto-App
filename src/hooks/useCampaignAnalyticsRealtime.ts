import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useEffect, useRef } from 'react';

interface UseCampaignAnalyticsRealtimeOptions {
  campaignId: string | undefined;
  enabled?: boolean;
  onUpdate?: (payload: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new?: any; old?: any }) => void;
}

/**
 * Supabase Realtime subscription for campaign_analytics table.
 * Channel: analytics-${campaignId}, filter: campaign_id=eq.${campaignId}.
 * Exponential backoff on CHANNEL_ERROR: 1s, 2s, 4s, 8s, max 15s.
 */
export const useCampaignAnalyticsRealtime = ({
  campaignId,
  enabled = true,
  onUpdate,
}: UseCampaignAnalyticsRealtimeOptions) => {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onUpdateRef = useRef(onUpdate);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    if (!enabled || !campaignId) {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      retryCountRef.current = 0;
      if (channelRef.current && supabase) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    const subscribe = () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      if (channelRef.current && supabase) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      const channelName = `analytics-${campaignId}`;
      if (__DEV__) {
        console.log('[Realtime] Setting up campaign analytics subscription:', channelName);
      }

      if (!supabase) return;

      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'campaign_analytics',
            filter: `campaign_id=eq.${campaignId}`,
          },
          (payload) => {
            if (__DEV__) {
              console.log('[Realtime] Campaign analytics update:', payload.eventType);
            }
            onUpdateRef.current?.({
              eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
              new: payload.new,
              old: payload.old,
            });
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            retryCountRef.current = 0;
          } else if (status === 'CHANNEL_ERROR') {
            const retryDelay = Math.min(1000 * 2 ** retryCountRef.current, 15000);
            retryCountRef.current += 1;
            if (__DEV__) {
              console.warn('[Realtime] Analytics channel error - retrying in', retryDelay, 'ms');
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
    };

    subscribe();

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      retryCountRef.current = 0;
      if (channelRef.current && supabase) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [campaignId, enabled]);
};
