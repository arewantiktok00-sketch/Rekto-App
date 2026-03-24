import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LinkingOptions, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '@/contexts/AuthContext';
import { useRemoteConfig } from '@/contexts/RemoteConfigContext';
import AuthStack from './AuthStack';
import MainTabs from './MainTabs';
import ProfileStack from './ProfileStack';
import { OwnerDashboard } from '@/screens/owner/OwnerDashboard';
import { OwnerNotifications } from '@/screens/owner/OwnerNotifications';
import { BroadcastScreen } from '@/screens/owner/BroadcastScreen';
import { CampaignDetail } from '@/screens/main/CampaignDetail';
import { Analytics } from '@/screens/main/Analytics';
import { Notifications } from '@/screens/main/Notifications';
import Invoice from '@/screens/main/Invoice';
import { InvoiceHistory } from '@/screens/main/InvoiceHistory';
import { PaymentSuccess } from '@/screens/main/PaymentSuccess';
import { Terms } from '@/screens/legal/Terms';
import { Privacy } from '@/screens/legal/Privacy';
import { Refund } from '@/screens/legal/Refund';
import { NotFound } from '@/screens/NotFound';
import { Index } from '@/screens/Index';
import { LinkEditor } from '@/screens/main/LinkEditor';
import { TopResultsScreen } from '@/screens/TopResultsScreen';
import { Tutorial } from '@/screens/main/Tutorial';
import MaintenanceScreen from '@/screens/MaintenanceScreen';
import { View, TouchableOpacity, Linking, Keyboard } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useOwnerAuth } from '@/hooks/useOwnerAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { navigationRef } from '@/navigation/navigationService';
import Constants from '@/lib/constants';
import { Text } from '@/components/common/Text';

const Stack = createNativeStackNavigator();

const AUTH_SCREEN_NAMES = new Set([
  'Auth', 'Index', 'Login', 'SignUp', 'PhoneLogin', 'PhoneSignUp', 'VerifyCode', 'VerifyEmail',
  'ForgotPassword', 'ForgotPasswordOTP', 'ForgotPasswordNewPassword', 'ForgotPasswordPhone', 'ResetPassword', 'Blocked',
]);

