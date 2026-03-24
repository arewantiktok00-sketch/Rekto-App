import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, StatusBar } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LogOut, Wifi, CheckCircle2, AlertTriangle, Menu, X } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOwnerAuth } from '@/hooks/useOwnerAuth';
import { supabase, supabaseRead } from '@/integrations/supabase/client';
import { Shield, Eye, Settings, Users, FileText, HelpCircle, UserCog, Crown, Activity, Megaphone, Sliders, Image, Gift, Star, LayoutGrid, ShieldCheck, UserCheck } from 'lucide-react-native';
import { getOwnerColors } from '@/theme/colors';
import { spacing, borderRadius } from '@/theme/spacing';
import { getTypographyStyles } from '@/theme/typography';
import { AdReviewQueue } from '@/components/owner/AdReviewQueue';
import { AccountHealthTab } from '@/components/owner/AccountHealthTab';
import { ApiSettingsTab } from '@/components/owner/ApiSettingsTab';
import { AdAccountsTab } from '@/components/owner/AdAccountsTab';
import { CampaignLogsTab } from '@/components/owner/CampaignLogsTab';
import { TutorialsTab } from '@/components/owner/TutorialsTab';
import { FAQsTab } from '@/components/owner/FAQsTab';
import { UserManagementTab } from '@/components/owner/UserManagementTab';
import { UserPermissionsTab } from '@/components/owner/UserPermissionsTab';
import { AdminsTab } from '@/components/owner/AdminsTab';
import { AppControlTab } from '@/components/owner/AppControlTab';
import { InteractiveButtonsTab } from '@/components/owner/InteractiveButtonsTab';
import { BroadcastScreen } from '@/screens/owner/BroadcastScreen';
import { PricingConfigScreen } from '@/screens/owner/PricingConfigScreen';
import { DiscountManagementScreen } from '@/screens/owner/DiscountManagementScreen';
import { PromoBannerManager } from '@/components/owner/PromoBannerManager';
import { FeaturedAdManager } from '@/components/owner/FeaturedAdManager';
import { AnnouncementManager } from '@/components/owner/AnnouncementManager';
import { AdminReviewersScreen } from '@/screens/owner/AdminReviewersScreen';
import { BannerContentManager } from '@/screens/owner/BannerContentManager';
import { BalanceTab } from '@/components/owner/BalanceTab';
import { TransactionLogsTab } from '@/components/owner/TransactionLogsTab';
import { BackButton } from '@/components/common/BackButton';
import { Text } from '@/components/common/Text';
import { OwnerDrawerNav } from '@/components/owner/OwnerDrawerNav';
import LinearGradient from 'react-native-linear-gradient';
import { DollarSign, Tag, Wallet } from 'lucide-react-native';

