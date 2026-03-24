import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useRemoteConfig } from './contexts/RemoteConfigContext';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { RemoteConfigProvider } from './contexts/RemoteConfigContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { safeQuery, supabase } from './integrations/supabase/client';
import { initializeOneSignal, logoutOneSignal } from './lib/onesignal';
import { ErrorBoundary } from './components/ErrorBoundary';
import RootNavigator from './navigation/RootNavigator';
import { AnimatedSplash } from './screens/AnimatedSplash';
import { syncCampaignsWithThumbnails } from './services/campaignSync';
import { syncFeaturedCampaigns } from './services/featuredCampaignSync';
import { setCached, setCampaignsCache, setNotificationsCache, setTopResultsCache, setUserLinksCache } from './services/globalCache';
import { syncUserLinks } from './services/linksSync';
import { syncNotifications } from './services/notificationsSync';
import { getFontFamilyWithWeight } from './utils/fonts';
import { getExchangeRateFromSettings, fetchExchangeRate } from './lib/exchangeRate';
import { prepareAndUpdateWidgetCampaigns, incrementAppOpenCount, updateWidgetBalance } from './utils/widgetBridge';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, Image, InteractionManager, LogBox, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { toastConfig } from './components/Toast/ToastConfig';
import { enableScreens } from 'react-native-screens';

// Optional: hide native splash when app is ready (no-op if react-native-bootsplash not linked)
const hideNativeSplash = () => {
  try {
    const BootSplash = require('react-native-bootsplash').default;
    if (BootSplash?.hide) BootSplash.hide({ fade: true }).catch(() => {});
  } catch (_) {
    // RNBootSplash native module not in binary — ignore
  }
};
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// OneSignal init happens in lib/onesignal with safe guards.

// Suppress deprecation warnings from third-party libraries
if (__DEV__) {
  LogBox.ignoreLogs([
    'props.pointerEvents is deprecated. Use style.pointerEvents',
    'useNativeDriver',
    'AuthApiError: Invalid Refresh Token',
    'Refresh Token Not Found',
  ]);
}

// Prevent reload crashes from screen transition events
enableScreens(false);

// Native splash (BootSplash) stays visible until BootSplash.hide() is called when app is ready.

// Rules of Hooks: ALL hooks must be declared at the top of AppContent, BEFORE any conditional return.
// Do not add hooks after the "if (!appReady || showAnimatedSplash) return ..." below.

