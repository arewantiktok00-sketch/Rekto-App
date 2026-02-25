/**
 * Monotonic Metrics Cache
 * Ensures metrics (views, spend, leads, clicks) never decrease
 * Prevents flickering when stale data arrives
 */

interface CachedMetrics {
  views: number;
  spend: number;
  leads: number;
  clicks: number;
  lastUpdated: number;
}

const metricsCache = new Map<string, CachedMetrics>();

const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

export function getMonotonicMetrics(
  campaignId: string,
  newViews: number,
  newSpend: number,
  newLeads: number,
  newClicks: number
): { views: number; spend: number; leads: number; clicks: number } {
  const cached = metricsCache.get(campaignId);
  const now = Date.now();

  // If cache is expired, reset it
  if (cached && now - cached.lastUpdated > CACHE_EXPIRY) {
    metricsCache.delete(campaignId);
  }

  const currentCached = metricsCache.get(campaignId);

  // Always take MAXIMUM of cached vs new (never decrease)
  const views = Math.max(currentCached?.views ?? 0, newViews ?? 0);
  const spend = Math.max(currentCached?.spend ?? 0, newSpend ?? 0);
  const leads = Math.max(currentCached?.leads ?? 0, newLeads ?? 0);
  const clicks = Math.max(currentCached?.clicks ?? 0, newClicks ?? 0);

  // Update cache
  metricsCache.set(campaignId, {
    views,
    spend,
    leads,
    clicks,
    lastUpdated: now,
  });

  return { views, spend, leads, clicks };
}

export function clearMetricsCache(campaignId?: string) {
  if (campaignId) {
    metricsCache.delete(campaignId);
  } else {
    metricsCache.clear();
  }
}
