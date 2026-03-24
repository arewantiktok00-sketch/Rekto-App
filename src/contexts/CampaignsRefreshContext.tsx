import React, { createContext, useContext } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCampaigns } from '@/hooks/useCampaigns';

export type CampaignsRefreshContextValue = ReturnType<typeof useCampaigns>;

const defaultValue: CampaignsRefreshContextValue = {
  campaigns: [],
  isLoading: false,
  hasCached: false,
  isRefreshing: false,
  refresh: async () => {},
  refreshSilent: async () => {},
  applyRealtimeUpdate: () => {},
};

const CampaignsRefreshContext = createContext<CampaignsRefreshContextValue>(defaultValue);

export function useCampaignsRefresh(): CampaignsRefreshContextValue {
  return useContext(CampaignsRefreshContext);
}

/** Provides campaign list + refreshSilent so Dashboard and Campaigns can silent-refresh on focus. */
export function CampaignsRefreshProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const api = useCampaigns({ userId: user?.id ?? '' });
  return (
    <CampaignsRefreshContext.Provider value={api}>
      {children}
    </CampaignsRefreshContext.Provider>
  );
}
