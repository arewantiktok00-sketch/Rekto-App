import { supabase } from '@/integrations/supabase/client';
import { useCallback, useEffect, useRef, useState } from 'react';

const MIN_DEBOUNCE_MS = 2000;
let lastInvokeAt = 0;

export interface UseTikTokSyncOptions {
  campaignId?: string;
  autoSync?: boolean;
  pollingInterval?: number;
  onSyncComplete?: (results: any[]) => void;
}

/**
 * TikTok sync with optional polling and onSyncComplete.
 * - Auto-sync on mount when autoSync is true.
 * - Polling at pollingInterval (no toasts on auto/polling).
 * - refresh(showToast) for manual pull-to-refresh; toast only when showToast and synced_count > 0.
 * - "No campaigns found" / "No active advertiser" are treated as success (call onSyncComplete([])).
 */
export function useTikTokSync(options: UseTikTokSyncOptions = {}) {
  const {
    campaignId,
    autoSync = true,
    pollingInterval = 10000,
    onSyncComplete,
  } = options;

  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onSyncCompleteRef = useRef(onSyncComplete);
  const syncingRef = useRef(false);
  onSyncCompleteRef.current = onSyncComplete;
  syncingRef.current = syncing;

  const sync = useCallback(async (showToast = false) => {
    const now = Date.now();
    if (now - lastInvokeAt < MIN_DEBOUNCE_MS && !showToast) {
      if (__DEV__) console.log('[TikTokSync] Debounced');
      onSyncCompleteRef.current?.([]);
      return;
    }
    if (syncingRef.current) return;
    syncingRef.current = true;
    lastInvokeAt = now;
    setSyncing(true);

    try {
      const body = campaignId ? { campaignId } : { syncAll: true };
      const { data, error } = await supabase.functions.invoke('tiktok-sync-status', { body });

      if (error) {
        const msg = (error as any)?.message || '';
        if (
          msg.includes('No campaigns found') ||
          msg.includes('No active advertiser')
        ) {
          setLastSynced(new Date());
          onSyncCompleteRef.current?.([]);
          return;
        }
        throw error;
      }

      if (data?.success) {
        setLastSynced(new Date());
        // No success toast for any refresh (auto or manual pull) — per project rules
        onSyncCompleteRef.current?.(data?.results ?? []);
      }
    } catch (err) {
      if (__DEV__) console.warn('[TikTokSync] Error:', err);
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [campaignId]);

  useEffect(() => {
    if (autoSync) sync(false);
  }, [autoSync]);

  useEffect(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    if (pollingInterval > 0 && autoSync) {
      pollingRef.current = setInterval(() => sync(false), pollingInterval);
    }
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [pollingInterval, autoSync, sync]);

  const refresh = useCallback(() => sync(true), [sync]);

  return { syncing, lastSynced, sync, refresh };
}

/**
 * One-off invoke for callers that don't use the hook (e.g. legacy manual refresh).
 * 2s minimum debounce between calls.
 */
export async function invokeTikTokSync(options: {
  syncAll?: boolean;
  campaignId?: string;
}): Promise<any> {
  const now = Date.now();
  if (now - lastInvokeAt < MIN_DEBOUNCE_MS) {
    if (__DEV__) console.log('[TikTokSync] Debounced (min 2s between calls)');
    return null;
  }
  lastInvokeAt = now;
  try {
    const { data, error } = await supabase.functions.invoke('tiktok-sync-status', {
      body: options.syncAll ? { syncAll: true } : { campaignId: options.campaignId },
    });
    if (error) throw error;
    return data;
  } catch (err) {
    if (__DEV__) console.warn('[TikTokSync] Invoke failed:', err);
    throw err;
  }
}
