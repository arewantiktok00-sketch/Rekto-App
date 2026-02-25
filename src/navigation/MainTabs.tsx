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
  const { config } = useRemoteConfig();

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
      {/* Show Campaigns tab always, but will show disabled state if feature is off */}
      <Tab.Screen
        name="Campaigns"
        component={Campaigns}
        options={{
          tabBarAccessibilityLabel: t('campaigns') || 'Campaigns',
        }}
      />
      {/* Show CreateAd tab always, but will show disabled state if feature is off */}
      <Tab.Screen
        name="CreateAd"
        component={CreateAd}
        options={{
          tabBarAccessibilityLabel: t('create') || 'Create',
        }}
      />
      {/* Show Links tab always, but will show disabled state if feature is off */}
      <Tab.Screen
        name="Links"
        component={Links}
        options={{
          tabBarAccessibilityLabel: t('links') || 'Links',
        }}
      />
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