export function OwnerDashboard() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { user, loading: authLoading, signOut } = useAuth();
  const { isOwner, isReviewer, isReviewerOnly, hasAdminAccess, loading: ownerLoading } = useOwnerAuth();
  const { t, language, isRTL } = useLanguage();
  const colors = getOwnerColors();
  const typography = getTypographyStyles(language as 'ckb' | 'ar');
  const styles = createStyles(colors, insets, typography, isRTL);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('review');
  const [pendingCount, setPendingCount] = useState(0);
  const [apiStatus, setApiStatus] = useState<'loading' | 'connected' | 'not_configured' | 'error'>('loading');
  const [apiSummary, setApiSummary] = useState<string>('');
  const [showMenu, setShowMenu] = useState(false);
  const highlightCampaignId = (route.params as any)?.highlightCampaignId as string | undefined;
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

  const handleLogout = () => {
    Alert.alert(
      t('logout'),
      t('confirmLogout'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('logout'),
          style: 'destructive',
          onPress: async () => {
            await signOut();
            navigation.reset({
              index: 0,
              routes: [{ name: 'Auth' as never }],
            });
          },
        },
      ]
    );
  };

  // Redirect non-admins (owners or reviewers)
  useEffect(() => {
    if (!authLoading && !ownerLoading) {
      if (!user) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Auth' as never }],
        });
      } else if (!hasAdminAccess) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main' as never }],
        });
      }
    }
  }, [user, hasAdminAccess, authLoading, ownerLoading, navigation]);

  useEffect(() => {
    if (user && hasAdminAccess) {
      fetchPendingCount();
      if (isOwner) {
        fetchApiStatus();
      }
    }
  }, [user, hasAdminAccess, isOwner]);

  // When navigated from an owner notification with a specific campaign,
  // force the Ad Review tab and let the queue auto-expand that campaign.
  useEffect(() => {
    if (highlightCampaignId) {
      setActiveTab('review');
    }
  }, [highlightCampaignId]);

  const fetchPendingCount = async () => {
    if (!user) return;

    try {
      const { count } = await supabaseRead
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .in('status', ['waiting_for_admin', 'verifying_payment']);

      if (count !== null) {
        setPendingCount(count);
      }
    } catch (error) {
      console.error('Error fetching pending count:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchApiStatus = async () => {
    if (!user || !isOwner) return;

    try {
      setApiStatus('loading');
      const { data, error } = await supabase.functions.invoke('tiktok-sync-status', {
        body: { debugAdvertiserInfo: true },
      });
      if (error) throw error;
      const list = data?.advertiser_info?.data?.list || [];
      const advertiser = list[0];

      if (data?.success && data?.advertiser_info?.code === 0 && advertiser) {
        setApiStatus('connected');
        setApiSummary(`${advertiser.name || 'TikTok API connected'} · $${advertiser.balance ?? 0}`);
      } else if (data?.success) {
        setApiStatus('not_configured');
        setApiSummary('');
      } else {
        setApiStatus('error');
        setApiSummary(data?.error || '');
      }
    } catch (error) {
      console.error('[OwnerDashboard] Failed to load API status:', error);
      setApiStatus('error');
      setApiSummary('');
    }
  };

  // Base tabs - always visible
  const baseTabs = [
    { id: 'review', label: t('adReview'), icon: Eye },
  ];

  // Owner-only tabs (hidden for reviewers). Order matches web: Main, TikTok, Content, Users, Finance, System
  const ownerTabs = [
    { id: 'featured', label: t('featuredAd'), icon: Star },
    { id: 'pricing', label: t('pricing'), icon: DollarSign },
    { id: 'discounts', label: t('discounts'), icon: Tag },
    { id: 'balance', label: language === 'ar' ? 'الرصيد' : 'باڵانس', icon: Wallet },
    { id: 'transaction-logs', label: t('transactions') || 'مامەڵەکان', icon: DollarSign },
    { id: 'api', label: t('apiSettings'), icon: Settings },
    { id: 'accounts', label: t('adAccounts'), icon: Users },
    { id: 'banner', label: t('banner'), icon: Image },
    { id: 'promo', label: t('promoBanner'), icon: Gift },
    { id: 'health', label: t('accountHealth'), icon: Activity },
    { id: 'logs', label: t('campaignLogs'), icon: FileText },
    { id: 'broadcast', label: t('broadcast'), icon: Megaphone },
    { id: 'app-control', label: t('appControl'), icon: Sliders },
    { id: 'buttons', label: t('buttons'), icon: LayoutGrid },
    { id: 'tutorials', label: t('tutorialManagement'), icon: HelpCircle },
    { id: 'faqs', label: t('faqManagement'), icon: HelpCircle },
    { id: 'announcement', label: t('popupAnnounce'), icon: Megaphone },
    { id: 'users', label: t('userManagement'), icon: UserCog },
    { id: 'permissions', label: t('permissions'), icon: Shield },
    { id: 'admins', label: t('admins'), icon: ShieldCheck },
    { id: 'reviewers', label: t('adminReviewers'), icon: UserCheck },
  ];

  // Combine tabs based on access level
  const tabs = isReviewerOnly ? baseTabs : [...baseTabs, ...ownerTabs];

  // Show loading while checking auth/owner status
  if (authLoading || ownerLoading || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
      </View>
    );
  }

  // Don't render if not admin (owner or reviewer) - will redirect
  if (!hasAdminAccess || !user) {
    return null;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background.DEFAULT} />
      {/* Gradient Admin Header */}
      <LinearGradient
        colors={colors.gradients.primaryButton.colors}
        start={colors.gradients.primaryButton.start}
        end={colors.gradients.primaryButton.end}
        style={styles.headerGradient}
      >
        <View style={styles.headerRow}>
          <BackButton onPress={handleGoBack} color="#FFFFFF" style={styles.headerBackButton} />
          <View style={styles.headerCenter}>
            <Text style={[styles.adminTitle, isRTL && styles.adminTitleRTL]}>{t('admin')}</Text>
            <Text style={[styles.adminSubtitle, isRTL && styles.adminSubtitleRTL]}>{t('adminSubtitle')}</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>{t('logout')}</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* TikTok API status card */}
      <View style={styles.apiStatusCard}>
        <View style={styles.apiStatusLeft}>
          <View style={styles.apiIconCircle}>
            <Wifi size={18} color={colors.primary.DEFAULT} />
          </View>
          <View>
            <Text style={styles.apiTitle}>TikTok API</Text>
            <Text style={styles.apiSubtitle}>{apiSummary || (user.email ?? '')}</Text>
          </View>
        </View>
        <View style={styles.apiStatusRight}>
          <View
            style={[
              styles.apiChip,
              apiStatus === 'connected'
                ? styles.apiChipConnected
                : apiStatus === 'loading'
                ? styles.apiChipLoading
                : styles.apiChipError,
            ]}
          >
            {apiStatus === 'connected' ? (
              <CheckCircle2 size={14} color="#22C55E" />
            ) : apiStatus === 'loading' ? (
              <ActivityIndicator size="small" color={colors.foreground.muted} />
            ) : (
              <AlertTriangle size={14} color="#F97316" />
            )}
            <Text
              style={[
                styles.apiChipText,
                apiStatus === 'connected'
                  ? styles.apiChipTextConnected
                  : apiStatus === 'loading'
                  ? styles.apiChipTextLoading
                  : styles.apiChipTextError,
              ]}
            >
              {apiStatus === 'connected'
                ? 'Connected'
                : apiStatus === 'loading'
                ? 'Checking...'
                : 'Not Connected'}
            </Text>
          </View>
        </View>
      </View>

      {/* Mobile Hamburger Menu Button */}
      <TouchableOpacity 
        style={styles.menuButton}
        onPress={() => setShowMenu(true)}
      >
        <Menu size={24} color={colors.foreground.DEFAULT} />
        <Text style={styles.menuButtonText}>{tabs.find(t => t.id === activeTab)?.label || 'Menu'}</Text>
      </TouchableOpacity>

      {/* Owner Drawer Navigation */}
      <OwnerDrawerNav
        visible={showMenu}
        activeTab={activeTab}
        onClose={() => setShowMenu(false)}
        onTabChange={setActiveTab}
        isReviewerOnly={isReviewerOnly}
      />

      {/* Tab Content - No ScrollView wrapper to avoid nesting with FlatList */}
      <View style={styles.tabContent}>
        {activeTab === 'review' && (
          <View style={styles.reviewContainer}>
            <AdReviewQueue highlightCampaignId={highlightCampaignId} />
          </View>
        )}

        {activeTab === 'featured' && (
          <FeaturedAdManager />
        )}

        {activeTab === 'pricing' && (
          <PricingConfigScreen />
        )}

        {activeTab === 'discounts' && (
          <DiscountManagementScreen />
        )}

        {activeTab === 'balance' && (
          <BalanceTab />
        )}

        {activeTab === 'transaction-logs' && (
          <TransactionLogsTab />
        )}

        {activeTab === 'reviewers' && (
          <AdminReviewersScreen />
        )}

        {activeTab === 'api' && (
          <ApiSettingsTab colors={colors} t={t} />
        )}

        {activeTab === 'accounts' && (
          <AdAccountsTab colors={colors} t={t} />
        )}

        {activeTab === 'banner' && (
          <BannerContentManager />
        )}

        {activeTab === 'promo' && (
          <PromoBannerManager />
        )}

        {activeTab === 'health' && (
          <AccountHealthTab colors={colors} t={t} language={language} />
        )}

        {activeTab === 'logs' && (
          <CampaignLogsTab colors={colors} t={t} />
        )}

        {activeTab === 'tutorials' && (
          <TutorialsTab colors={colors} t={t} />
        )}

        {activeTab === 'faqs' && (
          <FAQsTab colors={colors} t={t} />
        )}

        {activeTab === 'users' && (
          <UserManagementTab colors={colors} t={t} />
        )}

        {activeTab === 'permissions' && (
          <UserPermissionsTab colors={colors} t={t} />
        )}

        {activeTab === 'admins' && (
          <AdminsTab colors={colors} t={t} />
        )}

        {activeTab === 'broadcast' && (
          <BroadcastScreen />
        )}

        {activeTab === 'announcement' && (
          <AnnouncementManager />
        )}

        {activeTab === 'app-control' && (
          <AppControlTab colors={colors} t={t} />
        )}

        {activeTab === 'buttons' && (
          <InteractiveButtonsTab />
        )}
      </View>
    </View>
  );
}

