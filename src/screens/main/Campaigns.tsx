import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, View, StyleSheet, TouchableOpacity, FlatList, RefreshControl, ScrollView, Alert } from 'react-native';
import { useNavigation, useIsFocused, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRemoteConfig } from '@/contexts/RemoteConfigContext';
import { CampaignCard } from '@/components/common/CampaignCard';
import { ExtendAdModal } from '@/components/common/ExtendAdModal';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { Plus, Rocket } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import LinearGradient from 'react-native-linear-gradient';
import { spacing, borderRadius } from '@/theme/spacing';
import { useCampaigns } from '@/hooks/useCampaigns';
import { useCampaignRealtime } from '@/hooks/useCampaignRealtime';
import { useTikTokSync } from '@/hooks/useTikTokSync';
import { getCached } from '@/services/globalCache';
import { safeQuery } from '@/integrations/supabase/client';
import { supabase } from '@/lib/supabase';
import { Text } from '@/components/common/Text';
import { toast } from '@/utils/toast';
import { isRTL, rtlText } from '@/utils/rtl';
import { getDisplayBudget } from '@/utils/campaignBudget';

type FilterStatus = 'all' | 'active' | 'pending' | 'completed' | 'rejected';

interface Campaign {
  id: string;
  title: string;
  status: string;
  objective?: string;
  spend?: number | null;
  views?: number | null;
  impressions?: number | null;
  clicks?: number | null;
  leads?: number | null;
  tiktokRejectionReason?: string | null;
  tiktokAdStatus?: string | null;
  tiktokAdgroupStatus?: string | null;
  tiktokCampaignStatus?: string | null;
  created_at: string;
}

