import { Text } from '@/components/common/Text';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing } from '@/theme/spacing';
import { getFontFamilyByLanguage } from '@/utils/fonts';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { GraduationCap, Home, LayoutGrid, Link2, Plus } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TAB_BAR_HEIGHT = 64;
const INACTIVE_TAB_COLOR = '#71717A';
const ACTIVE_TAB_COLOR = '#7C3AED';
const CAPSULE_RADIUS = 28;
const HORIZONTAL_MARGIN = 12;
const BOTTOM_INSET = 8;

function createStyles(colors: any, insets: any, fontFamily: string, isRTL?: boolean, isDark?: boolean) {
  return StyleSheet.create({
    container: {
      position: 'absolute',
      bottom: 0,
      start: 0,
      end: 0,
      alignItems: 'center',
      overflow: 'visible',
      zIndex: 999,
    },
    safeArea: {
      width: '100%',
      paddingHorizontal: HORIZONTAL_MARGIN,
      paddingBottom: Math.max(insets?.bottom ?? 0, BOTTOM_INSET),
      overflow: 'visible',
      ...(Platform.OS === 'ios' ? {
        backgroundColor: 'transparent',
        borderTopWidth: 0,
      } : {
        backgroundColor: isDark ? 'rgba(15,15,20,0.98)' : 'rgba(255,255,255,0.98)',
        borderTopWidth: 1,
        borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      }),
    },
    tabBarBackground: {
      backgroundColor: Platform.OS === 'ios'
        ? (isDark ? 'rgba(28,28,32,0.72)' : 'rgba(255,255,255,0.72)')
        : (isDark ? 'rgba(15,15,20,0.98)' : 'rgba(255,255,255,0.98)'),
      borderRadius: CAPSULE_RADIUS,
      overflow: 'visible',
      minHeight: TAB_BAR_HEIGHT,
      borderWidth: Platform.OS === 'ios' ? 1 : 0,
      borderColor: Platform.OS === 'ios' ? (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.6)') : 'transparent',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.3 : 0.08,
      shadowRadius: 12,
      elevation: 8,
    },
    tabBarContent: {
      flexDirection: 'row',
      height: TAB_BAR_HEIGHT,
      justifyContent: 'space-around',
      alignItems: 'center',
      paddingHorizontal: spacing.sm,
      position: 'relative',
      overflow: 'visible',
    },
    centerSpacer: {
      flex: 1,
      minWidth: 52,
      maxWidth: 72,
      height: '100%',
    },
    tabButton: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      paddingVertical: 6,
      position: 'relative',
      minWidth: 56,
      maxWidth: 72,
    },
    tabLabel: {
      fontSize: 10,
      color: INACTIVE_TAB_COLOR,
      marginTop: 4,
      fontFamily: fontFamily,
    },
    tabLabelRTL: {
      textAlign: 'right',
      writingDirection: 'rtl',
    },
    tabLabelActive: {
      color: ACTIVE_TAB_COLOR,
      fontFamily: fontFamily,
      fontWeight: '600',
    },
    activeDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: ACTIVE_TAB_COLOR,
      marginTop: 4,
    },
    centerButtonWrapper: {
      position: 'absolute',
      top: -4,
      start: 0,
      end: 0,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    },
    glowContainer: {
      position: 'absolute',
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      top: 2,
    },
    glow: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.primary.DEFAULT,
      opacity: 0.2,
      shadowColor: colors.primary.DEFAULT,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 12,
      elevation: 6,
    },
    centerButtonContainer: {
      zIndex: 1,
    },
    centerButton: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 7,
      elevation: 7,
    },
  });
}

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
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const fontFamily = getFontFamilyByLanguage(language as 'ckb' | 'ar');

  // Hide tab bar on CreateAd screen
  const currentRoute = state.routes[state.index];
  const hideTabBar = (currentRoute?.params as any)?.hideTabBar === true;
  if (currentRoute?.name === 'CreateAd' || hideTabBar) {
    return null;
  }

  const tabMetaByName: Record<string, { icon?: any; labelKey: string; isCenter?: boolean }> = {
    Dashboard: { icon: Home, labelKey: 'home' },
    Campaigns: { icon: LayoutGrid, labelKey: 'ads' },
    CreateAd: { icon: Plus, labelKey: 'create', isCenter: true },
    Links: { icon: Link2, labelKey: 'links' },
    Tutorial: { icon: GraduationCap, labelKey: 'learn' },
  };

  const styles = createStyles(colors, insets, fontFamily, isRTL, isDark);
  const centerRouteIndex = state.routes.findIndex((route) => route.name === 'CreateAd');
  const centerRoute = centerRouteIndex >= 0 ? state.routes[centerRouteIndex] : undefined;
  const centerIsFocused = centerRouteIndex >= 0 ? state.index === centerRouteIndex : false;
  const centerOptions = centerRoute ? descriptors[centerRoute.key]?.options : undefined;
  const onCenterPress = () => {
    if (!centerRoute) return;
    const event = navigation.emit({
      type: 'tabPress',
      target: centerRoute.key,
      canPreventDefault: true,
    });
    if (!centerIsFocused && !event.defaultPrevented) {
      navigation.navigate(centerRoute.name as any);
    }
  };

  // Liquid Glass style: floating translucent capsule, soft edge, safe-area aware (iOS)
  return (
    <View style={styles.container} pointerEvents="box-none">
      <View style={styles.safeArea}>
        <View style={styles.tabBarBackground}>
          <View style={styles.tabBarContent}>
            {state.routes.map((route, index) => {
              const tabInfo = tabMetaByName[route.name];
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
                return <View key={route.key} style={styles.centerSpacer} pointerEvents="none" />;
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
                  testID={(options as any).tabBarTestID}
                >
                  <Icon size={22} color={isFocused ? ACTIVE_TAB_COLOR : INACTIVE_TAB_COLOR} />
                  <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive, isRTL && styles.tabLabelRTL]} numberOfLines={1}>
                    {t(tabInfo.labelKey)}
                  </Text>
                  {isFocused && <View style={styles.activeDot} />}
                </AnimatedTabButton>
              );
            })}
            {centerRoute ? (
              <View style={styles.centerButtonWrapper} pointerEvents="box-none">
                <View style={styles.glowContainer}>
                  <View style={styles.glow} />
                </View>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityState={centerIsFocused ? { selected: true } : {}}
                  accessibilityLabel={centerOptions?.tabBarAccessibilityLabel}
                  testID={(centerOptions as any)?.tabBarTestID}
                  onPress={onCenterPress}
                  style={styles.centerButtonContainer}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#7C3AED', '#9333EA']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.centerButton}
                  >
                    <Plus size={16} color="#FFFFFF" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}
