import { Text } from '@/components/common/Text';
import { useLanguage } from '@/contexts/LanguageContext';
import { getFontFamily } from '@/utils/getFontFamily';
import { rtlIcon, rtlRow } from '@/utils/rtl';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack: () => void;
  /** e.g. { paddingTop: insets.top } for safe area */
  style?: ViewStyle;
  /** Optional right-side element (same width as back button, 40, to keep title centered) */
  rightElement?: React.ReactNode;
}

/**
 * Standard screen header: back (40) + title + spacer. Same 3-column layout for all languages:
 * LTR: back left, title center, spacer right. RTL: layout mirrors so back right, title center.
 * Use flexDirection: 'row' only — do not use row-reverse.
 */
export function ScreenHeader({ title, subtitle, onBack, style, rightElement }: ScreenHeaderProps) {
  const { language, isRTL: rtl } = useLanguage();
  const titleFont = getFontFamily(language as 'ckb' | 'ar', 'bold');
  const subtitleFont = getFontFamily(language as 'ckb' | 'ar', 'regular');
  const titleAlign = { textAlign: 'center' as const };

  return (
    <View style={[styles.header, rtlRow(), style]}>
      <TouchableOpacity onPress={onBack} style={styles.backButton} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
        <Ionicons name="chevron-back" size={20} color="#18181B" style={rtlIcon()} />
      </TouchableOpacity>
      <View style={styles.titleCenter}>
        <Text style={[styles.title, { fontFamily: titleFont }, titleAlign, { writingDirection: 'rtl' }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle != null && subtitle !== '' ? (
          <Text style={[styles.subtitle, { fontFamily: subtitleFont }, titleAlign, { writingDirection: 'rtl' }]} numberOfLines={1} ellipsizeMode="tail">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {rightElement != null ? <View style={[styles.spacer, styles.spacerRight]}>{rightElement}</View> : <View style={styles.spacer} />}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingStart: 16,
    paddingEnd: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
    width: '100%',
  },
  backButton: {
    width: 40,
    height: 40,
    minWidth: 40,
    minHeight: 40,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 1,
    zIndex: 10,
  },
  spacer: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spacerRight: {
    width: undefined,
    minWidth: 40,
  },
  titleCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#18181B',
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
});
