import { ScreenHeader } from '@/components/common/ScreenHeader';
import { LTRNumber, Text } from '@/components/common/Text';
import { SocialFacebookIcon } from '@/components/icons/SocialFacebookIcon';
import { SocialInstagramIcon } from '@/components/icons/SocialInstagramIcon';
import { SocialTikTokIcon } from '@/components/icons/SocialTikTokIcon';
import { SocialYoutubeIcon } from '@/components/icons/SocialYoutubeIcon';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRemoteConfig } from '@/contexts/RemoteConfigContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useOwnerAuth } from '@/hooks/useOwnerAuth';
import { usePricingConfig } from '@/hooks/usePricingConfig';
import { supabase, supabaseRead } from '@/integrations/supabase/client';
import { getCached, setCached } from '@/services/globalCache';
import { borderRadius, spacing } from '@/theme/spacing';
import { getTypographyStyles } from '@/theme/typography';
import { getAvatarGradient } from '@/utils/avatar';
import { formatIQDLatinDigitsOnly, formatIntegerLatinDigitsOnly, formatUSDLatinDigitsOnly } from '@/utils/currency';
import { getFontFamilyByLanguage } from '@/utils/fonts';
import { formatPhoneForDisplay, isPhoneBasedEmail } from '@/utils/phone';
import { requestReview } from '@/utils/widgetBridge';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  Crown,
  DollarSign,
  FileText,
  HelpCircle,
  MessageCircle,
  Pencil,
  Shield,
  Star,
  Trash2,
  User,
  Wallet
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, InteractionManager, Linking, Modal, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Profile {
  full_name: string | null;
  wallet_balance: number;
  phone_number?: string | null;
}

const PROFILE_CACHE_KEY = 'profile_cache';

