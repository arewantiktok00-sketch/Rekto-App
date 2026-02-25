import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useEffect, useRef } from 'react';

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

  useEffect(() => {
    if (!enabled || (!userId && !campaignId)) {
      // Clean up if disabled
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
      // Clear any pending retry
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }

      // Remove previous channel if any
      if (channelRef.current && supabase) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      // Create realtime subscription for this user's campaigns
      const channelName = campaignId ? `campaign-${campaignId}` : `user-campaigns-${userId}`;
      const filter = campaignId ? `id=eq.${campaignId}` : `user_id=eq.${userId}`;

      if (__DEV__) {
        console.log('[Realtime] Setting up campaign subscription:', channelName);
      }

      if (!supabase) {
        return;
      }

      const channel = supabase
        .channel(channelName) // Stable channel name
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'campaigns',
            filter,
          },
          (payload) => {
            if (__DEV__) {
              console.log('[Realtime] Campaign update:', payload.eventType, payload.new?.id || payload.old?.id);
            }
            
            // Use ref to avoid stale closure
            onUpdateRef.current?.({
              eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
              new: payload.new,
              old: payload.old,
            });
          }
        )
        .subscribe((status) => {
          if (__DEV__) {
            console.log('[Realtime] Subscription status:', status);
          }
          
          if (status === 'SUBSCRIBED') {
            retryCountRef.current = 0;
          } else if (status === 'CHANNEL_ERROR') {
            // Backoff retry to avoid spamming logs
            const retryDelay = Math.min(1000 * (2 ** retryCountRef.current), 15000);
            retryCountRef.current += 1;
            if (__DEV__) {
              console.warn('[Realtime] Channel error - retrying in', retryDelay, 'ms');
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
        if (__DEV__) {
          console.log('[Realtime] Cleaning up campaign subscription');
        }
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, campaignId, enabled]);
};