function AppContent() {
  const { user } = useAuth();
  const { isDark, colors } = useTheme();
  const { language, isRTL } = useLanguage();
  const queryClient = useQueryClient();
  const { refetch: refetchRemoteConfig } = useRemoteConfig();
  const [showAnimatedSplash, setShowAnimatedSplash] = useState(true);
  const [appReady, setAppReady] = useState(false);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [splashAnimationDone, setSplashAnimationDone] = useState(false);
  const lastSyncRef = useRef<number>(0);
  const prefetchRef = useRef(false);

  // TEMPORARY: Verify Reanimated works (remove after confirming no crash)
  useEffect(() => {
    try {
      const R = require('react-native-reanimated');
      const ok = typeof R.useSharedValue === 'function';
      console.log('[CHECK] Reanimated OK:', ok);
    } catch (e) {
      console.error('[CHECK] Reanimated Failed:', e);
    }
  }, []);
  const prefetchAllData = useCallback(async (userId: string) => {
    try {
      const results = await Promise.allSettled([
        safeQuery((client) => client.from('campaigns').select('*').eq('user_id', userId).order('created_at', { ascending: false })),
        safeQuery((client) => client.from('user_links').select('*').eq('user_id', userId).order('created_at', { ascending: false })),
        safeQuery((client) => client.from('link_social_data').select('*').eq('user_id', userId)),
        safeQuery((client) => client.from('client_links').select('*').eq('user_id', userId).order('display_order', { ascending: true })),
        safeQuery((client) => client.from('notifications').select('*').eq('user_id', userId).eq('is_read', false).limit(50)),
        safeQuery((client) => client.from('profiles').select('*').eq('user_id', userId).single()),
        safeQuery((client) => client.from('app_settings').select('*').eq('key', 'global').single()),
        safeQuery((client) => client.from('transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20)),
        safeQuery((client) => client.from('faqs').select('*').eq('is_active', true).order('display_order')),
        safeQuery((client) => client.from('tutorials').select('*').eq('is_active', true).order('display_order')),
        supabase.functions.invoke('featured-campaign', { body: { action: 'get_all_ranked' } }),
      ]);

      const getData = (index: number, fallback: any) => {
        const result = results[index];
        return result.status === 'fulfilled' ? result.value?.data ?? fallback : fallback;
      };

      const campaigns = getData(0, []);
      const userLinks = getData(1, []);
      const linkSocialData = getData(2, []);
      const clientLinks = getData(3, []);
      const notifications = getData(4, []);
      const profile = getData(5, null);
      const appSettings = getData(6, null);
      const transactions = getData(7, []);
      const faqs = getData(8, []);
      const tutorials = getData(9, []);
      const topResultsMonths = results[10].status === 'fulfilled' ? (results[10].value as any)?.data?.months ?? [] : [];

      setCached('campaigns', campaigns);
      setCached('user_links', userLinks);
      setCached('link_social_data', linkSocialData);
      setCached('client_links', clientLinks);
      if (Array.isArray(clientLinks) && clientLinks.length > 0) {
        const byLinkId: Record<string, any[]> = {};
        clientLinks.forEach((link: any) => {
          const linkId = link?.link_id;
          if (!linkId) return;
          if (!byLinkId[linkId]) byLinkId[linkId] = [];
          byLinkId[linkId].push(link);
        });
        Object.entries(byLinkId).forEach(([linkId, items]) => {
          setCached(`client_links_${linkId}`, items);
        });
      }
      setCached('notifications', notifications);
      setCached('profile', profile);
      setCached('app_settings', appSettings);
      setCached('transactions', transactions);
      setCached('faqs', faqs);
      setCached('tutorials', tutorials);
      setCached('top_results_months', topResultsMonths);

      setCampaignsCache(campaigns);
      setUserLinksCache(userLinks);
      setNotificationsCache(notifications);

      const featuredSync = await syncFeaturedCampaigns().catch(() => ({ topResults: [], featured: null }));
      const topResults = featuredSync?.topResults ?? [];
      if (topResults.length > 0) {
        setTopResultsCache(topResults);
        setCached('topResults', topResults);
      }
      await prepareAndUpdateWidgetCampaigns(campaigns, topResults).catch(() => {});

      const availUsd = profile?.wallet_balance ?? 0;
      const pendingRes = await safeQuery((client) =>
        client.from('balance_requests').select('amount_iqd').eq('user_id', userId).eq('status', 'pending')
      );
      let pendIqd = 0;
      if (pendingRes?.data?.length) {
        pendIqd = (pendingRes.data as { amount_iqd?: string }[]).reduce(
          (s, r) => s + (Number(String(r.amount_iqd ?? '').replace(/,/g, '')) || 0),
          0
        );
      }
      const rate = getExchangeRateFromSettings(appSettings);
      updateWidgetBalance(Math.floor(availUsd * rate), pendIqd);

      const thumbnailUrls = (campaigns || [])
        .filter((c: any) => c?.thumbnail_url)
        .map((c: any) => c.thumbnail_url as string);
      if (thumbnailUrls.length > 0) {
        await Promise.allSettled(thumbnailUrls.map((url: string) => Image.prefetch(url)));
      }
    } catch {
      // Silent fail
    }
  }, []);

  // Prefetch all data during splash (non-blocking)
  useEffect(() => {
    if (!appReady || !showAnimatedSplash || !user?.id || prefetchRef.current) return;
    prefetchRef.current = true;
    void prefetchAllData(user.id);
  }, [appReady, showAnimatedSplash, user?.id, prefetchAllData]);

  // Fonts are linked natively (Info.plist UIAppFonts / Xcode). Mark app ready and hide native splash.
  useEffect(() => {
    const ready = () => {
      setFontsLoaded(true);
      setAppReady(true);
    };
    InteractionManager.runAfterInteractions(() => ready());
  }, []);

  useEffect(() => {
    if (appReady) {
      hideNativeSplash();
    }
  }, [appReady]);

  // Increment app open count and refresh balance widget when app becomes active
  useEffect(() => {
    if (!appReady) return;
    const refreshBalanceWidget = async () => {
      if (!user?.id) return;
      try {
        const rate = await fetchExchangeRate();
        const { data: profile } = await supabase.from('profiles').select('wallet_balance').eq('user_id', user.id).maybeSingle();
        const availUsd = profile?.wallet_balance ?? 0;
        const { data: pendingReqs } = await supabase.from('balance_requests').select('amount_iqd').eq('user_id', user.id).eq('status', 'pending');
        let pendIqd = 0;
        if (pendingReqs?.length) pendIqd = pendingReqs.reduce((s: number, r: { amount_iqd?: string }) => s + (Number(String(r.amount_iqd ?? '').replace(/,/g, '')) || 0), 0);
        updateWidgetBalance(Math.floor(availUsd * rate), pendIqd);
      } catch {}
    };
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        void incrementAppOpenCount();
        void refreshBalanceWidget();
      }
    });
    void incrementAppOpenCount();
    void refreshBalanceWidget();
    return () => sub.remove();
  }, [appReady, user?.id]);

  useEffect(() => {
    const fontFamily = getFontFamilyWithWeight(language as 'ckb' | 'ar', 'regular');
    const textComponent = Text as any;
    const defaultStyle = textComponent.defaultProps?.style;
    textComponent.defaultProps = {
      ...textComponent.defaultProps,
      style: [{ fontFamily, ...(isRTL ? { fontWeight: '400' } : {}) }, defaultStyle],
    };

    if (!textComponent.__rektoWrapped) {
      const originalRender = textComponent.render;
      textComponent.render = function (...args: any[]) {
        const origin = originalRender.apply(this, args);
        const flattened = StyleSheet.flatten(origin.props?.style) || {};
        const { fontWeight, ...restStyle } = flattened;
        const safeWeight = isRTL ? '400' : fontWeight;
        return React.cloneElement(origin, {
          style: [{ fontFamily, ...(safeWeight ? { fontWeight: safeWeight } : {}) }, restStyle],
        });
      };
      textComponent.__rektoWrapped = true;
    }
  }, [language, isRTL]);

  useEffect(() => {
    const textInputComponent = TextInput as any;
    const defaultStyle = textInputComponent.defaultProps?.style;
    textInputComponent.defaultProps = {
      ...textInputComponent.defaultProps,
      style: [
        { textAlign: 'left', writingDirection: 'rtl' },
        defaultStyle,
      ],
    };
  }, []);

  useEffect(() => {
    if (user?.id) {
      initializeOneSignal(user.id).catch((error) => {
        console.log('OneSignal initialization failed:', error);
      });
    } else {
      logoutOneSignal();
    }
  }, [user]);

  const handleAnimatedSplashFinish = useCallback(() => {
    setSplashAnimationDone(true);
  }, []);

  // Auto-refresh when app comes to foreground (links, tutorials, campaigns, results, owner config)
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState !== 'active') return;
      refetchRemoteConfig().catch(() => {});
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: ['user-links', user.id] });
      }
    };
    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [user?.id, queryClient, refetchRemoteConfig]);

  // Background sync when user becomes available (no UI changes)
  useEffect(() => {
    if (!user?.id) return;

    const run = async () => {
      const now = Date.now();
      if (now - lastSyncRef.current < 60000) return; // throttle to 1 min
      lastSyncRef.current = now;

      try {
        const timeout = <T,>(promise: Promise<T>, ms: number) =>
          Promise.race([
            promise,
            new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
          ]);

        const tasks: Promise<any>[] = [
          timeout(syncFeaturedCampaigns(), 3000).then((results) => {
            if (results?.topResults) {
              setTopResultsCache(results.topResults);
              setCached('topResults', results.topResults);
            }
          }),
          timeout(syncCampaignsWithThumbnails(user.id), 4000),
          timeout(syncUserLinks(user.id), 4000).then((linksData) => {
            queryClient.setQueryData(['user-links', user.id], linksData);
            setUserLinksCache(linksData || []);
          }),
          timeout(syncNotifications(user.id), 4000).then((notifications) => {
            setNotificationsCache(notifications || []);
          }),
        ];

        await Promise.allSettled(tasks);
      } catch {
        // Silent fail
      }
    };

    const task = InteractionManager.runAfterInteractions(run);
    return () => task.cancel();
  }, [user?.id, queryClient]);

  useEffect(() => {
    if (splashAnimationDone) {
      setShowAnimatedSplash(false);
    }
  }, [splashAnimationDone]);

  useEffect(() => {
    if (!showAnimatedSplash) return;
    const timeout = setTimeout(() => {
      setSplashAnimationDone(true);
    }, 3000);
    return () => clearTimeout(timeout);
  }, [showAnimatedSplash]);

  // Show animated splash after native splash is hidden — wrap in full-screen view so splash fills entire screen
  if (!appReady || showAnimatedSplash) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0F0F14' }}>
        <AnimatedSplash onFinish={handleAnimatedSplashFinish} />
      </View>
    );
  }

  return (
    <BottomSheetModalProvider>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent={true}
      />
      <ErrorBoundary>
        <View style={{ flex: 1, backgroundColor: colors.background.DEFAULT }}>
          <RootNavigator />
          <Toast config={toastConfig ?? undefined} position="top" topOffset={60} visibilityTime={4000} />
        </View>
      </ErrorBoundary>
    </BottomSheetModalProvider>
  );
}

export default function App() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <ThemeProvider>
            <AuthProvider>
              <LanguageProvider>
                <RemoteConfigProvider>
                  <AppContent />
                </RemoteConfigProvider>
              </LanguageProvider>
            </AuthProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
