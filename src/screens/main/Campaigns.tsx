import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, FlatList, RefreshControl, ScrollView, Alert } from 'react-native';
import { useNavigation, useIsFocused, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRemoteConfig } from '@/contexts/RemoteConfigContext';
import { CampaignCard } from '@/components/common/CampaignCard';
import { ExtendAdModal } from '@/components/common/ExtendAdModal';
import { Plus, AlertCircle, Rocket } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing, borderRadius } from '@/theme/spacing';
import { useCampaigns } from '@/hooks/useCampaigns';
import { useCampaignRealtime } from '@/hooks/useCampaignRealtime';
import { getCached } from '@/services/globalCache';
import { safeQuery } from '@/integrations/supabase/client';
import { supabase } from '@/lib/supabase';
import { Text } from '@/components/common/Text';
import { toast } from '@/utils/toast';
import { isRTL, rtlText, rtlRow } from '@/utils/rtl';

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
  const { settings: config } = useRemoteConfig();
  const { t, language } = useLanguage();
  const rtl = isRTL(language);
  const { colors } = useTheme();
  const styles = createStyles(colors, insets, rtl);
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');
  const [extendModalVisible, setExtendModalVisible] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const cachedProfile = getCached<any>('profile', null);
  const [canPauseAds, setCanPauseAds] = useState(Boolean(cachedProfile?.can_pause_ads));

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
            .select('can_pause_ads')
            .eq('user_id', user.id)
            .maybeSingle()
        );
        setCanPauseAds(Boolean(data?.can_pause_ads));
      } catch (error) {
        console.warn('[Campaigns] Failed to fetch pause permission:', error);
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
  
  // Use optimized hook with caching
  const { campaigns, isRefreshing, refresh, refreshSilent, applyRealtimeUpdate } = useCampaigns({
    userId: user?.id || '',
    filter: activeFilter,
    autoRefresh: true,
    refreshInterval: 10000,
  });

  // Handle realtime updates independently
  const handleRealtimeUpdate = useCallback((payload: {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    new?: any;
    old?: any;
  }) => {
    console.log('[CampaignsScreen] Realtime update received:', payload.eventType);
    applyRealtimeUpdate(payload);
  }, [applyRealtimeUpdate]);

  // Subscribe to realtime updates (independent of Lovable web app)
  useCampaignRealtime({
    userId: user?.id,
    enabled: !!user,
    onUpdate: handleRealtimeUpdate,
  });

  // TikTok sync only while focused
  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return () => {};

      let isActive = true;
      const syncWithTikTok = async () => {
        if (!isActive) return;
        try {
          await supabase.functions.invoke('tiktok-sync-status', {
            body: { syncAll: true },
          });
          refreshSilent();
        } catch (err) {
          console.error('[CampaignsScreen] TikTok sync failed:', err);
        }
      };

      // Initial sync
      syncWithTikTok();

      // Sync every 10 seconds while focused
      const interval = setInterval(syncWithTikTok, 10000);

      return () => {
        isActive = false;
        clearInterval(interval);
      };
    }, [user?.id])
  );

  // Refresh campaigns whenever the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refreshSilent();
      return () => {};
    }, [refreshSilent])
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

  const handlePausePress = useCallback(async (campaign: Campaign) => {
    try {
      const { data, error } = await supabase.functions.invoke('user-pause-ad', {
        body: { campaign_id: campaign.id },
      });

      if (error) {
        Alert.alert(t('error') || 'Error', error.message);
        return;
      }

      if (data?.success) {
        applyRealtimeUpdate({
          eventType: 'UPDATE',
          new: { ...campaign, status: 'paused' },
        });
        toast.info(t('adPaused') || 'Ad Paused', t('adPausedMessage') || 'Your ad has been paused successfully.');
        refreshSilent();
        return;
      }

      switch (data?.error) {
        case 'NO_PERMISSION':
          Alert.alert(t('noPermission') || 'No Permission', t('noPermissionPause') || 'You do not have permission to pause ads.');
          break;
        case 'INSUFFICIENT_SPEND':
          Alert.alert(
            t('cannotPause') || 'Cannot Pause',
            (t('pauseMinSpend') || 'Ad must spend at least $5 before pausing. Current: $') + ((campaign as any).spend?.toFixed(2) ?? '0')
          );
          break;
        case 'DAILY_LIMIT_REACHED':
          Alert.alert(t('dailyLimit') || 'Daily Limit', data.message || (t('dailyLimitPauses') || "You've used all pauses today."));
          break;
        case 'ALREADY_PAUSED':
          Alert.alert(t('alreadyPaused') || 'Already Paused', t('adAlreadyPaused') || 'This ad has already been paused.');
          break;
        case 'INVALID_STATUS':
          Alert.alert(t('cannotPause') || 'Cannot Pause', t('onlyActiveCanPause') || 'Only active ads can be paused.');
          break;
        default:
          Alert.alert(t('error') || 'Error', data?.message || (t('failedToPause') || 'Failed to pause ad.'));
      }
      refreshSilent();
    } catch (err: any) {
      refreshSilent();
      toast.error(t('failedToPause') || 'Failed to pause ad', err?.message || 'Please try again');
    }
  }, [applyRealtimeUpdate, refreshSilent, t]);

  // Memoized render item for FlatList performance - includes Boost Again button outside card
  const renderItem = useCallback(({ item }: { item: Campaign }) => (
    <View style={{ gap: 8, marginBottom: 16 }}>
      <CampaignCard 
        campaign={item} 
        onPress={() => handleCardPress(item.id)}
        onExtendPress={handleExtendPress}
        canPauseAds={canPauseAds}
        onPausePress={handlePausePress}
      />
      
      {/* Boost Again Button - Outside Card, only for completed campaigns */}
      {item.status === 'completed' && (
        <TouchableOpacity
          style={[styles.boostAgainButton, isRTL && styles.rowReverse]}
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
                  // NOTE: destination_url and video_url are NOT passed
                }
              }
            });
          }}
          activeOpacity={0.7}
        >
          <Rocket size={16} color="#7C3AED" />
          <Text style={[styles.boostAgainText, isRTL && styles.textRTL]}>
            {t('boostAgain') || 'Boost Again'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  ), [handleCardPress, handleExtendPress, navigation, t, isRTL]);

  const keyExtractor = useCallback((item: Campaign) => item.id, []);

  const getItemLayout = useCallback((data: any, index: number) => ({
    length: 200, // Approximate card height
    offset: 200 * index,
    index,
  }), []);

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t('campaigns') || 'Campaigns'}
        onBack={() => navigation.goBack()}
        rightElement={
          <TouchableOpacity
            style={styles.newAdButton}
            onPress={() => navigation.navigate('Main', { screen: 'CreateAd' })}
          >
            <LinearGradient
              colors={colors.gradients.primary}
              style={[styles.newAdButtonGradient, isRTL && styles.rowReverse]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Plus size={18} color="#fff" />
              <Text style={[styles.newAdButtonText, isRTL && styles.textRTL]}>{t('newAd') || 'New Ad'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        }
        style={{ paddingTop: insets.top + 16 }}
      />

      {/* Filter Tabs */}
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
            </Text>
          </TouchableOpacity>
        ))}
        </ScrollView>
      </View>

      {/* Campaigns List - Optimized FlatList */}
      {campaigns.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyStateText, isRTL && styles.textRTL]}>{t('noCampaigns')}</Text>
          <TouchableOpacity
            style={styles.createButtonContainer}
            onPress={() => navigation.navigate('Main', { screen: 'CreateAd' })}
          >
            <LinearGradient
              colors={['#7C3AED', '#9333EA']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.createButton, isRTL && styles.rowReverse]}
            >
              <Plus size={20} color="#fff" />
              <Text style={[styles.createButtonText, isRTL && styles.textRTL]}>{t('createFirstAd')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={campaigns}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          getItemLayout={getItemLayout}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={refresh} />
          }
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 100 }
          ]}
          // PERFORMANCE OPTIMIZATIONS:
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={8}
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
          dailyBudget={(selectedCampaign as any).daily_budget || 20}
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
  headerRTL: {
    flexDirection: 'row',
  },
  rowReverse: {
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
    width: 40,
    height: 40,
    minWidth: 40,
    minHeight: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  backButtonLabel: {
    fontSize: 16,
    color: '#000',
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
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  newAdButtonText: {
    color: '#fff',
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
    color: '#fff',
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

