import { ScreenHeader } from '@/components/common/ScreenHeader';
import { Text } from '@/components/common/Text';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useOwnerAuth } from '@/hooks/useOwnerAuth';
import { supabaseRead } from '@/integrations/supabase/client';
import { getCached, setCached } from '@/services/globalCache';
import { borderRadius, spacing } from '@/theme/spacing';
import { getTypographyStyles } from '@/theme/typography';
import { getFontFamilyByLanguage } from '@/utils/fonts';
import { ltrNumber } from '@/utils/rtl';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import {
  AlertTriangle,
  Bell,
  ChevronRight,
  CreditCard,
  Crown,
  FileText,
  Globe,
  HelpCircle,
  Palette,
  RefreshCw,
  Scale,
  Settings,
  Shield,
  User,
  Wallet
} from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, InteractionManager, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Profile {
  full_name: string | null;
  wallet_balance: number;
}

const PROFILE_CACHE_KEY = 'profile_cache';

export function Profile() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const { t, language, isRTL } = useLanguage();
  const { colors } = useTheme();
  const { isOwner, loading: ownerLoading } = useOwnerAuth();
  const typography = getTypographyStyles(language as 'ckb' | 'ar');
  const fontFamily = getFontFamilyByLanguage(language as 'ckb' | 'ar');
  const styles = createStyles(colors, typography, fontFamily, isRTL);
  const cachedProfile = getCached<Profile | null>('profile', null);
  const [profile, setProfile] = useState<Profile | null>(cachedProfile);
  const [loading, setLoading] = useState(!cachedProfile);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [comingSoonMessage, setComingSoonMessage] = useState('');
  const lastFetchRef = useRef(0);
  const MIN_FETCH_INTERVAL = 2000;

  useEffect(() => {
    let isMounted = true;

    const loadCachedThenFetch = async () => {
      try {
        const cached = await AsyncStorage.getItem(PROFILE_CACHE_KEY);
        if (cached && isMounted) {
          setProfile(JSON.parse(cached));
          setLoading(false);
        }
      } catch (error) {
        console.warn('Failed to load cached profile:', error);
      }

      if (user) {
        InteractionManager.runAfterInteractions(() => {
          fetchProfile();
        });
      } else if (isMounted) {
        setLoading(false);
      }
    };

    loadCachedThenFetch();

    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const channel = supabaseRead
      .channel(`user-profile-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const incoming = payload.new as Profile | undefined;
          if (incoming) {
            setProfile(incoming);
            AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(incoming)).catch(() => {});
          }
        }
      )
      .subscribe();

    return () => {
      supabaseRead.removeChannel(channel);
    };
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const now = Date.now();
      if (now - lastFetchRef.current < MIN_FETCH_INTERVAL) {
        return;
      }
      lastFetchRef.current = now;

      const { data } = await supabaseRead
        .from('profiles')
        .select('full_name, wallet_balance')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setProfile(data);
        setCached('profile', data);
        await AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(data));
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (loggingOut) return;
    setLoggingOut(true);
    signOut()
      .catch((error) => {
        console.error('[Profile] Logout error:', error);
        Alert.alert(
          t('error') || 'Error',
          t('logoutError') || 'Failed to log out. Please try again.'
        );
      })
      .finally(() => {
        setLoggingOut(false);
      });
  };

  const menuItems = [
    {
      icon: User,
      label: t('personalInfo'),
      screen: 'PersonalInfo',
    },
    {
      icon: Wallet,
      label: t('walletAndBalance'),
      screen: 'WalletBalance',
    },
    {
      icon: CreditCard,
      label: t('paymentMethods'),
      screen: 'PaymentMethods',
    },
    {
      icon: FileText,
      label: t('transactionHistory'),
      screen: 'TransactionHistory',
    },
    {
      icon: Bell,
      label: t('notificationSettings'),
      screen: 'NotificationSettings',
    },
    {
      icon: Shield,
      label: t('privacySecurity'),
      screen: 'PrivacySecurity',
    },
    {
      icon: Globe,
      label: t('languageSettings'),
      screen: 'LanguageSettings',
    },
    {
      icon: Palette,
      label: t('appearance'),
      screen: 'AppearanceSettings',
    },
    {
      icon: HelpCircle,
      label: t('helpSupport'),
      screen: 'HelpSupport',
    },
    {
      icon: Scale,
      label: t('legalDocuments'),
      screen: 'LegalDocuments',
    },
    {
      icon: Settings,
      label: t('faq'),
      screen: 'FAQ',
    },
  ];

  const handleGoBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      // If no previous screen, navigate to Main dashboard
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' as never }],
      });
    }
  };

  const openComingSoon = (message: string) => {
    setComingSoonMessage(message);
    setShowComingSoon(true);
  };

  return (
    <View style={styles.container}>
      <Modal
        visible={showComingSoon}
        transparent
        animationType="fade"
        onRequestClose={() => setShowComingSoon(false)}
      >
        <View style={styles.comingSoonBackdrop}>
          <View style={styles.comingSoonCard}>
            <View style={styles.comingSoonHeader}>
              <View style={styles.comingSoonIconWrap}>
                <AlertTriangle size={26} color="#FFFFFF" />
              </View>
              <Text style={styles.comingSoonTitle}>{t('comingSoon') || 'Coming Soon'}</Text>
            </View>
            <View style={styles.comingSoonBody}>
              <Text style={styles.comingSoonText}>{comingSoonMessage}</Text>
            </View>
            <TouchableOpacity
              style={styles.comingSoonButton}
              onPress={() => setShowComingSoon(false)}
            >
              <Text style={styles.comingSoonButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <ScreenHeader
        title={t('profile')}
        onBack={handleGoBack}
        style={{ paddingTop: insets.top + 8 }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.screenInner}>
        {/* Profile Header Card */}
        <View style={styles.profileHeaderCard}>
          <View style={styles.profileHeaderContent}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(profile?.full_name || user?.user_metadata?.full_name || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName} numberOfLines={1} ellipsizeMode="tail">
                {profile?.full_name || user?.user_metadata?.full_name || 'User'}
              </Text>
              <Text style={styles.profileEmail} numberOfLines={1} ellipsizeMode="tail">
                {user?.email && !user.email.includes('@rekto.phone') ? user.email : ''}
              </Text>
            </View>
          </View>
        </View>

        {/* ACCOUNT Section */}
        <View style={styles.menuSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>{t('account') || 'Account'}</Text>
          </View>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('ProfileStack', { screen: 'PersonalInfo' })}
          >
            <User size={20} color={colors.primary.DEFAULT} style={styles.menuItemIcon} />
            <Text style={styles.menuItemText} numberOfLines={1}>{t('personalInfo')}</Text>
            <ChevronRight size={20} color={colors.foreground.muted} style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() =>
              openComingSoon(
                t('walletComingSoon') || 'Wallet balance is not supported yet.'
              )
            }
          >
            <Wallet size={20} color={colors.primary.DEFAULT} style={styles.menuItemIcon} />
            <Text style={styles.menuItemText} numberOfLines={1}>{t('walletAndBalance')}</Text>
            <Text style={[styles.menuItemValue, ltrNumber]}>${(profile?.wallet_balance || 0).toFixed(0)}</Text>
            <ChevronRight size={20} color={colors.foreground.muted} style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() =>
              openComingSoon(
                t('paymentMethodsComingSoon') || 'Payment methods are not supported yet.'
              )
            }
          >
            <CreditCard size={20} color={colors.primary.DEFAULT} style={styles.menuItemIcon} />
            <Text style={styles.menuItemText} numberOfLines={1}>{t('paymentMethods')}</Text>
            <ChevronRight size={20} color={colors.foreground.muted} style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }} />
          </TouchableOpacity>
        </View>

        {/* BILLING Section */}
        <View style={styles.menuSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>{t('billing') || 'Billing'}</Text>
          </View>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('ProfileStack', { screen: 'TransactionHistory' })}
          >
            <RefreshCw size={20} color={colors.primary.DEFAULT} style={styles.menuItemIcon} />
            <Text style={styles.menuItemText} numberOfLines={1}>{t('transactionHistory')}</Text>
            <ChevronRight size={20} color={colors.foreground.muted} style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              navigation.navigate('InvoiceHistory' as never);
            }}
          >
            <FileText size={20} color={colors.primary.DEFAULT} style={styles.menuItemIcon} />
            <Text style={styles.menuItemText} numberOfLines={1}>{t('invoices') || 'Invoices'}</Text>
            <ChevronRight size={20} color={colors.foreground.muted} style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }} />
          </TouchableOpacity>
        </View>

        {/* PREFERENCES Section */}
        <View style={styles.menuSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>{t('preferences') || 'Preferences'}</Text>
          </View>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('ProfileStack', { screen: 'PrivacySecurity' })}
          >
            <Shield size={20} color={colors.primary.DEFAULT} style={styles.menuItemIcon} />
            <Text style={styles.menuItemText} numberOfLines={1}>{t('privacySecurity')}</Text>
            <ChevronRight size={20} color={colors.foreground.muted} style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('ProfileStack', { screen: 'LanguageSettings' })}
          >
            <Globe size={20} color={colors.primary.DEFAULT} style={styles.menuItemIcon} />
            <Text style={styles.menuItemText} numberOfLines={1}>{t('languageSettings')}</Text>
            <Text style={styles.menuItemValue} numberOfLines={1}>
              {language === 'ckb' ? 'کوردی' : 'العربية'}
            </Text>
            <ChevronRight size={20} color={colors.foreground.muted} style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('ProfileStack', { screen: 'AppearanceSettings' })}
          >
            <Palette size={20} color={colors.primary.DEFAULT} style={styles.menuItemIcon} />
            <Text style={styles.menuItemText} numberOfLines={1}>{t('appearance')}</Text>
            <ChevronRight size={20} color={colors.foreground.muted} style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }} />
          </TouchableOpacity>
        </View>

        {/* SUPPORT Section */}
        <View style={styles.menuSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>{t('support') || 'SUPPORT'}</Text>
          </View>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('ProfileStack', { screen: 'FAQ' })}
          >
            <HelpCircle size={20} color={colors.primary.DEFAULT} style={styles.menuItemIcon} />
            <Text style={styles.menuItemText} numberOfLines={1}>{t('faq')}</Text>
            <ChevronRight size={20} color={colors.foreground.muted} style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('ProfileStack', { screen: 'HelpSupport' })}
          >
            <HelpCircle size={20} color={colors.primary.DEFAULT} style={styles.menuItemIcon} />
            <Text style={styles.menuItemText} numberOfLines={1}>{t('helpSupport')}</Text>
            <ChevronRight size={20} color={colors.foreground.muted} style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }} />
          </TouchableOpacity>
        </View>

        {/* ADMIN Section - Only visible to owners */}
        {!ownerLoading && isOwner && (
          <View style={styles.menuSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>ADMIN</Text>
            </View>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate('OwnerDashboard')}
            >
              <Crown size={20} color={colors.primary.DEFAULT} style={styles.menuItemIcon} />
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemText} numberOfLines={1}>{t('ownerDashboard') || 'Owner Dashboard'}</Text>
                <Text style={styles.menuItemSubtext}>بەڕێوەبەری ئادمین</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
        

        {/* Logout Button */}
        <TouchableOpacity 
          style={styles.logoutButton} 
          onPress={handleLogout}
          activeOpacity={0.7}
          disabled={loggingOut}
        >
          <Text style={styles.logoutText}>
            → {loggingOut ? (t('loggingOut') || 'Logging out...') : t('logout')}
          </Text>
        </TouchableOpacity>

        {/* App Version */}
        <Text style={styles.versionText}>Rekto v1.0.0</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any, typography: any, fontFamily: string, isRTL: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.DEFAULT,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 40,
    alignItems: 'stretch',
  },
  screenInner: {
    paddingHorizontal: 16,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingStart: spacing.md,
    paddingEnd: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.card.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    zIndex: 10,
  },
  backButtonCircle: {
    width: 40,
    height: 40,
    minWidth: 40,
    minHeight: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLeftSlot: {
    minWidth: 100,
    maxWidth: 100,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerRightSlot: {
    minWidth: 100,
    maxWidth: 100,
  },
  backButtonText: {
    ...typography.body,
    fontSize: 16,
    color: colors.foreground.DEFAULT,
    fontFamily: fontFamily,
  },
  headerTitle: {
    ...typography.h3,
    fontSize: 18,
    color: colors.foreground.DEFAULT,
    flex: 1,
    textAlign: 'center',
    fontFamily: fontFamily,
  },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: '100%',
  },
  contentContainer: {
    paddingStart: spacing.lg,
    paddingEnd: spacing.lg,
    paddingTop: spacing.sm,
    width: '100%',
    maxWidth: '100%',
    alignSelf: 'stretch',
  },
  profileHeaderCard: {
    width: '100%',
    maxWidth: '100%',
    alignSelf: 'stretch',
    backgroundColor: colors.card.background,
    borderRadius: borderRadius.card,
    padding: spacing.md + 4,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
    flexWrap: 'wrap',
  },
  profileHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary.DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    ...typography.h1,
    fontSize: 24,
    color: '#fff',
    fontFamily: fontFamily,
  },
  profileInfo: {
    flex: 1,
    width: '100%',
    minWidth: 0,
    flexShrink: 1,
    alignItems: 'flex-start',
  },
  profileName: {
    ...typography.h2,
    fontSize: 20,
    color: colors.foreground.DEFAULT,
    marginBottom: 2,
    fontFamily: fontFamily,
    textAlign: 'left',
    writingDirection: 'rtl',
    flex: 1,
    alignSelf: 'stretch',
  },
  profileEmail: {
    ...typography.bodySmall,
    fontSize: 14,
    color: colors.foreground.muted,
    fontFamily: fontFamily,
    textAlign: 'left',
    writingDirection: 'rtl',
    flex: 1,
    alignSelf: 'stretch',
  },
  rektoLogo: {
    alignSelf: 'center',
  },
  rektoLogoImage: {
    width: '100%',
    maxWidth: 190,
    height: 120,
  },
  menuSection: {
    width: '100%',
    maxWidth: '100%',
    alignSelf: 'stretch',
    backgroundColor: colors.card.background,
    borderRadius: borderRadius.card,
    marginBottom: spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.card.border,
    flexWrap: 'wrap',
  },
  sectionHeader: {
    flexDirection: 'row',
    width: '100%',
    paddingStart: spacing.md,
    paddingEnd: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    alignItems: 'flex-start',
  },
  sectionHeaderText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '600',
    color: '#71717A',
    textTransform: 'uppercase',
    textAlign: 'left',
    writingDirection: 'rtl',
    letterSpacing: 1,
    fontFamily: fontFamily,
    width: '100%',
    alignSelf: 'stretch',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: spacing.md + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
    gap: spacing.md,
    minHeight: 56,
  },
  menuItemContent: {
    flex: 1,
    justifyContent: 'center',
  },
  menuItemText: {
    fontSize: 16,
    color: colors.foreground.DEFAULT,
    fontWeight: '500',
    flex: 1,
    fontFamily: fontFamily,
    flexShrink: 1,
    minWidth: 0,
    textAlign: 'left',
    writingDirection: 'rtl',
    width: '100%',
    alignSelf: 'stretch',
  },
  menuItemIcon: {
    marginEnd: 12,
  },
  menuItemValue: {
    fontSize: 14,
    color: colors.primary.DEFAULT,
    fontWeight: '600',
    marginEnd: spacing.xs,
    fontFamily: fontFamily,
    flexShrink: 0,
    maxWidth: '45%',
    textAlign: 'left',
    writingDirection: 'rtl',
  },
  menuItemSubtext: {
    fontSize: 12,
    color: colors.foreground.muted,
    marginTop: 2,
    fontFamily: fontFamily,
    textAlign: 'left',
    writingDirection: 'rtl',
  },
  comingSoonBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  comingSoonCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  comingSoonHeader: {
    backgroundColor: '#EF4444',
    paddingVertical: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  comingSoonIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  comingSoonTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'left',
    writingDirection: 'rtl',
  },
  comingSoonBody: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  comingSoonText: {
    fontSize: 14,
    color: '#111827',
    textAlign: 'center',
    lineHeight: 20,
    writingDirection: 'rtl',
  },
  comingSoonButton: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    backgroundColor: '#EF4444',
    alignItems: 'center',
  },
  comingSoonButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
    textAlign: 'left',
    writingDirection: 'rtl',
  },
  logoutButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    padding: spacing.md + 4,
    borderRadius: borderRadius.card,
    marginTop: spacing.lg,
    borderWidth: 2,
    borderColor: colors.error,
  },
  logoutText: {
    ...typography.body,
    fontSize: 16,
    fontWeight: '600',
    color: colors.error,
    fontFamily: fontFamily,
    textAlign: 'left',
    writingDirection: 'rtl',
  },
  versionText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.foreground.muted,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xl,
    fontFamily: fontFamily,
  },
});