export function Profile() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const { t, language, isRTL, setLanguage } = useLanguage();
  const { isPaymentsHidden } = useRemoteConfig();
  const { colors, themeMode, setThemeMode } = useTheme();
  const { hasAdminAccess, loading: ownerLoading } = useOwnerAuth();
  const { convertToIQD } = usePricingConfig();
  const typography = getTypographyStyles(language as 'ckb' | 'ar');
  const fontFamily = getFontFamilyByLanguage(language as 'ckb' | 'ar');
  const isDark = themeMode === 'dark';
  const styles = createStyles(colors, typography, fontFamily, isRTL, isDark);
  const cachedProfile = getCached<Profile | null>('profile', null);
  const [profile, setProfile] = useState<Profile | null>(cachedProfile);
  const avatarGradient = useMemo(
    () => getAvatarGradient(user?.id, profile?.full_name ?? user?.user_metadata?.full_name),
    [user?.id, profile?.full_name, user?.user_metadata?.full_name]
  );
  const [completedCount, setCompletedCount] = useState(0);
  const [totalSpendFromCompleted, setTotalSpendFromCompleted] = useState(0);
  const [loading, setLoading] = useState(!cachedProfile);
  const [loggingOut, setLoggingOut] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [comingSoonMessage, setComingSoonMessage] = useState('');
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const balanceModalAnim = useRef(new Animated.Value(0)).current;
  const lastFetchRef = useRef(0);
  const MIN_FETCH_INTERVAL = 2000;
  const queryClient = useQueryClient();

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
          fetchCompletedStats();
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

  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchProfile();
        fetchCompletedStats();
      }
    }, [user])
  );

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
        .select('full_name, wallet_balance, phone_number')
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

  const fetchCompletedStats = async () => {
    if (!user) return;
    try {
      const { count } = await supabaseRead
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'completed');

      const { data: spendData } = await supabaseRead
        .from('campaigns')
        .select('spend')
        .eq('user_id', user.id)
        .eq('status', 'completed');

      const totalSpend =
        (spendData as Array<{ spend: number | null }> | null)?.reduce(
          (sum, c) => sum + (c.spend || 0),
          0,
        ) ?? 0;
      setCompletedCount(count ?? 0);
      setTotalSpendFromCompleted(totalSpend);
    } catch (error) {
      console.error('Error fetching completed stats:', error);
    }
  };

  const handleLogout = () => {
    if (loggingOut) return;
    setLoggingOut(true);
    signOut()
      .catch((error) => {
        console.error('[Profile] Logout error:', error);
        Alert.alert(t('error'), t('logoutError'));
      })
      .finally(() => {
        setLoggingOut(false);
      });
  };

  const handleDeleteAccount = () => {
    const confirmationTitle =
      language === 'ar'
        ? 'حذف الحساب'
        : language === 'ckb'
          ? 'سڕینەوەی هەژمار'
          : 'Delete Account';

    const confirmationMessage =
      language === 'ar'
        ? 'هل أنت متأكد أنك تريد حذف حسابك؟\nهذا الإجراء نهائي ولا يمكن التراجع عنه.'
        : language === 'ckb'
          ? 'دڵنیایت لە سڕینەوەی هەژمارت؟\nئەم کردارە هەمیشەییە و ناگەڕێتەوە.'
          : 'Are you sure you want to delete your account?\nThis action is permanent and cannot be undone.';

    const cancelLabel = language === 'ar' ? 'إلغاء' : language === 'ckb' ? 'هەڵوەشاندنەوە' : 'Cancel';
    const confirmLabel = language === 'ar' ? 'حذف الحساب' : language === 'ckb' ? 'سڕینەوەی هەژمار' : 'Delete Account';

    Alert.alert(
      confirmationTitle,
      confirmationMessage,
      [
        { text: cancelLabel, style: 'cancel' },
        {
          text: confirmLabel,
          style: 'destructive',
          onPress: handleDeleteAccountApi,
        },
      ]
    );
  };

  const handleDeleteAccountApi = async () => {
    setDeleteLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-account');
      if (error) throw error;

      if (data.success) {
        await supabase.auth.signOut();
        await AsyncStorage.clear();
        queryClient.clear();
        navigation.reset({
          index: 0,
          routes: [{ name: 'Auth' as never }],
        });
      } else {
        Alert.alert('Error', 'Failed to delete account. Please try again.');
      }
    } catch (err: any) {
      Alert.alert('Error', 'Failed to delete account. Please try again.');
    } finally {
      setDeleteLoading(false);
    }
  };

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

  const openBalanceModal = () => {
    setShowBalanceModal(true);
    Animated.parallel([
      Animated.timing(balanceModalAnim, { toValue: 1, useNativeDriver: true, duration: 200 }),
    ]).start();
  };

  const closeBalanceModal = () => {
    Animated.timing(balanceModalAnim, { toValue: 0, useNativeDriver: true, duration: 150 }).start(() => {
      setShowBalanceModal(false);
    });
  };

  const balanceBackdropOpacity = balanceModalAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const balanceScale = balanceModalAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] });
  const profileSubtitle = useMemo(() => {
    const profilePhone = profile?.phone_number?.trim();
    const authPhone = user?.phone?.trim();
    const email = user?.email?.trim() || '';

    if (profilePhone) return formatPhoneForDisplay(profilePhone);
    if (authPhone) return formatPhoneForDisplay(authPhone);
    if (email && !isPhoneBasedEmail(email)) return email;
    return '';
  }, [profile?.phone_number, user?.email, user?.phone]);

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
              <Text style={styles.comingSoonTitle}>{t('comingSoon')}</Text>
            </View>
            <View style={styles.comingSoonBody}>
              <Text style={styles.comingSoonText}>{comingSoonMessage}</Text>
            </View>
            <TouchableOpacity
              style={styles.comingSoonButton}
              onPress={() => setShowComingSoon(false)}
            >
              <Text style={styles.comingSoonButtonText}>{t('ok')}</Text>
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

          {/* 1) HEADER: avatar + edit overlay, name, subtitle */}
          <View style={styles.profileHeader}>
            <View style={styles.avatarWrap}>
              <LinearGradient
                colors={avatarGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatarCircle}
              >
                <Text style={styles.avatarLetter}>
                  {(profile?.full_name || user?.user_metadata?.full_name || '?').charAt(0).toUpperCase()}
                </Text>
              </LinearGradient>
              <TouchableOpacity
                style={styles.avatarEditButton}
                onPress={() => navigation.navigate('ProfileStack', { screen: 'PersonalInfo' })}
                activeOpacity={0.8}
              >
                <Pencil size={14} color="#7C3AED" />
              </TouchableOpacity>
            </View>
            <Text style={styles.profileName} numberOfLines={1}>
              {profile?.full_name || user?.user_metadata?.full_name || t('profile')}
            </Text>
            <Text style={styles.profileSubtitle} numberOfLines={1}>
              {profileSubtitle}
            </Text>
          </View>

          {/* 2) SMALL BALANCE CARD - tappable, opens modal */}
          {!isPaymentsHidden && (
            <TouchableOpacity
              style={styles.balanceCard}
              onPress={openBalanceModal}
              activeOpacity={0.9}
            >
              <View style={styles.balanceRow}>
                <Wallet size={20} color={colors.foreground.muted} />
                <View style={styles.balanceContent}>
                  <Text style={styles.balanceLabel}>{t('walletAndBalance')}</Text>
                  <LTRNumber weight="medium" style={styles.balanceAmount}>
                    {formatIQDLatinDigitsOnly(convertToIQD(profile?.wallet_balance ?? 0))}
                  </LTRNumber>
                </View>
              </View>
            </TouchableOpacity>
          )}

          {/* 3) TWO SEPARATE STAT BOXES - from campaigns query */}
          <View style={styles.statBoxesRow}>
            <View style={[styles.statBox, isPaymentsHidden && styles.statBoxFull]}>
              <CheckCircle size={22} color="#22C55E" />
              <LTRNumber weight="bold" style={styles.statNumber}>
                {formatIntegerLatinDigitsOnly(completedCount)}
              </LTRNumber>
              <Text style={styles.statLabel}>{t('completedCampaigns')}</Text>
            </View>
            {!isPaymentsHidden && (
              <View style={styles.statBox}>
                <DollarSign size={22} color="#7C3AED" />
                {/* Total spend: must bypass custom Text (Rabar) — LTRNumber + Poppins + ASCII-only string */}
                <LTRNumber weight="medium" style={styles.statNumberSpend}>
                  {formatUSDLatinDigitsOnly(totalSpendFromCompleted)}
                </LTRNumber>
                <Text style={styles.statLabel}>{language === 'ckb' ? 'کۆی خەرجی' : t('totalSpend')}</Text>
              </View>
            )}
          </View>

          {/* 4) ACTION CARDS - each its own card */}
          <View style={styles.actionCardsSection}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('ProfileStack', { screen: 'PersonalInfo' })}
              activeOpacity={0.85}
            >
              <View style={styles.actionCardIconWrap}>
                <User size={20} color="#7C3AED" />
              </View>
              <View style={styles.actionCardTextWrap}>
                <Text style={styles.actionCardTitle}>{t('personalInfo')}</Text>
                <Text style={styles.actionCardSubtitle}>{t('profile')}</Text>
              </View>
              <ChevronRight size={18} color={colors.foreground.muted} style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }} />
            </TouchableOpacity>

            {!isPaymentsHidden && (
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => navigation.navigate('ProfileStack', { screen: 'BillingHistory' })}
                activeOpacity={0.85}
              >
                <View style={styles.actionCardIconWrap}>
                  <FileText size={20} color="#7C3AED" />
                </View>
                <View style={styles.actionCardTextWrap}>
                  <Text style={styles.actionCardTitle}>مامەڵەکان</Text>
                  <Text style={styles.actionCardSubtitle}>مامەڵەکان و پسووڵەکان</Text>
                </View>
                <ChevronRight size={18} color={colors.foreground.muted} style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }} />
              </TouchableOpacity>
            )}

            {!isPaymentsHidden && (
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => navigation.navigate('ProfileStack', { screen: 'WalletBalance' })}
                activeOpacity={0.85}
              >
                <View style={styles.actionCardIconWrap}>
                  <Wallet size={20} color="#7C3AED" />
                </View>
                <View style={styles.actionCardTextWrap}>
                  <Text style={styles.actionCardTitle}>جزدان و باڵانس</Text>
                  <Text style={styles.actionCardSubtitle}>باڵانس و زیادکردنی پارە</Text>
                </View>
                <ChevronRight size={18} color={colors.foreground.muted} style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('PrivacySecurity' as never)}
              activeOpacity={0.85}
            >
              <View style={styles.actionCardIconWrap}>
                <Shield size={20} color="#7C3AED" />
              </View>
              <View style={styles.actionCardTextWrap}>
                <Text style={styles.actionCardTitle}>{t('privacySecurity')}</Text>
                <Text style={styles.actionCardSubtitle}>{t('security')}</Text>
              </View>
              <ChevronRight size={18} color={colors.foreground.muted} style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('HelpSupport' as never)}
              activeOpacity={0.85}
            >
              <View style={styles.actionCardIconWrap}>
                <HelpCircle size={20} color="#7C3AED" />
              </View>
              <View style={styles.actionCardTextWrap}>
                <Text style={styles.actionCardTitle}>{t('helpSupport')}</Text>
                <Text style={styles.actionCardSubtitle}>{t('faq')}</Text>
              </View>
              <ChevronRight size={18} color={colors.foreground.muted} style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }} />
            </TouchableOpacity>

            {!ownerLoading && hasAdminAccess && (
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => navigation.navigate('OwnerDashboard' as never)}
                activeOpacity={0.85}
              >
                <View style={styles.actionCardIconWrap}>
                  <Crown size={20} color="#7C3AED" />
                </View>
                <View style={styles.actionCardTextWrap}>
                  <Text style={styles.actionCardTitle}>{t('ownerDashboard')}</Text>
                  <Text style={styles.actionCardSubtitle}>{t('adminPanel')}</Text>
                </View>
                <ChevronRight size={18} color={colors.foreground.muted} style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }} />
              </TouchableOpacity>
            )}
          </View>

          {!isPaymentsHidden && (
            <>
              {/* 5) SOCIAL - section title (standalone) + 4 icon boxes */}
              <Text style={styles.socialSectionTitle}>{t('profileSocialTitle')}</Text>
              <View style={styles.socialBoxRow}>
                <TouchableOpacity style={styles.socialBox} onPress={() => Linking.openURL('https://www.tiktok.com/@rekto.app')} activeOpacity={0.85}>
                  <SocialTikTokIcon size={23} color={isDark ? '#FAFAFA' : '#000000'} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.socialBox} onPress={() => Linking.openURL('https://www.facebook.com/RektoApp')} activeOpacity={0.85}>
                  <SocialFacebookIcon size={23} color={isDark ? '#FAFAFA' : '#1877F2'} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.socialBox} onPress={() => Linking.openURL('https://www.youtube.com/@rektoapp')} activeOpacity={0.85}>
                  <SocialYoutubeIcon size={23} color={isDark ? '#FAFAFA' : '#FF0000'} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.socialBox} onPress={() => Linking.openURL('https://www.instagram.com/rekto.app')} activeOpacity={0.85}>
                  <SocialInstagramIcon size={23} color={isDark ? '#FAFAFA' : '#E4405F'} />
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* 6) LANGUAGE TOGGLE - pill */}
          <View style={styles.languageSection}>
            <Text style={styles.languageLabel}>{t('language')}</Text>
            <View style={styles.segmentedControl}>
              <TouchableOpacity
                style={[styles.segmentButton, language === 'ckb' && styles.segmentButtonActive]}
                onPress={() => setLanguage('ckb')}
                activeOpacity={0.8}
              >
                <Text style={[styles.segmentButtonText, language === 'ckb' && styles.segmentButtonTextActive]}>کوردی</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segmentButton, language === 'ar' && styles.segmentButtonActive]}
                onPress={() => setLanguage('ar')}
                activeOpacity={0.8}
              >
                <Text style={[styles.segmentButtonText, language === 'ar' && styles.segmentButtonTextActive]}>العربية</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 6b) THEME TOGGLE - pill (same style as language) */}
          <View style={styles.languageSection}>
            <Text style={styles.languageLabel}>{t('appearance')}</Text>
            <View style={styles.segmentedControl}>
              <TouchableOpacity
                style={[styles.segmentButton, themeMode === 'light' && styles.segmentButtonActive]}
                onPress={() => setThemeMode('light')}
                activeOpacity={0.8}
              >
                <Text style={[styles.segmentButtonText, themeMode === 'light' && styles.segmentButtonTextActive]}>{t('lightMode')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segmentButton, themeMode === 'dark' && styles.segmentButtonActive]}
                onPress={() => setThemeMode('dark')}
                activeOpacity={0.8}
              >
                <Text style={[styles.segmentButtonText, themeMode === 'dark' && styles.segmentButtonTextActive]}>{t('darkMode')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 6c) WHATSAPP SUPPORT */}
          {!isPaymentsHidden && (
            <View style={styles.languageSection}>
              <Text style={styles.languageLabel}>{t('needSupport')}</Text>
              <TouchableOpacity
                style={styles.whatsappButton}
                onPress={() => Linking.openURL('https://wa.me/9647504881516')}
                activeOpacity={0.85}
              >
                <MessageCircle size={20} color="#FFFFFF" />
                <Text style={styles.whatsappButtonText}>{t('whatsapp')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 6d) RATE OUR APP — iOS: native in-app review (throttled: 2nd open first, then 5 opens or 2 days); Android: open Play Store */}
          <TouchableOpacity
            style={styles.rateAppRow}
            onPress={() => {
              if (Platform.OS === 'ios') {
                requestReview();
              } else {
                Linking.openURL('https://play.google.com/store/apps/details?id=com.Arewan.RektoApp').catch(() => {});
              }
            }}
            activeOpacity={0.85}
          >
            <Star size={20} color={colors.primary?.DEFAULT ?? '#7C3AED'} />
            <Text style={styles.rateAppText}>{t('rateOurApp')}</Text>
            <ChevronRight size={18} color={colors.foreground.muted} style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }} />
          </TouchableOpacity>

          {/* 7) LOGOUT */}
          <TouchableOpacity 
            style={styles.logoutButton} 
            onPress={handleLogout}
            activeOpacity={0.7}
            disabled={loggingOut}
          >
            <Text style={styles.logoutText}>
              {loggingOut ? t('loggingOut') : t('logout')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.deleteAccountButton, deleteLoading && styles.deleteAccountButtonDisabled]}
            onPress={handleDeleteAccount}
            activeOpacity={0.75}
            disabled={deleteLoading}
          >
            {deleteLoading ? (
              <ActivityIndicator size="small" color={colors.primary.foreground} />
            ) : (
              <>
                <Trash2 size={18} color={colors.primary.foreground} />
                <Text style={styles.deleteAccountText}>{t('deleteAccount')}</Text>
              </>
            )}
          </TouchableOpacity>

          {/* App Version */}
          <Text style={styles.versionText}>Rekto v1.0.0</Text>
        </View>
      </ScrollView>

      {/* Balance modal - Kurdish text, Add Balance button navigates to AddBalance */}
      {!isPaymentsHidden && (
      <Modal visible={showBalanceModal} transparent animationType="fade" onRequestClose={closeBalanceModal}>
        <View style={styles.balanceModalBackdrop} pointerEvents="box-none">
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeBalanceModal} />
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: balanceBackdropOpacity, backgroundColor: 'rgba(0,0,0,0.5)' }]} pointerEvents="none" />
          <View style={styles.balanceModalCenter} pointerEvents="box-none">
            <TouchableOpacity activeOpacity={1} onPress={(e) => e?.stopPropagation?.()} style={{ alignSelf: 'center' }}>
              <Animated.View style={[styles.balanceModalCard, { transform: [{ scale: balanceScale }] }]}>
                <Text style={styles.balanceModalTitle}>جزدان و باڵانس</Text>
                <LTRNumber weight="medium" style={styles.balanceModalAmount}>
                  {formatIQDLatinDigitsOnly(convertToIQD(profile?.wallet_balance ?? 0))}
                </LTRNumber>
                <Text style={styles.balanceModalMessage}>
                  ئێستا باڵانسی جزدان بەردەستە! دەتوانیت کاتی دروستکردنی ڕیکلام بەکاری بهێنیت بۆ پارەدان. باڵانس زیاد بکە بۆ دەستپێکردن!
                </Text>
                <TouchableOpacity
                  style={styles.balanceModalButton}
                  onPress={() => {
                    closeBalanceModal();
                    navigation.navigate('ProfileStack', { screen: 'AddBalance' });
                  }}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#7C3AED', '#6D28D9']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.balanceModalButtonGradient}
                  >
                    <Text style={styles.balanceModalButtonText}>باڵانس زیاد بکە</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      )}
    </View>
  );
}

