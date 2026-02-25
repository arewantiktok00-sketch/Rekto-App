import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useEffect, useRef } from 'react';

interface UseAppSettingsRealtimeOptions {
  onUpdate?: (payload: { new: any; old: any; eventType: string }) => void;
  enabled?: boolean;
  settingsKey?: string; // If omitted, listens to all keys
}

/**
 * Real-time subscription hook for app_settings table.
 * Listens for changes to app settings (pricing, promo banner, etc.) and triggers callbacks.
 * 
 * IMPORTANT: Uses refs for callbacks to avoid stale closures and unnecessary resubscriptions.
 */
export function useAppSettingsRealtime(options: UseAppSettingsRealtimeOptions = {}) {
  const { onUpdate, enabled = true, settingsKey } = options;
  const channelRef = useRef<RealtimeChannel | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);
  
  // Use ref for callback to avoid stale closures
  const onUpdateRef = useRef(onUpdate);
  
  // Keep the callback ref updated without triggering resubscription
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    if (!enabled) return;

    const channelName = settingsKey
      ? `app-settings-realtime-${settingsKey}`
      : 'app-settings-realtime-all';

    const subscribe = () => {
      // Clear pending retry
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }

      // Clean up existing subscription
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      console.log(`[Realtime] Setting up app_settings subscription: ${channelName}`);

      const filter = settingsKey ? `key=eq.${settingsKey}` : undefined;

      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to INSERT/UPDATE/DELETE for instant updates
            schema: 'public',
            table: 'app_settings',
            ...(filter ? { filter } : {}),
          },
          (payload) => {
            console.log('[Realtime] App settings update received:', {
              eventType: payload.eventType,
              key: (payload.new as any)?.key,
              updated_at: (payload.new as any)?.updated_at,
            });
            
            // Call the latest callback via ref - never stale
            onUpdateRef.current?.(payload);
          }
        )
        .subscribe((status) => {
          console.log(`[Realtime] App settings subscription status for ${channelName}: ${status}`);

          if (status === 'SUBSCRIBED') {
            retryCountRef.current = 0;
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            const retryDelay = Math.min(1000 * (2 ** retryCountRef.current), 15000);
            retryCountRef.current += 1;
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
      console.log(`[Realtime] Cleaning up app_settings subscription: ${channelName}`);
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      retryCountRef.current = 0;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enabled, settingsKey]); // Note: onUpdate NOT in deps - using ref instead

  // Manual refresh function to force re-subscribe
  const reconnect = () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  };

  return { reconnect };
}
