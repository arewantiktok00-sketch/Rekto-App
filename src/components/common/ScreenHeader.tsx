import { BackButton } from '@/components/common/BackButton';
import { Text } from '@/components/common/Text';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { getFontFamily } from '@/utils/getFontFamily';
import { rtlRow } from '@/utils/rtl';
import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

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
  const { colors, isDark } = useTheme();
  const titleFont = getFontFamily(language as 'ckb' | 'ar', 'bold');
  const subtitleFont = getFontFamily(language as 'ckb' | 'ar', 'regular');
  const titleAlign = { textAlign: rtl ? 'right' as const : 'center' as const };
  const headerStyles = createStyles(colors, rtl);

  return (
    <View style={[headerStyles.header, rtlRow(), style]}>
      <BackButton
        onPress={onBack}
        style={[headerStyles.backButton, { borderColor: isDark ? '#27272A' : '#E4E4E7' }]}
      />
      <View style={headerStyles.titleCenter}>
        <Text style={[headerStyles.title, { fontFamily: titleFont }, titleAlign, { writingDirection: 'rtl' }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle != null && subtitle !== '' ? (
          <Text style={[headerStyles.subtitle, { fontFamily: subtitleFont }, titleAlign, { writingDirection: 'rtl' }]} numberOfLines={1} ellipsizeMode="tail">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {rightElement != null ? <View style={[headerStyles.spacer, headerStyles.spacerRight]}>{rightElement}</View> : <View style={headerStyles.spacer} />}
    </View>
  );
}

const createStyles = (colors: any, rtl?: boolean) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingStart: 16,
    paddingEnd: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border?.DEFAULT ?? '#F1F5F9',
    backgroundColor: colors.background?.DEFAULT ?? colors.card?.background ?? '#FFFFFF',
    width: '100%',
  },
  backButton: {
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
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.foreground?.DEFAULT ?? '#18181B',
  },
  subtitle: {
    fontSize: 13,
    color: colors.foreground?.muted ?? '#94A3B8',
    marginTop: 2,
  },
});
