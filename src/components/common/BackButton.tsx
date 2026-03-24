/**
 * Shared back button using chevron icon (same shape as chevron-right.svg / Tabler).
 * LTR: chevron left. RTL: chevron right. Min 40x40 tap area.
 */
import { ChevronBackIcon } from '@/components/icons/ChevronBackIcon';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import React from 'react';
import { StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';

const ICON_SIZE = 24;

export interface BackButtonProps {
  onPress: () => void;
  /** Override color (default: theme foreground) */
  color?: string;
  style?: ViewStyle;
  /** Default true */
  visible?: boolean;
}

export function BackButton({ onPress, color, style, visible = true }: BackButtonProps) {
  const { isRTL } = useLanguage();
  const { colors, isDark } = useTheme();
  const fg = color ?? (colors.foreground?.DEFAULT ?? (isDark ? '#FAFAFA' : '#18181B'));

  if (!visible) return null;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.button, style]}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      activeOpacity={0.7}
    >
      <ChevronBackIcon size={ICON_SIZE} color={fg} isRTL={isRTL} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    minWidth: 40,
    minHeight: 40,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E4E4E7',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 1,
    zIndex: 10,
  },
});
