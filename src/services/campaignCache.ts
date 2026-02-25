const campaignMemoryCache = new Map<string, any[]>();

export const setCampaignMemoryCache = (userId: string, campaigns: any[]) => {
  if (!userId) return;
  campaignMemoryCache.set(userId, campaigns || []);
};

export const getCampaignMemoryCache = (userId: string): any[] => {
  if (!userId) return [];
  return campaignMemoryCache.get(userId) || [];
};

export const hasCampaignMemoryCache = (userId: string): boolean => {
  if (!userId) return false;
  return campaignMemoryCache.has(userId);
};
