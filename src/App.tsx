import { ToastProvider } from '@/components/common/ToastProvider';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext';
import { RemoteConfigProvider } from '@/contexts/RemoteConfigContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { safeQuery, supabase } from '@/integrations/supabase/client';
import { initializeOneSignal, logoutOneSignal } from '@/lib/onesignal';
import RootNavigator from '@/navigation/RootNavigator';
import { AnimatedSplash } from '@/screens/AnimatedSplash';
import { syncCampaignsWithThumbnails } from '@/services/campaignSync';
import { syncFeaturedCampaigns } from '@/services/featuredCampaignSync';
import { setCached, setCampaignsCache, setNotificationsCache, setTopResultsCache, setUserLinksCache } from '@/services/globalCache';
import { syncUserLinks } from '@/services/linksSync';
import { syncNotifications } from '@/services/notificationsSync';
import { getFontFamilyWithWeight } from '@/utils/fonts';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { I18nManager, Image, InteractionManager, LogBox, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
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

// Keep native splash visible until JS is ready to avoid a blank screen.
SplashScreen.preventAutoHideAsync().catch(() => {});

function AppContent() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const { language, isRTL } = useLanguage();
  const queryClient = useQueryClient();
  const [showAnimatedSplash, setShowAnimatedSplash] = useState(true);
  const [appReady, setAppReady] = useState(false);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [splashAnimationDone, setSplashAnimationDone] = useState(false);
  const lastSyncRef = useRef<number>(0);
  const prefetchRef = useRef(false);
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

  // Load custom fonts
  useEffect(() => {
    const loadFonts = async () => {
      try {
        await Font.loadAsync({
          // Kurdish/Arabic font - use PostScript name
          // Path: src/App.tsx -> assets/fonts/ = ../assets/fonts/ (one level up from src)
          'Rabar_021': require('../assets/fonts/Rabar_021.ttf'),
          // English fonts (Poppins) - use PostScript names
          'Poppins-Regular': require('../assets/fonts/Poppins-Regular.ttf'),
          'Poppins-Medium': require('../assets/fonts/Poppins-Medium.ttf'),
          'Poppins-SemiBold': require('../assets/fonts/Poppins-SemiBold.ttf'),
          'Poppins-Bold': require('../assets/fonts/Poppins-Bold.ttf'),
        });
        setFontsLoaded(true);
        setAppReady(true);
        console.log('[App] All fonts loaded successfully');
      } catch (error) {
        console.warn('Failed to load fonts:', error);
        setFontsLoaded(true); // Continue even if font loading fails
        setAppReady(true);
      }
    };
    loadFonts();
  }, []);

  useEffect(() => {
    if (appReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [appReady]);

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

  // Show animated splash after native splash is hidden
  if (!appReady || showAnimatedSplash) {
    return <AnimatedSplash onFinish={handleAnimatedSplashFinish} />;
  }

  return (
    <>
      <StatusBar 
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent={true}
      />
      <View style={{ flex: 1 }}>
        <RootNavigator />
        <ToastProvider />
      </View>
    </>
  );
}

export default function App() {
  const [queryClient] = useState(() => new QueryClient());

  useEffect(() => {
    I18nManager.forceRTL(true);
    I18nManager.allowRTL(true);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
