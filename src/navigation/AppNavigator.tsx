/**
 * AppNavigator — Bottom Tabs (5) + Stack screens.
 * Tab bar: dark #0F0F14, active #7C3AED, inactive #A1A1AA.
 * Labels: Rabar_021. All screens: headerShown false.
 */
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useLanguage } from '@/contexts/LanguageContext';
import { Home, LayoutGrid, Plus, Link2, GraduationCap } from 'lucide-react-native';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Dashboard } from '@/screens/main/Dashboard';
import Campaigns from '@/screens/main/Campaigns';
import { CreateAd } from '@/screens/main/CreateAd';
import { Links } from '@/screens/main/Links';
import { Tutorial } from '@/screens/main/Tutorial';
import AuthStack from './AuthStack';
import { Index } from '@/screens/Index';
import { CampaignDetail } from '@/screens/main/CampaignDetail';
import { PaymentSuccess } from '@/screens/main/PaymentSuccess';
import { Analytics } from '@/screens/main/Analytics';
import { Notifications } from '@/screens/main/Notifications';
import { Invoice } from '@/screens/main/Invoice';
import { TopResultsScreen } from '@/screens/TopResultsScreen';
import { Terms } from '@/screens/legal/Terms';
import { Privacy } from '@/screens/legal/Privacy';
import { Refund } from '@/screens/legal/Refund';
import { LinkEditor } from '@/screens/main/LinkEditor';
import { InvoiceHistory } from '@/screens/main/InvoiceHistory';
import { BroadcastScreen } from '@/screens/owner/BroadcastScreen';
import { NotFound } from '@/screens/NotFound';
import ProfileStack from './ProfileStack';
import { OwnerDashboard } from '@/screens/owner/OwnerDashboard';
import { OwnerNotifications } from '@/screens/owner/OwnerNotifications';
import { BlockedScreen } from '@/screens/auth/BlockedScreen';
import { getFontFamilyByLanguage } from '@/utils/fonts';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const DESIGN = {
  tabBarBg: '#0F0F14',
  tabActive: '#7C3AED',
  tabInactive: '#A1A1AA',
  gradientStart: '#7C3AED',
  gradientEnd: '#9333EA',
};

function MainTabsWithSpec() {
  const { t, language } = useLanguage();
  const fontFamily = getFontFamilyByLanguage(language as 'ckb' | 'ar');

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: DESIGN.tabBarBg, borderTopColor: 'rgba(255,255,255,0.1)' },
        tabBarActiveTintColor: DESIGN.tabActive,
        tabBarInactiveTintColor: DESIGN.tabInactive,
        tabBarLabelStyle: { fontFamily, fontSize: 11 },
        tabBarShowLabel: true,
      }}
      tabBar={({ state, descriptors, navigation }) => (
        <View style={[styles.tabBar, { backgroundColor: DESIGN.tabBarBg }]}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === index;
            const isCenter = route.name === 'CreateAd';
            const onPress = () => {
              if (!isFocused) navigation.navigate(route.name);
            };

            const labels: Record<string, string> = {
              Dashboard: t('home'),
              Campaigns: t('campaigns'),
              CreateAd: t('create'),
              Links: t('links'),
              Tutorial: t('learn'),
            };
            const label = labels[route.name] ?? route.name;

            if (isCenter) {
              return (
                <TouchableOpacity key={route.key} onPress={onPress} style={styles.centerWrap} activeOpacity={0.8}>
                  <LinearGradient
                    colors={[DESIGN.gradientStart, DESIGN.gradientEnd]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.centerButton}
                  >
                    <Plus size={24} color="#FFF" />
                  </LinearGradient>
                  <Text style={[styles.tabLabel, { fontFamily, color: DESIGN.tabActive }]}>{label}</Text>
                </TouchableOpacity>
              );
            }

            const icons: Record<string, React.ElementType> = {
              Dashboard: Home,
              Campaigns: LayoutGrid,
              Links: Link2,
              Tutorial: GraduationCap,
            };
            const Icon = icons[route.name];
            const color = isFocused ? DESIGN.tabActive : DESIGN.tabInactive;

            return (
              <TouchableOpacity
                key={route.key}
                onPress={onPress}
                style={styles.tabItem}
                activeOpacity={0.7}
              >
                {Icon && <Icon size={22} color={color} />}
                <Text style={[styles.tabLabel, { fontFamily, color }]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    >
      <Tab.Screen name="Dashboard" component={Dashboard} />
      <Tab.Screen name="Campaigns" component={Campaigns} />
      <Tab.Screen name="CreateAd" component={CreateAd} />
      <Tab.Screen name="Links" component={Links} />
      <Tab.Screen name="Tutorial" component={Tutorial} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    paddingBottom: 24,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 4,
  },
  centerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

/**
 * Full app navigator: Stack with Index, Auth, Main (tabs), and all stack-only screens.
 * Use inside NavigationContainer; auth/main switching is handled by RootNavigator.
 */
export function AppNavigatorContent() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Index" component={Index} />
      <Stack.Screen name="Auth" component={AuthStack} />
      <Stack.Screen name="Main" component={MainTabsWithSpec} />
      <Stack.Screen name="ProfileStack" component={ProfileStack} />
      <Stack.Screen name="CampaignDetail" component={CampaignDetail} />
      <Stack.Screen name="Analytics" component={Analytics} />
      <Stack.Screen name="Notifications" component={Notifications} />
      <Stack.Screen name="Invoice" component={Invoice} />
      <Stack.Screen name="PaymentSuccess" component={PaymentSuccess} />
      <Stack.Screen name="OwnerDashboard" component={OwnerDashboard} />
      <Stack.Screen name="OwnerNotifications" component={OwnerNotifications} />
      <Stack.Screen name="TopResults" component={TopResultsScreen} />
      <Stack.Screen name="InvoiceHistory" component={InvoiceHistory} />
      <Stack.Screen name="LinkEditor" component={LinkEditor} />
      <Stack.Screen name="BroadcastScreen" component={BroadcastScreen} />
      <Stack.Screen name="NotFound" component={NotFound} />
      <Stack.Screen name="Terms" component={Terms} />
      <Stack.Screen name="Privacy" component={Privacy} />
      <Stack.Screen name="Refund" component={Refund} />
      <Stack.Screen name="Tutorial" component={Tutorial} />
      <Stack.Screen name="Blocked" component={BlockedScreen} />
    </Stack.Navigator>
  );
}

export default AppNavigatorContent;
