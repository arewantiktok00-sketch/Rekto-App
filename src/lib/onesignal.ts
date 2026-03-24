/**
 * OneSignal Push Notifications Integration
 * Stale push suppression: only show in-app toast and system notification for pushes received within 60s.
 */

import { supabase } from '@/integrations/supabase/client';
import { navigate } from '@/navigation/navigationService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { translateNotification } from '@/utils/notificationTranslator';
import { toast } from '@/utils/toast';

const MAX_TOAST_AGE_MS = 60_000; // 60 seconds — suppress toast for older queued pushes
const LANGUAGE_STORAGE_KEY = 'rekto-language';

// Try to import OneSignal - may fail if not properly configured
let OneSignal: any = null;
let isOneSignalInitialized = false;
try {
  const onesignalModule = require('react-native-onesignal');
  OneSignal = onesignalModule.OneSignal || onesignalModule.default || onesignalModule;
} catch (error) {
  console.warn('[OneSignal] Module not found, push notifications disabled');
}

// Your OneSignal App ID from dashboard
const ONESIGNAL_APP_ID = '2dfb6596-21c6-4c73-ad3c-28cc1182eeff';

/**
 * Initialize OneSignal with user ID
 */
export const initializeOneSignal = async (userId?: string, navigation?: any) => {
  if (!OneSignal) {
    console.warn('[OneSignal] SDK not available. Make sure react-native-onesignal is installed.');
    return;
  }

  if (!ONESIGNAL_APP_ID) {
    console.warn('[OneSignal] App ID not configured. Skipping initialization.');
    return;
  }

  try {
    // Initialize OneSignal - try different API patterns
    if (typeof OneSignal.initialize === 'function') {
      OneSignal.initialize(ONESIGNAL_APP_ID);
    } else if (typeof OneSignal.setAppId === 'function') {
      OneSignal.setAppId(ONESIGNAL_APP_ID);
    } else {
      console.warn('[OneSignal] Unknown API structure');
      return;
    }
    isOneSignalInitialized = true;
    
    // Request notification permission
    if (OneSignal.Notifications && typeof OneSignal.Notifications.requestPermission === 'function') {
      OneSignal.Notifications.requestPermission(true);
    } else if (typeof OneSignal.promptForPushNotificationsWithUserResponse === 'function') {
      OneSignal.promptForPushNotificationsWithUserResponse((response: boolean) => {
        console.log('[OneSignal] Permission response:', response);
      });
    }
    
    // Foreground notification handling: suppress toast and system notification for stale (queued) pushes
    if (OneSignal.Notifications && OneSignal.Notifications.addEventListener) {
      OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event: any) => {
        const notification = event?.getNotification?.() || event?.notification;
        const notificationTime = notification?.sentTime ?? notification?.createdAt ?? Date.now();
        const ageMs = Date.now() - (typeof notificationTime === 'number' ? notificationTime : new Date(notificationTime).getTime());
        if (ageMs > MAX_TOAST_AGE_MS) {
          if (__DEV__) {
            console.log('[Notifications] Suppressing stale push:', ageMs, 'ms old');
          }
          try {
            if (typeof (event as any)?.preventDefault === 'function') (event as any).preventDefault();
          } catch (_) {}
          return;
        }
        if (__DEV__) {
          console.log('[OneSignal] Foreground notification:', notification?.title);
        }
        if (event?.display) {
          event.display();
        }
        const title = notification?.title ?? '';
        const body = notification?.body ?? notification?.additionalData?.body ?? '';
        if (title || body) {
          void (async () => {
            let language: 'ckb' | 'ar' | 'en' = 'ckb';
            try {
              const storedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
              if (storedLanguage === 'ar') {
                language = 'ar';
              }
            } catch (_) {}
            const translated = translateNotification(title || 'Notification', body || '', language);
            toast.info(translated.title || title || 'Notification', translated.message || body || '');
          })();
        }
      });

      // Handle notification opened
      OneSignal.Notifications.addEventListener('click', (event: any) => {
        if (__DEV__) {
          console.log('[OneSignal] Notification clicked:', event);
        }
        
        // Handle deep linking based on notification data
        const data = event?.notification?.additionalData || event?.additionalData;
        
        if (data?.campaign_id && navigation) {
          navigation.navigate('CampaignDetail', { id: data.campaign_id });
        } else if (data?.campaign_id) {
          navigate('CampaignDetail', { id: data.campaign_id });
        }

        if (data?.type === 'promo' && data?.target_budget && data?.display_price_iqd && navigation) {
          navigation.navigate('Main', {
            screen: 'CreateAd',
            params: {
              prefill: { daily_budget: Number(data.target_budget) },
              promo: {
                target_budget: Number(data.target_budget),
                display_price_iqd: Number(data.display_price_iqd),
                active: true
              }
            }
          });
        } else if (data?.type === 'promo' && data?.target_budget && data?.display_price_iqd) {
          navigate('Main', {
            screen: 'CreateAd',
            params: {
              prefill: { daily_budget: Number(data.target_budget) },
              promo: {
                target_budget: Number(data.target_budget),
                display_price_iqd: Number(data.display_price_iqd),
                active: true,
              },
            },
          });
        }

        if (data?.type === 'new-ad' || data?.screen === 'OwnerDashboard') {
          if (navigation) {
            navigation.navigate('OwnerDashboard');
          } else {
            navigate('OwnerDashboard');
          }
        }
      });
    }
    
    // Set external user ID for targeting
    if (userId) {
      if (typeof OneSignal.login === 'function') {
        OneSignal.login(userId);
      } else if (typeof OneSignal.setExternalUserId === 'function') {
        OneSignal.setExternalUserId(userId);
      }
    }
    
    // Get player ID (device token) and save to database
    // Try different API patterns for getting subscription
    const getPlayerId = async () => {
      let playerId: string | null = null;
      let token: string | null = null;

      if (OneSignal.User && OneSignal.User.pushSubscription) {
        const subscription = OneSignal.User.pushSubscription;
        if (subscription.id) {
          playerId = subscription.id;
          token = subscription.token || playerId;
        }
      } else if (typeof OneSignal.getDeviceState === 'function') {
        const deviceState = await OneSignal.getDeviceState();
        playerId = deviceState?.userId || deviceState?.pushSubscriptionId;
        token = deviceState?.pushToken;
      } else if (typeof OneSignal.getUserId === 'function') {
        playerId = await OneSignal.getUserId();
        token = playerId;
      }

      if (playerId && userId) {
        // Save to Supabase for backend targeting (select then update or insert to avoid ON CONFLICT errors)
        try {
          const { data: existing } = await supabase
            .from('notification_preferences')
            .select('id')
            .eq('user_id', userId)
            .maybeSingle();

          const payload = {
            user_id: userId,
            push_enabled: true,
            push_subscription: {
              type: 'onesignal',
              player_id: playerId,
              token: token,
              platform: Platform.OS,
              updatedAt: new Date().toISOString(),
            },
          } as any;

          if (existing?.id) {
            await supabase.from('notification_preferences').update(payload).eq('id', existing.id);
          } else {
            await supabase.from('notification_preferences').insert(payload);
          }
          console.log('[OneSignal] Player ID saved:', playerId);
        } catch (dbError) {
          console.error('[OneSignal] Failed to save player ID:', dbError);
        }
      }
    };

    // Try to get player ID immediately and also set up listener if available
    getPlayerId();

    if (OneSignal.User && OneSignal.User.pushSubscription && OneSignal.User.pushSubscription.addEventListener) {
      OneSignal.User.pushSubscription.addEventListener('change', async (subscription: any) => {
        const playerId = subscription?.current?.id || subscription?.id;
        const token = subscription?.current?.token || subscription?.token || playerId;
        
        if (playerId && userId) {
          try {
            const { data: existing } = await supabase
              .from('notification_preferences')
              .select('id')
              .eq('user_id', userId)
              .maybeSingle();

            const payload = {
              user_id: userId,
              push_enabled: true,
              push_subscription: {
                type: 'onesignal',
                player_id: playerId,
                token: token,
                platform: Platform.OS,
                updatedAt: new Date().toISOString(),
              },
            } as any;

            if (existing?.id) {
              await supabase.from('notification_preferences').update(payload).eq('id', existing.id);
            } else {
              await supabase.from('notification_preferences').insert(payload);
            }
            console.log('[OneSignal] Player ID updated:', playerId);
          } catch (dbError) {
            console.error('[OneSignal] Failed to update player ID:', dbError);
          }
        }
      });
    }
    
    console.log('[OneSignal] Initialized successfully');
  } catch (error) {
    console.error('[OneSignal] Initialization error:', error);
  }
};

/**
 * Logout from OneSignal
 */
export const logoutOneSignal = () => {
  if (!OneSignal || !isOneSignalInitialized) return;
  
  try {
    if (typeof OneSignal.logout === 'function') {
      OneSignal.logout();
    } else if (typeof OneSignal.removeExternalUserId === 'function') {
      OneSignal.removeExternalUserId();
    }
    console.log('[OneSignal] Logged out successfully');
  } catch (error) {
    console.error('[OneSignal] Logout error:', error);
  }
};
