import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Dashboard } from '@/screens/main/Dashboard';
import Campaigns from '@/screens/main/Campaigns';
import { CreateAd } from '@/screens/main/CreateAd';
import { Links } from '@/screens/main/Links';
import { Tutorial } from '@/screens/main/Tutorial';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRemoteConfig } from '@/contexts/RemoteConfigContext';
import { CustomTabBar } from '@/components/common/CustomTabBar';
import { BlockedGuard } from '@/components/auth/BlockedGuard';
// Using lucide-react-native icons
import { Home, LayoutGrid, Plus, Link2, GraduationCap } from 'lucide-react-native';

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  const { t } = useLanguage();
  const { isFeatureEnabled, isPaymentsHidden } = useRemoteConfig();
  const showCampaignsTab = isFeatureEnabled('campaigns_enabled');
  const showCreateTab = isFeatureEnabled('ad_creation_enabled') && !isPaymentsHidden;
  const showLinksTab = isFeatureEnabled('links_enabled');

  return (
    <BlockedGuard>
      <Tab.Navigator
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
        }}
      >
      <Tab.Screen
        name="Dashboard"
        component={Dashboard}
        options={{
          tabBarAccessibilityLabel: t('home') || 'Home',
        }}
      />
      {showCampaignsTab && (
        <Tab.Screen
          name="Campaigns"
          component={Campaigns}
          options={{
            tabBarAccessibilityLabel: t('campaigns') || 'Campaigns',
          }}
        />
      )}
      {showCreateTab && (
        <Tab.Screen
          name="CreateAd"
          component={CreateAd}
          options={{
            tabBarAccessibilityLabel: t('create') || 'Create',
          }}
        />
      )}
      {showLinksTab && (
        <Tab.Screen
          name="Links"
          component={Links}
          options={{
            tabBarAccessibilityLabel: t('links') || 'Links',
          }}
        />
      )}
      <Tab.Screen
        name="Tutorial"
        component={Tutorial}
        options={{
          tabBarAccessibilityLabel: t('learn') || 'Learn',
        }}
      />
      </Tab.Navigator>
    </BlockedGuard>
  );
}