const createStyles = (colors: any, typography: any, fontFamily: string, isRTL: boolean, isDark?: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background?.DEFAULT ?? colors.background?.muted ?? '#F4F4F5',
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
    paddingTop: 8,
    width: '100%',
  },
  // 1) Profile header
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarWrap: {
    marginBottom: spacing.md,
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: fontFamily,
  },
  avatarEditButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.foreground.DEFAULT,
    fontFamily: fontFamily,
    textAlign: 'center',
    writingDirection: 'rtl',
    marginBottom: 4,
  },
  profileSubtitle: {
    fontSize: 13,
    color: colors.foreground.muted,
    fontFamily: 'Poppins-Medium',
    textAlign: 'center',
    writingDirection: 'ltr',
  },
  // 2) Small balance card (compact, tappable)
  balanceCard: {
    width: '100%',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    marginBottom: 20,
    backgroundColor: colors.card.background,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.border?.DEFAULT ?? 'rgba(0,0,0,0.06)',
  },
  balanceModalBackdrop: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  balanceModalBackdropInner: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    pointerEvents: 'none',
  },
  balanceModalCenter: {
    alignSelf: 'center',
  },
  balanceModalCard: {
    width: 280,
    backgroundColor: colors.card?.background ?? colors.background?.DEFAULT ?? '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  balanceModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.foreground.DEFAULT,
    fontFamily: 'Rabar_021',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 12,
  },
  balanceModalAmount: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 24,
    color: colors.foreground.DEFAULT,
    marginBottom: 8,
  },
  balanceModalMessage: {
    fontSize: 14,
    color: colors.foreground.muted,
    fontFamily: 'Rabar_021',
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 22,
    marginBottom: 20,
  },
  balanceModalButton: {
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'stretch',
  },
  balanceModalButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Rabar_021',
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  balanceContent: {
    flex: 1,
    alignItems: 'flex-start',
  },
  balanceLabel: {
    ...typography.caption,
    fontSize: 12,
    color: colors.foreground.muted,
    fontFamily: fontFamily,
    textAlign: isRTL ? 'right' : 'left',
    writingDirection: 'rtl',
  },
  balanceAmount: {
    fontFamily: 'Poppins-Bold',
    fontSize: 28,
    fontWeight: '700',
    color: colors.foreground.DEFAULT,
    marginTop: 2,
    textAlign: 'left',
    writingDirection: 'ltr',
  },
  // 3) Two stat boxes
  statBoxesRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.card.background,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    alignItems: 'flex-start',
    gap: 6,
  },
  statBoxFull: {
    flex: 0,
    width: '100%',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.foreground.DEFAULT,
    textAlign: 'left',
    writingDirection: 'ltr',
  },
  /** کۆی خەرجی / total spend only — English digits + Poppins Medium per design */
  statNumberSpend: {
    fontFamily: 'Poppins-Medium',
    fontSize: 22,
    color: colors.foreground.DEFAULT,
    textAlign: 'left',
    writingDirection: 'ltr',
    includeFontPadding: false,
  },
  statLabel: {
    fontSize: 12,
    color: colors.foreground.muted,
    fontFamily: fontFamily,
    textAlign: isRTL ? 'right' : 'left',
    writingDirection: 'rtl',
  },
  // 4) Action cards
  actionCardsSection: {
    width: '100%',
    marginBottom: 24,
    gap: 16,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 16,
    backgroundColor: colors.card.background,
    borderWidth: 1,
    borderColor: colors.border?.DEFAULT ?? 'rgba(0,0,0,0.06)',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    gap: spacing.md,
  },
  actionCardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCardTextWrap: {
    flex: 1,
    alignItems: 'flex-start',
  },
  actionCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.foreground.DEFAULT,
    fontFamily: fontFamily,
    textAlign: isRTL ? 'right' : 'left',
    writingDirection: 'rtl',
  },
  actionCardSubtitle: {
    fontSize: 12,
    color: colors.foreground.muted,
    fontFamily: fontFamily,
    marginTop: 2,
    textAlign: isRTL ? 'right' : 'left',
    writingDirection: 'rtl',
  },
  // 5) Social - standalone section title then 4 icon boxes
  socialSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.foreground?.DEFAULT ?? '#18181B',
    fontFamily: fontFamily,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 16,
    width: '45%',
  },
  socialBoxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 24,
    width: '100%',
  },
  socialBox: {
    flex: 1,
    aspectRatio: 1,
    maxHeight: 72,
    borderRadius: 16,
    backgroundColor: colors.card?.background ?? colors.background?.DEFAULT ?? '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border?.DEFAULT ?? 'rgba(0,0,0,0.06)',
  },
  listSection: {
    width: '100%',
    marginBottom: 24,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  listRowTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: colors.foreground.DEFAULT,
    fontFamily: fontFamily,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  listDivider: {
    height: 1,
    backgroundColor: colors.border.DEFAULT,
    opacity: 0.6,
  },
  // 6) Language / Theme section - FIX 4 dark mode
  languageSection: {
    width: '100%',
    marginBottom: 24,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF',
    borderWidth: 1,
    borderColor: isDark ? '#6028FF' : '#AA8CFF',
    alignItems: 'flex-start',
  },
  languageLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: isDark ? '#A1A1AA' : '#71717A',
    fontFamily: 'Rabar_021',
    marginBottom: 10,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  whatsappButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#25D366',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    width: '100%',
  },
  whatsappButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: fontFamily,
  },
  rateAppRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderRadius: 16,
    backgroundColor: colors.card?.background ?? colors.background?.DEFAULT ?? '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border?.DEFAULT ?? 'rgba(0,0,0,0.06)',
    gap: 12,
  },
  rateAppText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: colors.foreground?.DEFAULT ?? '#18181B',
    fontFamily: fontFamily,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  // Quick actions (legacy, keep for segment)
  quickActionsSection: {
    width: '100%',
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  quickActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 16,
    backgroundColor: colors.card.background,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    gap: spacing.md,
  },
  quickActionContent: {
    flex: 1,
    alignItems: 'flex-end',
  },
  quickActionLabel: {
    fontSize: 15,
    color: colors.foreground.DEFAULT,
    fontWeight: '500',
    fontFamily: fontFamily,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: isDark ? '#27272A' : '#F4F4F5',
    borderRadius: 12,
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  segmentButtonActive: {
    backgroundColor: isDark ? '#6028FF' : '#AA8CFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentButtonText: {
    fontSize: 15,
    fontWeight: '400',
    color: isDark ? '#A1A1AA' : '#71717A',
    fontFamily: 'Rabar_021',
  },
  segmentButtonTextActive: {
    fontWeight: '600',
    color: isDark ? '#FAFAFA' : '#1A1A1F',
    fontFamily: 'Rabar_021',
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
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.card?.background ?? '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.border?.DEFAULT ?? '#E5E7EB',
  },
  customHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    gap: 12,
  },
  customHeaderLeftRTL: {
    flexDirection: 'row',
  },
  headerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: fontFamily,
  },
  headerTextColumn: {
    flex: 1,
    minWidth: 0,
  },
  headerName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.foreground.DEFAULT,
    fontFamily: fontFamily,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  headerEmail: {
    fontSize: 12,
    color: colors.foreground.muted,
    fontFamily: fontFamily,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginTop: 2,
  },
  rektoLogoImage: {
    height: 64,
    width: 120,
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
    textAlign: isRTL ? 'right' : 'left',
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
    backgroundColor: colors.card.background,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  comingSoonHeader: {
    backgroundColor: colors.error,
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
    color: colors.foreground.DEFAULT,
    textAlign: 'center',
    lineHeight: 20,
    writingDirection: 'rtl',
  },
  comingSoonButton: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    backgroundColor: colors.error,
    alignItems: 'center',
  },
  comingSoonButtonText: {
    color: colors.primary.foreground,
    fontWeight: '700',
    fontSize: 14,
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
  // Settings & Support
  settingsSupportButton: {
    width: '100%',
    marginBottom: spacing.xl,
  },
  settingsSupportInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.card,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  settingsSupportContent: {
    flex: 1,
    alignItems: 'flex-end',
    marginEnd: spacing.md,
  },
  settingsSupportTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: fontFamily,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  settingsSupportSubtitle: {
    fontSize: 12,
    color: '#E5E7EB',
    fontFamily: fontFamily,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginTop: 2,
  },
  // Social section
  socialCard: {
    width: '100%',
    borderRadius: borderRadius.card,
    backgroundColor: colors.card.background,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xl,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  socialButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    backgroundColor: colors.card?.backgroundAlt ?? '#F4F4F5',
  },
  socialButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.foreground.DEFAULT,
    fontFamily: fontFamily,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  logoutButton: {
    marginTop: spacing.xl,
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.error,
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
    minWidth: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    ...typography.body,
    fontSize: 16,
    fontWeight: '600',
    color: colors.error,
    fontFamily: fontFamily,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  deleteAccountButton: {
    marginTop: spacing.xl + spacing.md,
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 16,
    backgroundColor: colors.error,
    minWidth: 220,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  deleteAccountText: {
    ...typography.body,
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary.foreground,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  deleteAccountButtonDisabled: {
    opacity: 0.7,
  },
});
