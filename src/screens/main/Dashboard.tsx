import { useNavigation } from '@react-navigation/native';
import { HelpCircle, Link2, Plus } from 'lucide-react-native';
import { Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { DashboardAwaitingPayment } from '@/components/DashboardAwaitingPayment';
import { DashboardFaqSection } from '@/components/DashboardFaqSection';
import { TopResultsList } from '@/components/TopResultsList';
import { HeroBanner } from '@/components/common/HeroBanner';
import { NotificationBell } from '@/components/common/NotificationBell';
import { PromoBanner } from '@/components/common/PromoBanner';
import { Text } from '@/components/common/Text';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRemoteConfig } from '@/contexts/RemoteConfigContext';
import { useTheme } from '@/contexts/ThemeContext';
import { borderRadius, spacing } from '@/theme/spacing';
import { getTypographyStyles } from '@/theme/typography';
import { isRTL } from '@/utils/rtl';

const GRADIENT_COLORS = ['#7C3AED', '#9333EA'] as const;

export function Dashboard() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { isFeatureEnabled, isPaymentsHidden } = useRemoteConfig();
  const { colors, isDark } = useTheme();
  const primaryColor = colors?.primary?.DEFAULT ?? '#7C3AED';
  const headerLogo = isDark ? require('../../../assets/images/iconDarkmode.png') : require('../../../assets/images/logo.png');
  const typography = getTypographyStyles(language as 'ckb' | 'ar');
  const rtl = isRTL(language);
  const styles = createStyles(colors, typography, rtl);
  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || '';

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeAreaTop}>
        <View style={styles.headerOuter}>
          {/* HEADER: avatar LEFT, Rekto logo CENTER, bell RIGHT – matches reference UI */}
          <View style={styles.header}>
            {/* Left: profile avatar */}
            <TouchableOpacity
              onPress={() => (navigation as any).navigate('ProfileStack', { screen: 'Profile' })}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.8}
              style={styles.headerSide}
            >
              <LinearGradient
                colors={['#7C3AED', '#6D28D9']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatarCircle}
              >
                <Text style={styles.avatarInitial}>
                  {displayName ? displayName.trim().charAt(0).toUpperCase() : '?'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Center: Rekto logo (dark mode uses iconDarkmode) */}
            <View style={styles.headerCenter} pointerEvents="none">
              <Image
                source={headerLogo}
                style={styles.rektoLogo}
                resizeMode="contain"
              />
            </View>

            {/* Right: notification bell */}
            <View style={[styles.headerSide, styles.headerSideRight]}>
              <NotificationBell />
            </View>
          </View>
        </View>
      </SafeAreaView>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        showsVerticalScrollIndicator={false}
      >
      <View style={styles.content}>
        <HeroBanner />
        {!isPaymentsHidden && <PromoBanner />}

        {!isPaymentsHidden && isFeatureEnabled('ad_creation_enabled') && (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => (navigation as any).navigate('Main', { screen: 'CreateAd' })}
            style={styles.createAdButtonWrap}
          >
            <LinearGradient
              colors={[...GRADIENT_COLORS]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.createAdButton}
            >
              <Plus size={24} color="#FFFFFF" />
              <Text style={styles.createAdButtonText}>{t('createNewAdButton')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {!isPaymentsHidden && <DashboardAwaitingPayment />}

        {/* Quick Action: Create Links Page */}
        <TouchableOpacity
          style={styles.quickActionCard}
          activeOpacity={0.8}
          onPress={() => (navigation as any).navigate('Main', { screen: 'Links' })}
        >
          <View style={styles.quickActionIconWrap}>
            <Link2 size={22} color={primaryColor} />
          </View>
          <View style={styles.quickActionTextWrap}>
            <Text style={styles.quickActionTitle}>{t('createLinksPage')}</Text>
            <Text style={styles.quickActionSubtitle}>{t('goToCommunication')}</Text>
          </View>
        </TouchableOpacity>

        {/* Quick Action: Tutorial */}
        <TouchableOpacity
          style={styles.quickActionCard}
          activeOpacity={0.8}
          onPress={() => (navigation as any).navigate('Main', { screen: 'Tutorial' })}
        >
          <View style={styles.quickActionIconWrap}>
            <HelpCircle size={22} color={primaryColor} />
          </View>
          <View style={styles.quickActionTextWrap}>
            <Text style={styles.quickActionTitle}>{t('dontKnowHowToUse')}</Text>
            <Text style={styles.quickActionSubtitle}>{t('goToTutorial')}</Text>
          </View>
        </TouchableOpacity>

        <TopResultsList />
        <DashboardFaqSection />
      </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any, typography: any, rtl: boolean) => {
  const backgroundDefault = colors?.background?.DEFAULT ?? '#FAFAFA';
  const foregroundDefault = colors?.foreground?.DEFAULT ?? '#111827';
  const foregroundMuted = colors?.foreground?.muted ?? '#6B7280';
  const primaryDefault = colors?.primary?.DEFAULT ?? '#7C3AED';
  const borderDefault = colors?.border?.DEFAULT ?? '#E5E7EB';
  const cardBackground = colors?.card?.background ?? '#FFFFFF';

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: backgroundDefault,
    },
    safeAreaTop: {
      backgroundColor: backgroundDefault,
    },
    headerOuter: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 4,
    },
    scrollView: {
      flex: 1,
    },
    content: {
      width: '100%',
      paddingHorizontal: spacing.md,
      gap: 16,
      paddingTop: spacing.sm,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerSide: {
      width: 72,
      alignItems: 'flex-start',
      justifyContent: 'center',
    },
    headerSideRight: {
      alignItems: 'flex-end',
    },
    headerCenter: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 0,
    },
    rektoLogo: {
      height: 28,
      width: 100,
    },
    greeting: {
      fontSize: 14,
      color: foregroundMuted,
      textAlign: 'right',
      writingDirection: 'rtl',
      ...typography.bodySmall,
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: foregroundDefault,
      textAlign: 'right',
      writingDirection: 'rtl',
    },
    avatarCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarInitial: {
      fontSize: 18,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    createAdButtonWrap: {
      width: '100%',
      borderRadius: borderRadius.card,
      overflow: 'hidden',
      shadowColor: '#7C3AED',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 12,
      elevation: 8,
    },
    createAdButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      height: 64,
      paddingHorizontal: 24,
      borderRadius: borderRadius.card,
    },
    createAdButtonText: {
      fontSize: 18,
      fontWeight: '700',
      color: '#FFFFFF',
      textAlign: 'center',
    },
    quickActionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
      height: 56,
      paddingHorizontal: 16,
      borderRadius: borderRadius.card,
      borderWidth: 2,
      borderColor: primaryDefault + '30',
      backgroundColor: primaryDefault + '0D',
    },
    quickActionIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: primaryDefault + '1A',
      alignItems: 'center',
      justifyContent: 'center',
      marginEnd: 12,
    },
    quickActionTextWrap: {
      flex: 1,
      minWidth: 0,
    },
    quickActionTitle: {
      ...typography.body,
      fontWeight: '700',
      color: foregroundDefault,
      textAlign: 'right',
      writingDirection: 'rtl',
      alignSelf: 'flex-start',
    },
    quickActionSubtitle: {
      ...typography.bodySmall,
      color: foregroundMuted,
      textAlign: 'right',
      writingDirection: 'rtl',
      marginTop: 2,
      alignSelf: 'flex-start',

    },
  });
};
