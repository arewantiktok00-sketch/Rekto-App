import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { GraduationCap, Home, LayoutGrid, Link2, Plus } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// import { BlurView } from 'expo-blur'; // Optional - using fallback
import { Text } from '@/components/common/Text';
import { spacing } from '@/theme/spacing';
import { getFontFamilyByLanguage } from '@/utils/fonts';

// Animated Tab Button Component
const AnimatedTabButton = ({ 
  children, 
  isFocused, 
  onPress, 
  onLongPress, 
  styles,
  ...props 
}: any) => {
  const scaleAnim = useRef(new Animated.Value(isFocused ? 1 : 0.95)).current;
  const opacityAnim = useRef(new Animated.Value(isFocused ? 1 : 0.7)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: isFocused ? 1 : 0.95,
        tension: 100,
        friction: 8,
        useNativeDriver: false, // Changed to false for web compatibility
      }),
      Animated.timing(opacityAnim, {
        toValue: isFocused ? 1 : 0.7,
        duration: 200,
        useNativeDriver: false, // Changed to false for web compatibility
      }),
    ]).start();
  }, [isFocused]);

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.tabButton}
      activeOpacity={0.7}
      {...props}
    >
      <Animated.View
        style={{
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
};

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { t, language, isRTL } = useLanguage();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const fontFamily = getFontFamilyByLanguage(language as 'ckb' | 'ar');

  // Hide tab bar on CreateAd screen
  const currentRoute = state.routes[state.index];
  const hideTabBar = currentRoute?.params?.hideTabBar === true;
  if (currentRoute?.name === 'CreateAd' || hideTabBar) {
    return null;
  }

  const tabScreens = [
    { name: 'Dashboard', icon: Home, labelKey: 'home', fallback: 'سەرەکی' },
    { name: 'Campaigns', icon: LayoutGrid, labelKey: 'campaigns', fallback: 'ڕیکلام' },
    { name: 'CreateAd', icon: Plus, labelKey: 'create', fallback: 'دروستکردن', isCenter: true },
    { name: 'Links', icon: Link2, labelKey: 'links', fallback: 'لینک' },
    { name: 'Tutorial', icon: GraduationCap, labelKey: 'learn', fallback: 'فێربوون' },
  ];

  const styles = createStyles(colors, insets, fontFamily, isRTL);

  return (
    <View style={styles.container}>
      <View style={styles.tabBarBackground}>
        <View style={styles.tabBarContent}>
          {state.routes.map((route, index) => {
            const tabInfo = tabScreens[index];
            const { options } = descriptors[route.key];
            const isFocused = state.index === index;
            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name as any);
              }
            };

            if (tabInfo?.isCenter) {
              return (
                <View key={route.key} style={styles.centerButtonWrapper}>
                  <View style={styles.glowContainer}>
                    <View style={styles.glow} />
                  </View>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityState={isFocused ? { selected: true } : {}}
                    accessibilityLabel={options.tabBarAccessibilityLabel}
                    testID={options.tabBarTestID}
                    onPress={onPress}
                    style={styles.centerButtonContainer}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={[colors.primary.DEFAULT, colors.primary.dark]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.centerButton}
                    >
                      <Plus size={24} color={colors.primary.foreground} />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              );
            }

            const Icon = tabInfo?.icon;
            if (!Icon) return null;
            return (
              <AnimatedTabButton
                key={route.key}
                isFocused={isFocused}
                onPress={onPress}
                styles={styles}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                testID={options.tabBarTestID}
              >
                <Icon size={22} color={isFocused ? colors.primary.DEFAULT : colors.foreground.muted} />
                <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive, isRTL && styles.tabLabelRTL]}>
                  {t(tabInfo.labelKey) || tabInfo.fallback || tabInfo.labelKey}
                </Text>
                {isFocused && <View style={styles.glassmorphismOverlay} />}
              </AnimatedTabButton>
            );
          })}
        </View>
      </View>
    </View>
  );
}


const createStyles = (colors: any, insets: any, fontFamily: string, isRTL?: boolean) => StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    start: 0,
    end: 0,
  },
  tabBarBackground: {
    backgroundColor: colors.card.background,
    borderTopWidth: 1,
    borderTopColor: colors.border.DEFAULT,
    paddingBottom: Math.max(insets.bottom, 10),
    paddingTop: 8,
    overflow: 'visible',
    shadowColor: colors.border.DEFAULT,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 5,
  },
  tabBarContent: {
    flexDirection: 'row',
    height: 65,
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    position: 'relative',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    paddingVertical: 8,
    position: 'relative',
    minWidth: 60,
    maxWidth: 80,
  },
  tabLabel: {
    fontSize: 11,
    color: colors.foreground.muted,
    marginTop: 4,
    fontFamily: fontFamily,
  },
  tabLabelRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  tabLabelActive: {
    color: colors.primary.DEFAULT,
    fontFamily: fontFamily,
    fontWeight: '600',
  },
  glassmorphismOverlay: {
    position: 'absolute',
    top: 0,
    start: 0,
    end: 0,
    bottom: 0,
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.25)',
    zIndex: -1,
    // Enhanced glassmorphism
    shadowColor: colors.primary.DEFAULT,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  centerButtonWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 56,
    height: 56,
    marginHorizontal: spacing.sm,
    position: 'relative',
  },
  glowContainer: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    top: -4,
    start: -4,
  },
  glow: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary.DEFAULT,
    opacity: 0.25,
    shadowColor: colors.primary.DEFAULT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 8,
  },
  centerButtonContainer: {
    zIndex: 1,
  },
  centerButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary.DEFAULT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
});
