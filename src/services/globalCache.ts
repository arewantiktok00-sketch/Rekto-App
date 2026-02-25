export interface GlobalCache {
  campaignsById: Map<string, any>;
  topResults: any[];
  notifications: any[];
  userLinks: any[];
}

const globalCache: GlobalCache = {
  campaignsById: new Map(),
  topResults: [],
  notifications: [],
  userLinks: [],
};

const cacheMap = new Map<string, any>();

export const getGlobalCache = () => globalCache;

export const getCached = <T>(key: string, fallback: T): T => {
  return cacheMap.has(key) ? (cacheMap.get(key) as T) : fallback;
};

export const setCached = (key: string, value: any) => {
  cacheMap.set(key, value);
};

export const hasCached = (key: string) => {
  return cacheMap.has(key);
};

export const clearCached = () => {
  cacheMap.clear();
  globalCache.campaignsById.clear();
  globalCache.topResults = [];
  globalCache.notifications = [];
  globalCache.userLinks = [];
};

export const setCampaignsCache = (campaigns: any[]) => {
  if (!Array.isArray(campaigns)) return;
  campaigns.forEach((campaign) => {
    if (campaign?.id) {
      globalCache.campaignsById.set(campaign.id, campaign);
    }
  });
  setCached('campaigns', campaigns);
};

export const setTopResultsCache = (campaigns: any[]) => {
  if (Array.isArray(campaigns)) {
    globalCache.topResults = campaigns;
    setCached('topResults', campaigns);
  }
};

export const setNotificationsCache = (notifications: any[]) => {
  if (Array.isArray(notifications)) {
    globalCache.notifications = notifications;
    setCached('notifications', notifications);
  }
};

export const setUserLinksCache = (links: any[]) => {
  if (Array.isArray(links)) {
    globalCache.userLinks = links;
    setCached('user_links', links);
  }
};
