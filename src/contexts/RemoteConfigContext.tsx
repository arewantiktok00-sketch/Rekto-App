import { supabase, supabaseRead } from '@/integrations/supabase/client';
import { AppSettings, DEFAULT_SETTINGS } from '@/types/remote-config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';

const CACHE_KEY = 'app_settings_cache';

interface RemoteConfigContextType {
  config: AppSettings | null;
  isLoading: boolean;
  // Legacy aliases for backward compatibility
  settings: AppSettings;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  isFeatureEnabled: (feature: keyof AppSettings['features']) => boolean;
  isMaintenanceMode: boolean;
  maintenanceMessage: string;
  bannerConfig: AppSettings['ui_text'];
  realtimeStatus: 'SUBSCRIBED' | 'CHANNEL_ERROR' | 'TIMED_OUT' | 'CLOSED' | null;
}

const RemoteConfigContext = createContext<RemoteConfigContextType | undefined>(undefined);

export const RemoteConfigProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<'SUBSCRIBED' | 'CHANNEL_ERROR' | 'TIMED_OUT' | 'CLOSED' | null>(null);
  const configChannelRef = useRef<any>(null);
  
  // Legacy: settings always returns config or defaults
  const settings = config || DEFAULT_SETTINGS;
  const loading = isLoading;

  // Load cached settings INSTANTLY on mount (non-blocking)
  useEffect(() => {
    const loadCached = async () => {
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
          const cachedValue = JSON.parse(cached);
          const mergedSettings: AppSettings = {
            features: { ...DEFAULT_SETTINGS.features, ...(cachedValue.features || {}) },
            objectives: { ...DEFAULT_SETTINGS.objectives, ...(cachedValue.objectives || {}) },
            maintenance: { ...DEFAULT_SETTINGS.maintenance, ...(cachedValue.maintenance || {}) },
            ui_text: { ...DEFAULT_SETTINGS.ui_text, ...(cachedValue.ui_text || {}) },
            discount: { ...DEFAULT_SETTINGS.discount, ...(cachedValue.discount || {}) },
            pricing: { ...DEFAULT_SETTINGS.pricing, ...(cachedValue.pricing || {}) },
            update: { ...DEFAULT_SETTINGS.update, ...(cachedValue.update || {}) },
          };
          setConfig(mergedSettings);
          setIsLoading(false); // Show UI immediately with cached data
          console.log('[RemoteConfig] Loaded cached settings');
        }
      } catch (e) {
        console.warn('[RemoteConfig] Cache load failed:', e);
        // Continue with defaults
      }
    };
    loadCached();
  }, []);

  // Fetch settings from API
  const fetchConfig = useCallback(async () => {
    try {
      setError(null);
      
      // Try edge function first
      try {
        const { data, error: edgeError } = await supabase.functions.invoke('app-settings', {
          body: { action: 'get', key: 'global' }
        });

        if (!edgeError && data?.settings?.value) {
          // Merge with defaults to handle missing keys gracefully
          const mergedSettings: AppSettings = {
            features: { ...DEFAULT_SETTINGS.features, ...(data.settings.value.features || {}) },
            objectives: { ...DEFAULT_SETTINGS.objectives, ...(data.settings.value.objectives || {}) },
            maintenance: { ...DEFAULT_SETTINGS.maintenance, ...(data.settings.value.maintenance || {}) },
            ui_text: { ...DEFAULT_SETTINGS.ui_text, ...(data.settings.value.ui_text || {}) },
            discount: { ...DEFAULT_SETTINGS.discount, ...(data.settings.value.discount || {}) },
            pricing: { ...DEFAULT_SETTINGS.pricing, ...(data.settings.value.pricing || {}) },
            update: { ...DEFAULT_SETTINGS.update, ...(data.settings.value.update || {}) },
          };
          setConfig(mergedSettings);
          setIsLoading(false);
          // Cache for instant load next time
          await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data.settings.value));
          console.log('[RemoteConfig] Settings updated from edge function');
          return;
        }
      } catch (edgeErr) {
        console.warn('[RemoteConfig] Edge function failed, trying direct query:', edgeErr);
      }

      // Fallback to direct query
      const { data, error: fetchError } = await supabaseRead
        .from('app_settings')
        .select('value')
        .eq('key', 'global')
        .single();

      if (fetchError) {
        // If table doesn't exist or no record found, use defaults
        if (fetchError.code === 'PGRST116' || fetchError.message?.includes('does not exist')) {
          console.warn('[RemoteConfig] app_settings table not found, using defaults');
          setConfig(DEFAULT_SETTINGS);
          setIsLoading(false);
          return;
        }
        throw fetchError;
      }

      if (data?.value) {
        // Merge with defaults to handle missing keys gracefully
      const mergedSettings: AppSettings = {
            features: { ...DEFAULT_SETTINGS.features, ...(data.value.features || {}) },
            objectives: { ...DEFAULT_SETTINGS.objectives, ...(data.value.objectives || {}) },
            maintenance: { ...DEFAULT_SETTINGS.maintenance, ...(data.value.maintenance || {}) },
            ui_text: { ...DEFAULT_SETTINGS.ui_text, ...(data.value.ui_text || {}) },
            discount: { ...DEFAULT_SETTINGS.discount, ...(data.value.discount || {}) },
            pricing: { ...DEFAULT_SETTINGS.pricing, ...(data.value.pricing || {}) },
        update: { ...DEFAULT_SETTINGS.update, ...(data.value.update || {}) },
          };
        setConfig(mergedSettings);
        setIsLoading(false);
        // Cache for instant load next time
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data.value));
        console.log('[RemoteConfig] Settings updated from direct query');
      } else {
        setConfig(DEFAULT_SETTINGS);
        setIsLoading(false);
      }
    } catch (err) {
      console.warn('[RemoteConfig] Fetch failed, using cached/defaults:', err);
      setError(err instanceof Error ? err.message : 'Failed to load settings');
      setConfig(DEFAULT_SETTINGS);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // 1. Initial fetch on mount
    fetchConfig();
    
    // 2. Realtime subscription - instant updates when app_settings table changes
    if (supabase) {
      if (configChannelRef.current) {
        supabase.removeChannel(configChannelRef.current);
      }

      configChannelRef.current = supabase
        .channel('app-settings-global')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'app_settings',
            filter: 'key=eq.global',
          },
          async (payload) => {
            console.log('[RemoteConfig] Realtime update received:', payload);
            if (payload.new && 'value' in payload.new) {
              const newValue = payload.new.value as Partial<AppSettings>;
              const mergedSettings: AppSettings = {
                features: { ...DEFAULT_SETTINGS.features, ...(newValue.features || {}) },
                objectives: { ...DEFAULT_SETTINGS.objectives, ...(newValue.objectives || {}) },
                maintenance: { ...DEFAULT_SETTINGS.maintenance, ...(newValue.maintenance || {}) },
                ui_text: { ...DEFAULT_SETTINGS.ui_text, ...(newValue.ui_text || {}) },
                discount: { ...DEFAULT_SETTINGS.discount, ...(newValue.discount || {}) },
                pricing: { ...DEFAULT_SETTINGS.pricing, ...(newValue.pricing || {}) },
              };
              setConfig(mergedSettings);
              // Update cache for next app launch
              await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(payload.new.value));
            }
          }
        )
        .subscribe((status) => {
          console.log('[RemoteConfig] Realtime subscription status:', status);
          setRealtimeStatus(status);
          if (status === 'SUBSCRIBED') {
            console.log('[RemoteConfig] ✅ Realtime is active');
          }
        });

      return () => {
        if (configChannelRef.current) {
          supabase.removeChannel(configChannelRef.current);
          configChannelRef.current = null;
        }
      };
    }
  }, [fetchConfig]);

  const isFeatureEnabled = useCallback(
    (feature: keyof AppSettings['features']): boolean => {
      return settings.features[feature] ?? true;
    },
    [settings.features]
  );

  const value: RemoteConfigContextType = {
    config,
    isLoading,
    // Legacy aliases
    settings,
    loading: isLoading,
    error,
    refetch: fetchConfig,
    isFeatureEnabled,
    isMaintenanceMode: settings.maintenance.enabled,
    maintenanceMessage: settings.maintenance.message,
    bannerConfig: settings.ui_text,
    realtimeStatus,
  };

  return (
    <RemoteConfigContext.Provider value={value}>
      {children}
    </RemoteConfigContext.Provider>
  );
};

export const useRemoteConfig = (): RemoteConfigContextType => {
  const context = useContext(RemoteConfigContext);
  if (!context) {
    throw new Error('useRemoteConfig must be used within RemoteConfigProvider');
  }
  return context;
};