function Campaigns() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { user } = useAuth();
  const { isFeatureEnabled, isPaymentsHidden } = useRemoteConfig();
  const { t, language } = useLanguage();
  const rtl = isRTL(language);
  const { colors } = useTheme();
  const styles = createStyles(colors, insets, rtl);
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');
  const [extendModalVisible, setExtendModalVisible] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const cachedProfile = getCached<any>('profile', null);
  const [canPauseAds, setCanPauseAds] = useState(Boolean(cachedProfile?.can_pause_ads));
  const [canExtendAds, setCanExtendAds] = useState(Boolean(cachedProfile?.can_extend_ads));
  useEffect(() => {
    if (!isFeatureEnabled('campaigns_enabled')) {
      const goToSafeScreen = () => {
        const nav = navigation as any;
        if (typeof nav.canGoBack === 'function' && nav.canGoBack()) {
          nav.goBack();
          return;
        }
        nav.navigate('Dashboard');
      };
      Alert.alert(
        t('featureDisabledTitle'),
        t('campaignsDisabled'),
        [{ text: t('done'), onPress: goToSafeScreen }]
      );
    }
  }, [isFeatureEnabled, navigation, t]);

  useEffect(() => {
    navigation.setParams?.({ hideTabBar: extendModalVisible });
  }, [extendModalVisible, navigation]);

  useEffect(() => {
    if (!user?.id) return;
    const fetchPermissions = async () => {
      try {
        const { data } = await safeQuery((client) =>
          client
            .from('profiles')
            .select('can_pause_ads, can_extend_ads')
            .eq('user_id', user.id)
            .maybeSingle()
        );
        setCanPauseAds(Boolean(data?.can_pause_ads));
        setCanExtendAds(Boolean(data?.can_extend_ads));
      } catch (error) {
        console.warn('[Campaigns] Failed to fetch permissions:', error);
      }
    };

    fetchPermissions();

    if (!supabase) {
      return;
    }

    const channel = supabase
      .channel(`user-profile-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `user_id=eq.${user.id}` },
        (payload) => {
          setCanPauseAds(Boolean((payload.new as any)?.can_pause_ads));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);
  
  // Fetch ALL campaigns; filter deleted_external and client-side tabs
  const { campaigns: allCampaigns, isLoading, refresh, refreshSilent, applyRealtimeUpdate } = useCampaigns({
    userId: user?.id || '',
  });
  const initialLoadDone = useRef(false);

  useEffect(() => {
    if (!isLoading) {
      initialLoadDone.current = true;
    }
  }, [isLoading]);

  // Filter out deleted_external; optionally hide old rejected/failed (30+ days)
  const OLD_REJECTED_DAYS = 30;
  const visibleCampaigns = useMemo(() => {
    return allCampaigns.filter((campaign) => {
      const status = (campaign.status || '').toLowerCase();
      if (status === 'deleted_external') return false;
      if (['rejected', 'failed'].includes(status)) {
        const updated = (campaign as any).updated_at || campaign.created_at;
        if (updated && Date.now() - new Date(updated).getTime() > OLD_REJECTED_DAYS * 24 * 60 * 60 * 1000) return false;
      }
      return true;
    });
  }, [allCampaigns]);

  // Client-side filter — instant, no network
  const filteredCampaigns = useMemo(() => {
    if (activeFilter === 'all') return visibleCampaigns;
    return visibleCampaigns.filter((c) => {
      const status = (c.status || '').toLowerCase();
      if (activeFilter === 'active') return status === 'active' || status === 'running';
      if (activeFilter === 'pending') return ['pending', 'in_review', 'awaiting_payment', 'waiting_for_admin', 'verifying_payment', 'scheduled'].includes(status);
      if (activeFilter === 'completed') return status === 'completed' || status === 'paused';
      if (activeFilter === 'rejected') return status === 'rejected' || status === 'failed';
      return true;
    });
  }, [visibleCampaigns, activeFilter]);

  // Filter counts for badges — instant
  const filterCounts = useMemo(() => ({
    all: visibleCampaigns.length,
    active: visibleCampaigns.filter((c) => ['active', 'running'].includes((c.status || '').toLowerCase())).length,
    pending: visibleCampaigns.filter((c) => ['pending', 'in_review', 'awaiting_payment', 'waiting_for_admin', 'verifying_payment', 'scheduled'].includes((c.status || '').toLowerCase())).length,
    completed: visibleCampaigns.filter((c) => ['completed', 'paused'].includes((c.status || '').toLowerCase())).length,
    rejected: visibleCampaigns.filter((c) => ['rejected', 'failed'].includes((c.status || '').toLowerCase())).length,
  }), [visibleCampaigns]);

  // Realtime should patch the UI quietly. Push notifications handle alerts.
  const handleRealtimeUpdate = useCallback((payload: {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    new?: any;
    old?: any;
  }) => {
    if (__DEV__) {
      console.log('[CampaignsScreen] Realtime update received:', payload.eventType);
    }
    if (payload.eventType === 'INSERT') {
      // Silent realtime path: patch list directly (no refresh spinner/toast flicker).
      applyRealtimeUpdate(payload);
      return;
    }

    applyRealtimeUpdate(payload);
  }, [applyRealtimeUpdate]);

  useCampaignRealtime({
    userId: user?.id,
    enabled: !!user,
    onUpdate: handleRealtimeUpdate,
  });

  const { refresh: tiktokRefresh } = useTikTokSync({
    autoSync: true,
    pollingInterval: 10000,
    onSyncComplete: () => refreshSilent(),
  });

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;
      if (initialLoadDone.current) {
        refreshSilent();
      }
    }, [user?.id, refreshSilent])
  );

  const filters: { value: FilterStatus; labelKey: string }[] = [
    { value: 'all', labelKey: 'all' },
    { value: 'active', labelKey: 'active' },
    { value: 'pending', labelKey: 'inReview' },
    { value: 'completed', labelKey: 'completed' },
    { value: 'rejected', labelKey: 'rejected' },
  ];

  const handleCardPress = useCallback((campaignId: string) => {
    navigation.navigate('CampaignDetail', { id: campaignId });
  }, [navigation]);

  const handleExtendPress = useCallback((campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setExtendModalVisible(true);
  }, []);

  const handleExtendSuccess = useCallback(() => {
    setExtendModalVisible(false);
    setSelectedCampaign(null);
    refresh(); // Refresh campaigns list
  }, [refresh]);

  const handleManualRefresh = useCallback(async () => {
    await tiktokRefresh();
    await refreshSilent();
  }, [tiktokRefresh, refreshSilent]);

  const handlePausePress = useCallback(async (campaign: Campaign) => {
    try {
      const { data, error } = await supabase.functions.invoke('user-pause-ad', {
        body: { campaign_id: campaign.id },
      });

      if (error) {
        toast.error(t('error'), t('somethingWentWrong'));
        return;
      }

      if (data?.success) {
        applyRealtimeUpdate({
          eventType: 'UPDATE',
          new: { ...campaign, status: 'paused' },
        });
        toast.info(t('adPaused'), t('adPausedMessage'));
        return;
      }

      switch (data?.error) {
        case 'NO_PERMISSION':
          Alert.alert(t('noPermission'), t('noPermissionPause'));
          break;
        case 'INSUFFICIENT_SPEND':
          Alert.alert(
            t('cannotPause'),
            t('pauseMinSpend') + ' $' + ((campaign as any).spend?.toFixed(2) ?? '0')
          );
          break;
        case 'DAILY_LIMIT_REACHED':
          Alert.alert(t('dailyLimit'), data.message || t('dailyLimitPauses'));
          break;
        case 'ALREADY_PAUSED':
          Alert.alert(t('alreadyPaused'), t('adAlreadyPaused'));
          break;
        case 'INVALID_STATUS':
          Alert.alert(t('cannotPause'), t('onlyActiveCanPause'));
          break;
        default:
          toast.error(t('error'), t('failedToPause'));
      }
    } catch (err: any) {
      toast.error(t('failedToPause'), t('somethingWentWrong'));
    }
  }, [applyRealtimeUpdate, t]);

  // Memoized render item for FlatList performance - includes Boost Again button outside card
  const renderItem = useCallback(({ item }: { item: Campaign }) => (
    <View style={{ gap: 8, marginBottom: 16 }}>
      <CampaignCard 
        campaign={item} 
        onPress={() => handleCardPress(item.id)}
        onExtendPress={handleExtendPress}
        canPauseAds={canPauseAds}
        canExtendAds={canExtendAds}
        onPausePress={handlePausePress}
      />
      
      {/* Boost Again Button - Outside Card, only for completed-like campaigns */}
      {!isPaymentsHidden && ['completed', 'paused'].includes((item.status || '').toLowerCase()) && (
        <TouchableOpacity
          style={styles.boostAgainButton}
          onPress={() => {
            navigation.navigate('Main', {
              screen: 'CreateAd',
              params: {
                prefill: {
                  objective: item.objective,
                  target_age_min: (item as any).target_age_min,
                  target_age_max: (item as any).target_age_max,
                  target_gender: (item as any).target_gender,
                  target_audience: (item as any).target_audience,
                  daily_budget: (item as any).daily_budget,
                  duration_days: (item as any).duration_days,
                  call_to_action: (item as any).call_to_action,
                  video_url: (item as any).video_url || '',
                  destination_url: (item as any).destination_url || null,
                }
              }
            });
          }}
          activeOpacity={0.7}
        >
          <Rocket size={16} color="#7C3AED" />
          <Text style={[styles.boostAgainText, isRTL && styles.textRTL]}>
            {t('boostAgain')}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  ), [handleCardPress, handleExtendPress, navigation, t, isRTL, isPaymentsHidden, styles]);

  const keyExtractor = useCallback((item: Campaign) => item.id, []);

  const getItemLayout = useCallback((data: any, index: number) => ({
    length: 200, // Approximate card height
    offset: 200 * index,
    index,
  }), []);

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t('campaigns')}
        onBack={() => navigation.goBack()}
        style={{ paddingTop: insets.top + 8, marginBottom: 0 }}
        rightElement={!isPaymentsHidden ? (
          <TouchableOpacity
            onPress={() => navigation.navigate('Main', { screen: 'CreateAd' })}
            activeOpacity={0.85}
            style={styles.newAdButton}
          >
            <LinearGradient
              colors={['#7C3AED', '#9333EA']}
              style={styles.newAdButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Plus size={16} color="#fff" />
              <Text style={styles.newAdButtonText}>+ {t('createAd')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : null}
      />

      {/* Filter Tabs — in RTL, first item (All) appears rightmost automatically */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
        >
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter.value}
            style={[
              styles.filterTab,
              activeFilter === filter.value && styles.filterTabActive,
            ]}
            onPress={() => setActiveFilter(filter.value)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterTabText,
                activeFilter === filter.value && styles.filterTabTextActive,
                isRTL && styles.textRTL,
              ]}
            >
              {t(filter.labelKey)}
              {filterCounts[filter.value] !== undefined && ` (${filterCounts[filter.value]})`}
            </Text>
          </TouchableOpacity>
        ))}
        </ScrollView>
      </View>

      {/* Campaigns List - data is client-filtered (instant) */}
      {isLoading && !initialLoadDone.current ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={colors.primary?.DEFAULT ?? '#7C3AED'} />
          <Text style={[styles.emptyStateText, isRTL && styles.textRTL, { marginTop: 12 }]}>{t('loading') || 'Loading...'}</Text>
        </View>
      ) : filteredCampaigns.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyStateText, isRTL && styles.textRTL]}>{t('noCampaigns')}</Text>
          {!isPaymentsHidden && (
            <TouchableOpacity
              style={styles.createButtonContainer}
              onPress={() => navigation.navigate('Main', { screen: 'CreateAd' })}
            >
              <LinearGradient
                colors={['#7C3AED', '#9333EA']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.createButton}
              >
                <Plus size={20} color="#fff" />
                <Text style={[styles.createButtonText, isRTL && styles.textRTL]}>{t('createFirstAd')}</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredCampaigns || []}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          getItemLayout={getItemLayout}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={handleManualRefresh}
              tintColor="transparent"
              colors={['transparent']}
              progressViewOffset={-1000}
              style={{ opacity: 0 }}
            />
          }
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 100 }
          ]}
          removeClippedSubviews={false}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          updateCellsBatchingPeriod={50}
        />
      )}

      {/* Extend Ad Modal - Rendered at screen level for proper popup overlay */}
      {selectedCampaign && (
        <ExtendAdModal
          open={extendModalVisible}
          onOpenChange={(open) => {
            setExtendModalVisible(open);
            if (!open) setSelectedCampaign(null);
          }}
          campaignId={selectedCampaign.id}
          campaignTitle={selectedCampaign.title}
          dailyBudget={Number((selectedCampaign as any).daily_budget) || 20}
          totalBudget={getDisplayBudget(selectedCampaign as any)}
          durationDays={(selectedCampaign as any).duration_days}
          realEndDate={(selectedCampaign as any).real_end_date ?? null}
          extensionStatus={(selectedCampaign as any).extension_status ?? null}
          onSuccess={handleExtendSuccess}
        />
      )}
    </View>
  );
}

export default Campaigns;

const createStyles = (colors: any, insets: any, isRTL?: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.DEFAULT,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingStart: spacing.md,
    paddingEnd: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.card.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: insets.top + 8,
    marginBottom: 16,
  },
  headerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitleText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.foreground.DEFAULT,
    fontFamily: 'Rabar_021',
  },
  headerRTL: {
    flexDirection: 'row',
  },
  textRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  backButtonWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButton: {
    padding: 8,
    marginStart: -8,
  },
  backButtonLabel: {
    fontSize: 16,
    color: colors.foreground.DEFAULT,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.foreground.DEFAULT,
    flex: 1,
    textAlign: 'center',
  },
  newAdButton: {
    borderRadius: borderRadius.button,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  newAdButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: spacing.xs,
    borderRadius: 999,
  },
  newAdButtonText: {
    color: colors.primary?.foreground ?? '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  filterContainer: {
    backgroundColor: colors.card.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
  },
  filterContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  filterTab: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: 20,
    backgroundColor: colors.background.secondary || '#F3F4F6',
    minHeight: 36,
    justifyContent: 'center',
    marginEnd: spacing.xs,
  },
  filterTabActive: {
    backgroundColor: colors.primary.DEFAULT,
  },
  filterTabText: {
    fontSize: 13,
    color: colors.foreground.muted,
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: colors.primary?.foreground ?? '#FFFFFF',
    fontWeight: '600',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: spacing.md,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.foreground.muted,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  boostAgainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.3)',
    backgroundColor: 'transparent',
    marginTop: 8,
    marginHorizontal: spacing.md,
  },
  boostAgainText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: '#7C3AED',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.foreground.DEFAULT,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.foreground.muted,
    textAlign: 'center',
  },
  createButtonContainer: {
    width: '100%',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.button,
    gap: spacing.sm,
    height: 56,
    justifyContent: 'center',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

