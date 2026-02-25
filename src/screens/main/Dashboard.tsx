import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBanner } from '@/components/common/AppBanner';
import { HeroBanner } from '@/components/common/HeroBanner';
import { NotificationBell } from '@/components/common/NotificationBell';
import { PromoBanner } from '@/components/common/PromoBanner';
import { Text } from '@/components/common/Text';
import { TopResultsList } from '@/components/TopResultsList';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing } from '@/theme/spacing';
import { getTypographyStyles } from '@/theme/typography';

export function Dashboard() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { colors } = useTheme();
  const typography = getTypographyStyles(language as 'ckb' | 'ar');
  const styles = createStyles(colors, typography);
  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || '';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + 80 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitial}>
                {displayName ? displayName.trim().charAt(0).toUpperCase() : '?'}
              </Text>
            </View>
            <View style={styles.headerTextWrap}>
              <Text style={styles.greeting}>{t('goodMorning')}</Text>
              <Text style={styles.title} numberOfLines={1}>
                {displayName || t('home')}
              </Text>
            </View>
          </View>
          <NotificationBell />
        </View>

        <AppBanner />
        <HeroBanner />
        <PromoBanner />
        <TopResultsList />
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: any, typography: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.DEFAULT,
    },
    content: {
      width: '100%',
      paddingHorizontal: spacing.md,
      gap: spacing.md,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: spacing.sm,
      minWidth: 0,
    },
    avatarCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary.DEFAULT + '30',
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarInitial: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.primary.DEFAULT,
    },
    headerTextWrap: {
      flex: 1,
      minWidth: 0,
    },
    greeting: {
      ...typography.bodySmall,
      color: colors.foreground.muted,
      textAlign: 'left',
      writingDirection: 'rtl',
    },
    title: {
      ...typography.h2,
      color: colors.foreground.DEFAULT,
      textAlign: 'left',
      writingDirection: 'rtl',
    },
  });