const createStyles = (colors: any, insets: any, typography: any, isRTL?: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.DEFAULT,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerGradient: {
    paddingTop: insets.top + spacing.md,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBackButton: {
    width: 40,
    height: 40,
    minWidth: 40,
    minHeight: 40,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  adminTitle: {
    ...typography.h1,
    fontSize: 22,
    color: colors.primary.foreground,
  },
  adminTitleRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  adminSubtitle: {
    ...typography.caption,
    marginTop: 2,
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  adminSubtitleRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  badge: {
    backgroundColor: colors.error || '#EF4444',
    borderRadius: borderRadius.card,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    ...typography.caption,
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  logoutButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.card.background,
  },
  logoutText: {
    ...typography.bodySmall,
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary.DEFAULT,
  },
  content: {
    flex: 1,
  },
  apiStatusCard: {
    marginHorizontal: spacing.md,
    marginTop: -spacing.lg,
    backgroundColor: colors.card.background,
    borderRadius: borderRadius.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  apiStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  apiIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  apiTitle: {
    ...typography.label,
    fontSize: 14,
    color: colors.foreground.DEFAULT,
  },
  apiSubtitle: {
    ...typography.caption,
    fontSize: 12,
    color: colors.foreground.muted,
  },
  apiStatusRight: {
    marginStart: spacing.sm,
  },
  apiChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 999,
  },
  apiChipConnected: {
    backgroundColor: '#22C55E20',
  },
  apiChipLoading: {
    backgroundColor: colors.background.secondary,
  },
  apiChipError: {
    backgroundColor: '#F9731620',
  },
  apiChipText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '600',
  },
  apiChipTextConnected: {
    color: '#16A34A',
  },
  apiChipTextLoading: {
    color: colors.foreground.muted,
  },
  apiChipTextError: {
    color: '#EA580C',
  },
  menuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  menuButtonText: {
    ...typography.body,
    fontSize: 16,
    fontWeight: '600',
    color: colors.foreground.DEFAULT,
    flex: 1,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: colors.overlay.dark,
    flexDirection: 'row',
  },
  menuContent: {
    backgroundColor: colors.card.background,
    width: '75%',
    maxWidth: 300,
    height: '100%',
    borderEndWidth: 1,
    borderEndColor: colors.border.DEFAULT,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
    backgroundColor: colors.background.DEFAULT,
  },
  menuTitle: {
    ...typography.h2,
    fontSize: 18,
    fontWeight: '700',
    color: colors.foreground.DEFAULT,
  },
  menuList: {
    flex: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
    position: 'relative',
  },
  menuItemActive: {
    backgroundColor: colors.primary.DEFAULT + '10',
  },
  menuItemText: {
    ...typography.body,
    fontSize: 15,
    color: colors.foreground.DEFAULT,
    flex: 1,
  },
  menuItemTextActive: {
    color: colors.primary.DEFAULT,
    fontWeight: '600',
  },
  menuItemIndicator: {
    position: 'absolute',
    start: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: colors.primary.DEFAULT,
  },
  tabContent: {
    flex: 1,
    paddingBottom: 0,
  },
  reviewContainer: {
    flex: 1,
  },
  section: {
    backgroundColor: colors.card.background,
    borderRadius: borderRadius.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.card.border,
  },
  sectionTitle: {
    ...typography.h3,
    fontSize: 18,
    color: colors.foreground.DEFAULT,
    marginBottom: spacing.sm,
  },
  sectionDescription: {
    ...typography.bodySmall,
    fontSize: 14,
    color: colors.foreground.muted,
  },
});