export default function RootNavigator() {
  const { user, loading, isBlocked, blockReason } = useAuth();
  const { config } = useRemoteConfig();
  const { hasAdminAccess, loading: ownerLoading } = useOwnerAuth();
  const sentAdminToDashboardRef = useRef(false);
  const { colors } = useTheme();
  const { language } = useLanguage();
  const [updateRequired, setUpdateRequired] = useState(false);
  const linking = useMemo<LinkingOptions<any>>(
    () => ({
      prefixes: ['rektoapp://'],
      config: {
        screens: {
          Main: {
            screens: {
              Dashboard: 'dashboard',
              Campaigns: 'campaigns',
              CreateAd: 'create',
              Links: 'links',
              Tutorial: 'tutorial',
            },
          },
          CampaignDetail: 'campaign/:id',
          Notifications: 'notifications',
          TopResults: 'top-results',
        },
      },
    }),
    []
  );

  const appVersion = useMemo(() => {
    return (Constants as any)?.manifest?.version ?? '1.0.0';
  }, []);

  const compareVersions = (current: string, required: string) => {
    const toParts = (value: string) => value.split('.').map((part) => parseInt(part, 10) || 0);
    const currentParts = toParts(current);
    const requiredParts = toParts(required);
    const maxLen = Math.max(currentParts.length, requiredParts.length);
    for (let i = 0; i < maxLen; i += 1) {
      const curr = currentParts[i] || 0;
      const req = requiredParts[i] || 0;
      if (curr > req) return 1;
      if (curr < req) return -1;
    }
    return 0;
  };

  useEffect(() => {
    const minVersion = config?.update?.min_version;
    const forceUpdate = config?.update?.force_update === true;
    if (!minVersion || !forceUpdate) {
      setUpdateRequired(false);
      return;
    }
    const needsUpdate = compareVersions(appVersion, minVersion) < 0;
    setUpdateRequired(needsUpdate);
  }, [config?.update?.min_version, config?.update?.force_update, appVersion]);

  const handleForceUpdate = async () => {
    const url = config?.update?.android_store_url || config?.update?.ios_store_url || '';
    if (!url) return;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    }
  };

  // CRITICAL: Redirect to BlockedScreen if user is blocked (on app launch, login, session refresh)
  useEffect(() => {
    if (loading) return; // Wait for auth to load
    
    if (user && isBlocked) {
      console.log('[RootNavigator] User is blocked, redirecting to BlockedScreen');
      // Small delay to ensure navigation is ready
      const timer = setTimeout(() => {
        if (navigationRef.current?.isReady()) {
          try {
            navigationRef.current.reset({
              index: 0,
              routes: [{ 
                name: 'Auth' as never,
                params: {
                  screen: 'Blocked' as never,
                  params: { reason: blockReason || null }
                }
              }],
            });
          } catch (error) {
            console.error('[RootNavigator] Navigation reset error:', error);
          }
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [user, loading, isBlocked, blockReason]);

  // Reset navigation when user logs out
  useEffect(() => {
    if (!loading && !user && navigationRef.current?.isReady()) {
      console.log('[RootNavigator] User logged out, resetting navigation to Index');
      try {
        navigationRef.current.reset({
          index: 0,
          routes: [{ name: 'Index' }],
        });
      } catch (error) {
        console.error('[RootNavigator] Navigation reset error:', error);
      }
    }
  }, [user, loading]);

  // When user logs out, clear "sent admin to dashboard" so next login can redirect again
  useEffect(() => {
    if (!user) sentAdminToDashboardRef.current = false;
  }, [user]);

  // When user logs in: wait for owner-check, then reset to the correct root (Main or OwnerDashboard).
  // Single effect so reviewers get a clean reset to OwnerDashboard without race with "reset to Main".
  useEffect(() => {
    if (!loading && !ownerLoading && user && !isBlocked && navigationRef.current?.isReady()) {
      const timer = setTimeout(() => {
        try {
          const currentRoute = navigationRef.current?.getCurrentRoute();
          const routeName = currentRoute?.name as string | undefined;
          const isOnAuthOrIndex = routeName != null && (AUTH_SCREEN_NAMES.has(routeName) || routeName === 'Index' || (currentRoute?.params as any)?.screen != null);

          if (isOnAuthOrIndex) {
            const targetName = hasAdminAccess ? 'OwnerDashboard' : 'Main';
            console.log('[RootNavigator] User logged in, resetting to', targetName, hasAdminAccess ? '(admin)' : '');
            navigationRef.current?.reset({
              index: 0,
              routes: [{ name: targetName }],
            });
            if (hasAdminAccess) sentAdminToDashboardRef.current = true;
          } else if (hasAdminAccess && routeName === 'Main' && !sentAdminToDashboardRef.current) {
            // owner-check finished after we already landed on Main (e.g. slow network): send admin to OwnerDashboard once
            sentAdminToDashboardRef.current = true;
            navigationRef.current?.reset({
              index: 0,
              routes: [{ name: 'OwnerDashboard' }],
            });
          }
        } catch (error) {
          console.error('[RootNavigator] Post-login reset error:', error);
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [user, loading, ownerLoading, hasAdminAccess, isBlocked]);

  // Priority 1: Blocked users see BlockedScreen
  if (!loading && isBlocked) {
    return (
      <NavigationContainer ref={navigationRef} direction="rtl" linking={linking}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Auth" component={AuthStack} />
          <Stack.Screen name="Index" component={Index} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  // Priority 2: Maintenance mode (unless user is admin/owner/reviewer)
  // CRITICAL: Maintenance mode check with owner/reviewer bypass
  // Show maintenance screen ONLY if:
  // 1. Maintenance is enabled AND
  // 2. User is NOT an owner/reviewer (hasAdminAccess = isOwner || isReviewer) AND
  // 3. We've finished checking owner status (ownerLoading = false)
  const isMaintenanceActive = config?.maintenance?.enabled === true;
  const canBypassMaintenance = hasAdminAccess; // isOwner || isReviewer
  
  if (isMaintenanceActive && !canBypassMaintenance && !ownerLoading) {
    // Get localized maintenance message
    let maintenanceMessage: string | undefined;
    
    if (language === 'ckb' && config.maintenance.message_ckb) {
      maintenanceMessage = config.maintenance.message_ckb;
    } else if (language === 'ar' && config.maintenance.message_ar) {
      maintenanceMessage = config.maintenance.message_ar;
    } else {
      maintenanceMessage = config.maintenance.message_ckb || config.maintenance.message_ar || config.maintenance.message || undefined;
    }

    return (
      <MaintenanceScreen message={maintenanceMessage} />
    );
  }

  if (updateRequired) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0F0F1A', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ fontSize: 20, color: '#FAFAFA', marginBottom: 12 }}>
          Update Required
        </Text>
        <Text style={{ fontSize: 14, color: '#A1A1AA', textAlign: 'center', marginBottom: 20 }}>
          A new version is available. Please update the app to continue.
        </Text>
        <TouchableOpacity
          onPress={handleForceUpdate}
          style={{ backgroundColor: '#7C3AED', paddingVertical: 12, paddingHorizontal: 28, borderRadius: 12 }}
        >
          <Text style={{ color: colors.primary.foreground, fontSize: 16, fontWeight: '600' }}>Update Now</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const appBg = colors.background.DEFAULT;

  const onNavStateChange = () => {
    try {
      const route = navigationRef.getCurrentRoute();
      if (route?.name !== 'OwnerDashboard') {
        Keyboard.dismiss();
      }
    } catch (_) {}
  };

  return (
    <View style={{ flex: 1, backgroundColor: appBg }}>
      <NavigationContainer ref={navigationRef} direction="rtl" onStateChange={onNavStateChange}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: appBg },
        }}
        initialRouteName={!user ? "Index" : "Main"}
      >
        {!user ? (
          <>
            <Stack.Screen name="Index" component={Index} />
            <Stack.Screen name="Auth" component={AuthStack} />
            {/* Legal screens - available to all users */}
            <Stack.Screen 
              name="Terms" 
              component={Terms}
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="Privacy" 
              component={Privacy}
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="Refund" 
              component={Refund}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Tutorial"
              component={Tutorial}
              options={{ headerShown: false }}
            />
          </>
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="ProfileStack" component={ProfileStack} />
            <Stack.Screen 
              name="CampaignDetail" 
              component={CampaignDetail}
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="Analytics" 
              component={Analytics}
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="Notifications" 
              component={Notifications}
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="Invoice" 
              component={Invoice}
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="InvoiceHistory" 
              component={InvoiceHistory}
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="PaymentSuccess" 
              component={PaymentSuccess}
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="OwnerDashboard" 
              component={OwnerDashboard}
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="OwnerNotifications" 
              component={OwnerNotifications}
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="BroadcastScreen" 
              component={BroadcastScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="NotFound" 
              component={NotFound}
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="LinkEditor" 
              component={LinkEditor}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="TopResults"
              component={TopResultsScreen}
              options={{ headerShown: false }}
            />
            {/* Legal screens - available to all users */}
            <Stack.Screen 
              name="Terms" 
              component={Terms}
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="Privacy" 
              component={Privacy}
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="Refund" 
              component={Refund}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Tutorial"
              component={Tutorial}
              options={{ headerShown: false }}
            />
          </>
        )}
      </Stack.Navigator>
      </NavigationContainer>
    </View>
  );
}
