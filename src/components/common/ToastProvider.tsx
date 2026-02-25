import { Text } from '@/components/common/Text';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { getFontFamilyWithWeight } from '@/utils/fonts';
import { toast, ToastPayload, ToastVariant } from '@/utils/toast';
import { AlertTriangle, CheckCircle2, Info, X, XOctagon } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type VariantColors = {
  background: string;
  border: string;
  icon: string;
  text: string;
};

const LIGHT_VARIANTS: Record<ToastVariant, VariantColors> = {
  success: {
    background: '#DCFCE7',
    border: '#BBF7D0',
    icon: '#16A34A',
    text: '#166534',
  },
  warning: {
    background: '#FEF3C7',
    border: '#FDE68A',
    icon: '#F59E0B',
    text: '#92400E',
  },
  info: {
    background: '#DBEAFE',
    border: '#BFDBFE',
    icon: '#3B82F6',
    text: '#1E40AF',
  },
  error: {
    background: '#FEE2E2',
    border: '#FECACA',
    icon: '#DC2626',
    text: '#991B1B',
  },
};

const DARK_VARIANTS: Record<ToastVariant, VariantColors> = {
  success: {
    background: '#052E16',
    border: '#14532D',
    icon: '#4ADE80',
    text: '#BBF7D0',
  },
  warning: {
    background: '#451A03',
    border: '#78350F',
    icon: '#FBBF24',
    text: '#FDE68A',
  },
  info: {
    background: '#172554',
    border: '#1E3A5F',
    icon: '#60A5FA',
    text: '#BFDBFE',
  },
  error: {
    background: '#450A0A',
    border: '#7F1D1D',
    icon: '#F87171',
    text: '#FECACA',
  },
};

const ICONS: Record<ToastVariant, React.ComponentType<{ size?: number; color?: string }>> = {
  success: CheckCircle2,
  warning: AlertTriangle,
  info: Info,
  error: XOctagon,
};

const hexToRgba = (hex: string, opacity: number) => {
  const sanitized = hex.replace('#', '');
  const r = parseInt(sanitized.substring(0, 2), 16);
  const g = parseInt(sanitized.substring(2, 4), 16);
  const b = parseInt(sanitized.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

export function ToastProvider() {
  const { isDark } = useTheme();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState<ToastPayload | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);
  const panY = useSharedValue(0);

  const clearToast = useCallback(() => {
    setCurrent(null);
  }, []);

  const hideToast = useCallback(() => {
    translateY.value = withTiming(-100, { duration: 200 });
    opacity.value = withTiming(0, { duration: 200 }, (finished) => {
      if (finished) {
        runOnJS(clearToast)();
      }
    });
  }, [clearToast, opacity, translateY]);

  const showToast = useCallback(
    (payload: ToastPayload | null) => {
      if (!payload) {
        hideToast();
        return;
      }

      setCurrent(payload);
      translateY.value = -100;
      opacity.value = 0;
      panY.value = 0;

      translateY.value = withSpring(0, { damping: 18, stiffness: 160 });
      opacity.value = withTiming(1, { duration: 200 });

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        hideToast();
      }, 4000);
    },
    [hideToast, opacity, panY, translateY]
  );

  useEffect(() => {
    const unsubscribe = toast.subscribe(showToast);
    return () => {
      unsubscribe();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [showToast]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value + panY.value }],
    opacity: opacity.value,
  }));

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .onUpdate((event) => {
          if (event.translationY < 0) {
            panY.value = event.translationY;
          }
        })
        .onEnd((event) => {
          const shouldDismiss = event.translationY < -30 || event.velocityY < -500;
          if (shouldDismiss) {
            runOnJS(hideToast)();
          } else {
            panY.value = withTiming(0, { duration: 180 });
          }
        }),
    [hideToast, panY]
  );

  if (!current) {
    return null;
  }

  const variantColors = (isDark ? DARK_VARIANTS : LIGHT_VARIANTS)[current.variant];
  const Icon = ICONS[current.variant];
  const titleFont = getFontFamilyWithWeight(language, 'semiBold');
  const bodyFont = getFontFamilyWithWeight(language, 'regular');

  return (
    <View pointerEvents="box-none" style={[styles.root, { top: insets.top + 12 }]}>
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            styles.toast,
            animatedStyle,
            {
              backgroundColor: variantColors.background,
              borderColor: variantColors.border,
              shadowColor: isDark ? '#000' : '#0F172A',
            },
          ]}
        >
          <View style={styles.iconContainer}>
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: hexToRgba(variantColors.icon, 0.15) },
              ]}
            >
              <Icon size={18} color={variantColors.icon} />
            </View>
          </View>

          <View style={styles.content}>
            <Text
              style={[
                styles.title,
                { color: variantColors.text, fontFamily: titleFont },
              ]}
            >
              {current.title}
            </Text>
            {current.description ? (
              <Text
                style={[
                  styles.description,
                  { color: variantColors.text, fontFamily: bodyFont },
                ]}
              >
                {current.description}
              </Text>
            ) : null}
          </View>

          <TouchableOpacity
            onPress={hideToast}
            style={styles.closeButton}
            activeOpacity={0.8}
          >
            <X size={16} color={variantColors.text} />
          </TouchableOpacity>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    start: 16,
    end: 16,
    zIndex: 9999,
    alignItems: 'center',
  },
  toast: {
    width: '100%',
    maxWidth: 480,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingEnd: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  description: {
    marginTop: 2,
    fontSize: 13,
    opacity: 0.8,
  },
  closeButton: {
    padding: 4,
  },
});
