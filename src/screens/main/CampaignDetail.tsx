import { CampaignStatusBadge } from '@/components/common/CampaignStatusBadge';
import { ExtendAdModal } from '@/components/common/ExtendAdModal';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { Text } from '@/components/common/Text';
import { TransactionIdInput } from '@/components/common/TransactionIdInput';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRemoteConfig } from '@/contexts/RemoteConfigContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useTikTokSync } from '@/hooks/useTikTokSync';
import { safeQuery, supabase } from '@/integrations/supabase/client';
import { useOwnerAuth } from '@/hooks/useOwnerAuth';
import { usePricingConfig } from '@/hooks/usePricingConfig';
import { getCached, getGlobalCache, setCached } from '@/services/globalCache';
import { getErrorMessageForUser } from '@/utils/errorHandling';
import { formatIQD } from '@/utils/currency';
import { borderRadius, spacing } from '@/theme/spacing';
import { getFontFamily } from '@/theme/typography';
import { getDisplayBudget, getExtensionStatusText } from '@/utils/campaignBudget';
import { calculateTax } from '@/lib/pricing';
import { formatDateNumericDMY, formatDateTimeNumeric, formatTime24 } from '@/utils/dateFormat';
import { fetchTikTokPublicUrl, isValidTikTokPublicUrl, shouldHydrateTikTokPublicUrl } from '@/utils/tiktokVideoLink';
import { toast } from '@/utils/toast';
import { translateObjective } from '@/utils/transactionCampaignTranslator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useCampaignRealtime } from '@/hooks/useCampaignRealtime';
import { Calendar, ChevronDown, ChevronUp, Clock, CreditCard, DollarSign, Eye, FileText, Megaphone, Play, Plus, Rocket, Sparkles, Target, Users, X } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as RN from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';

const { ActivityIndicator, Alert, Image, InteractionManager, Linking, Modal, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } = RN;

interface CampaignData {
  id: string;
  title: string;
  objective: string;
  status: string;
  daily_budget: number;
  total_budget: number;
  target_spend?: number | null;
  real_budget?: number | null;
  duration_days: number;
  spend: number;
  views: number;
  clicks: number;
  leads: number;
  target_age_min: number | null;
  target_age_max: number | null;
  target_gender: string | null;
  target_audience?: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  real_end_date?: string | null;
  call_to_action?: string | null;
  tiktok_rejection_reason?: string | null;
  tiktok_ad_status?: string | null;
  tiktok_adgroup_status?: string | null;
  tiktok_campaign_status?: string | null;
  tiktok_public_url?: string | null;
  tiktok_video_id?: string | null;
  tiktok_adgroup_id?: string | null;
  video_url?: string | null;
  api_error?: string | null;
  extension_status?: 'awaiting_payment' | 'verifying_payment' | 'processing' | null;
  pause_locked?: boolean | null;
  is_paused_by_user?: boolean | null;
}

interface Transaction {
  id: string;
  amount: number;
  description: string;
  created_at: string;
  status: string;
}

// Note: createStyles is defined after the component due to its size

export function CampaignDetail() {
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t, language, isRTL } = useLanguage();
  const { colors } = useTheme();
  const { isPaymentsHidden } = useRemoteConfig();
  const { hasAdminAccess } = useOwnerAuth();
  const { convertToIQD } = usePricingConfig();
  const fontFamily = getFontFamily(language as 'ckb' | 'ar');
  
  // Create styles with current font family (must be before any usage)
  const styles = createStyles(colors, fontFamily, isRTL);

  // Null guards: avoid reading from undefined route.params / layout refs
  const params = route?.params ?? {};
  const id = (params as { id?: string }).id;
  const cachedCampaign = getCached<CampaignData | null>(id ? `campaign_${id}` : '', null);
  const cachedCampaigns = getCached<CampaignData[]>('campaigns', []);
  const cachedFromList =
    (id && cachedCampaigns.find((item) => item?.id === id)) ||
    (id ? getGlobalCache().campaignsById.get(id) ?? null : null) ||
    null;
  const cachedTransactions = getCached<Transaction[]>(id ? `campaign_transactions_${id}` : '', []);

  const [campaign, setCampaign] = useState<CampaignData | null>(cachedCampaign || cachedFromList);
  const [transactions, setTransactions] = useState<Transaction[]>(cachedTransactions);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [extendPromptVisible, setExtendPromptVisible] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const extendPromptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const EXTEND_PROMPT_KEY = (cid: string) => `extend_prompt_shown_${cid}`;
  const EXTEND_PROMPT_MS = 60 * 60 * 1000;
  const [thumbnailError, setThumbnailError] = useState(false);
  const [canExtendAds, setCanExtendAds] = useState(false);
  const [pauseProfile, setPauseProfile] = useState<{ can_pause_ads?: boolean; daily_pause_limit?: number } | null>(null);
  const [isPausing, setIsPausing] = useState(false);
  const [showPauseSuccessCard, setShowPauseSuccessCard] = useState(false);
  const [pauseLimitInfo, setPauseLimitInfo] = useState<{ daily_limit: number; remaining: number } | null>(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const lastFetchRef = useRef(0);
  const initialLoadDone = useRef(false);
  const MIN_FETCH_INTERVAL = 2000;
  const hasVideoLink =
    !isPaymentsHidden &&
    (
      (typeof campaign?.tiktok_public_url === 'string' && campaign?.tiktok_public_url.includes('/@')) ||
      !!campaign?.video_url
    );

  /**
   * Persist campaign to state + caches. Incoming row from DB wins for budget/dates/status.
   * Only views/spend/leads/clicks use Math.max (monotonic metrics).
   */
  const persistCampaignSnapshot = useCallback(async (incoming: CampaignData) => {
    setCampaign((prev) => {
      const base = prev ? { ...prev, ...incoming } : { ...incoming };
      return {
        ...base,
        views: Math.max(prev?.views || 0, incoming.views || 0),
        spend: Math.max(prev?.spend || 0, incoming.spend || 0),
        leads: Math.max(prev?.leads || 0, incoming.leads || 0),
        clicks: Math.max(prev?.clicks || 0, incoming.clicks || 0),
      } as CampaignData;
    });
    // Caches must store same merge; use last known from memory + incoming + metric max
    const prevCached = getCached<CampaignData | null>(`campaign_${id}`, null) || getGlobalCache().campaignsById.get(id) || null;
    const baseCache = prevCached ? { ...prevCached, ...incoming } : { ...incoming };
    const mergedSnapshot: CampaignData = {
      ...baseCache,
      views: Math.max(prevCached?.views || 0, incoming.views || 0),
      spend: Math.max(prevCached?.spend || 0, incoming.spend || 0),
      leads: Math.max(prevCached?.leads || 0, incoming.leads || 0),
      clicks: Math.max(prevCached?.clicks || 0, incoming.clicks || 0),
    } as CampaignData;
    setCached(`campaign_${id}`, mergedSnapshot);
    getGlobalCache().campaignsById.set(id, mergedSnapshot);
    try {
      await AsyncStorage.setItem(
        `campaign_cache_${id}`,
        JSON.stringify({ data: mergedSnapshot, timestamp: Date.now() })
      );
    } catch (_) {}
  }, [id]);

  useEffect(() => {
    setThumbnailError(false);
  }, [(campaign as any)?.thumbnail_url]);

  // Thumbnail Preview Component
  const ThumbnailPreview = ({ campaign }: { campaign: CampaignData }) => {
    const thumbnailUrlValue = (campaign as any).thumbnail_url || null;
    const isValidThumbnail = (url?: string | null) =>
      !!url && url.startsWith('https://') && !url.includes('tiktokcdn.com');
    const isThumbnailValid = isValidThumbnail(thumbnailUrlValue);
    
    if (isThumbnailValid && !thumbnailError) {
      return (
        <View style={styles.thumbnailContainer}>
          <Image
            source={{ uri: thumbnailUrlValue }}
            style={styles.thumbnailImage}
            resizeMode="cover"
            onError={() => setThumbnailError(true)}
          />
          {!isPaymentsHidden && (
            <View style={styles.playOverlay}>
              <Play color={colors.primary.foreground} fill={colors.primary.foreground} size={24} />
            </View>
          )}
        </View>
      );
    }

    // Fallback placeholder
    return (
      <View
        style={[
          styles.thumbnailContainer,
          styles.thumbnailPlaceholder,
          { backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
        ]}
      >
        <Megaphone size={32} color="#9CA3AF" />
      </View>
    );
  };

  const resolveLegacyVideoUrl = useCallback(async () => {
    if (!campaign?.video_url || !supabase) return null;
    try {
      return await fetchTikTokPublicUrl({
        id: campaign.id,
        video_url: campaign.video_url,
        status: campaign.status,
        tiktok_public_url: campaign.tiktok_public_url,
      });
    } catch (err) {
      if (__DEV__) {
        console.warn('[CampaignDetail] Legacy video fetch error:', err);
      }
      return null;
    }
  }, [campaign?.id, campaign?.video_url]);

  useEffect(() => {
    if (!campaign || !shouldHydrateTikTokPublicUrl(campaign)) return;

    let isMounted = true;
    fetchTikTokPublicUrl({
      id: campaign.id,
      video_url: campaign.video_url,
      status: campaign.status,
      tiktok_public_url: campaign.tiktok_public_url,
    })
      .then((url) => {
        if (!isMounted || !isValidTikTokPublicUrl(url)) return;
        setCampaign((prev) => (prev ? { ...prev, tiktok_public_url: url } : prev));
        setCached(`campaign_${campaign.id}`, {
          ...(getCached<CampaignData | null>(`campaign_${campaign.id}`, null) || campaign),
          tiktok_public_url: url,
        });
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [campaign]);

  const handleViewVideo = useCallback(async () => {
    if (!campaign) return;
    let url =
      typeof campaign.tiktok_public_url === 'string' && campaign.tiktok_public_url.includes('/@')
        ? campaign.tiktok_public_url
        : null;
    if (!url) {
      url = await resolveLegacyVideoUrl();
    }
    if (!url) {
      Alert.alert(t('error'), t('noVideoUrl'));
      return;
    }
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert(t('error'), t('cannotOpenUrl'));
    }
  }, [campaign, resolveLegacyVideoUrl, t]);

  const fetchCampaign = useCallback(async (force = false, silent = false) => {
    if (!user || !id) return;

    const now = Date.now();
    if (!force && now - lastFetchRef.current < MIN_FETCH_INTERVAL) {
      return;
    }
    lastFetchRef.current = now;

    if (!silent && !initialLoadDone.current) {
      setLoading(true);
    }

    try {
      const [campaignResult, transactionResult, profileResult] = await Promise.allSettled([
        safeQuery((client) =>
          client
            .from('campaigns')
            .select('*')
            .eq('id', id)
            .eq('user_id', user.id)
            .maybeSingle()
        ),
        safeQuery((client) =>
          client
            .from('transactions')
            .select('id, amount, description, created_at, status')
            .eq('campaign_id', id)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
        ),
        safeQuery((client) =>
          client
            .from('profiles')
            .select('can_pause_ads, can_extend_ads, daily_pause_limit, wallet_balance')
            .eq('user_id', user.id)
            .maybeSingle()
        ),
      ]);

      if (campaignResult.status === 'fulfilled') {
        const { data, error } = campaignResult.value;
        if (error) {
          console.error('Error fetching campaign:', error);
        } else if (data) {
          await persistCampaignSnapshot(data);
        }
      }

      if (transactionResult.status === 'fulfilled' && transactionResult.value.data) {
        setTransactions(transactionResult.value.data);
        setCached(`campaign_transactions_${id}`, transactionResult.value.data);
      }

      if (profileResult.status === 'fulfilled') {
        const profile = profileResult.value.data as { can_pause_ads?: boolean; can_extend_ads?: boolean; daily_pause_limit?: number; wallet_balance?: number } | null;
        setCanExtendAds(Boolean(profile?.can_extend_ads));
        setPauseProfile({
          can_pause_ads: Boolean(profile?.can_pause_ads),
          daily_pause_limit: Number(profile?.daily_pause_limit) || 1,
        });
        setWalletBalance(Number(profile?.wallet_balance) ?? 0);
        const limit = profile?.daily_pause_limit ?? 1;
        const today = new Date().toISOString().slice(0, 10);
        const pauseRes = await safeQuery((client) =>
          client
            .from('user_pause_limits')
            .select('pause_count')
            .eq('user_id', user.id)
            .eq('pause_date', today)
            .maybeSingle()
        );
        const used = (pauseRes?.data as { pause_count?: number } | null)?.pause_count ?? 0;
        setPauseLimitInfo({ daily_limit: limit, remaining: Math.max(0, limit - used) });
      }
    } catch (error) {
      console.error('Error:', error);
      if (!silent) {
        toast.error(t('error') || 'Error', t('failedToLoad') || 'Failed to load');
      }
    } finally {
      initialLoadDone.current = true;
      setLoading(false);
      setLastUpdated(new Date());
    }
  }, [user, id, persistCampaignSnapshot, t]);

  // Focus refresh — ALWAYS silent (no spinner, no toast)
  useFocusEffect(
    useCallback(() => {
      if (!id || !user) return;
      if (initialLoadDone.current) {
        fetchCampaign(true, true);
      }
    }, [id, user?.id, fetchCampaign])
  );

  const handleRefresh = useCallback(async () => {
    await fetchCampaign(true, true);
    await tiktokRefresh();
  }, [fetchCampaign, tiktokRefresh]);

  const handleCampaignRealtime = useCallback(
    async (payload: { eventType: string; new?: any; old?: any }) => {
      if (payload.eventType === 'DELETE') {
        setCampaign(null);
        return;
      }
      if ((payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') && payload.new) {
        const newStatus = (payload.new?.status || '').toLowerCase();
        const oldStatus = (payload.old?.status || '').toLowerCase();
        await persistCampaignSnapshot(payload.new as CampaignData);
        setLastUpdated(new Date());
        // No success toasts for status changes from realtime/refresh (silent refresh rule)
        if (newStatus === 'rejected' || newStatus === 'failed') {
          toast.info(t('rejected') || 'Rejected', language === 'ckb' ? 'کامپەین ڕەتکرایەوە' : 'تم رفض الحملة');
        }
      }
    },
    [persistCampaignSnapshot, t, language]
  );

  useCampaignRealtime({
    campaignId: id || undefined,
    enabled: !!user && !!id,
    onUpdate: handleCampaignRealtime,
  });

  const { refresh: tiktokRefresh } = useTikTokSync({
    campaignId: id || undefined,
    autoSync: true,
    pollingInterval: 15000,
    onSyncComplete: () => fetchCampaign(true, true),
  });

  // Auto-refresh every 15s — silent (no spinner, no toast)
  useEffect(() => {
    if (!id || !user) return;
    const interval = setInterval(() => fetchCampaign(true, true), 15000);
    return () => clearInterval(interval);
  }, [id, user?.id, fetchCampaign]);

  useEffect(() => {
    let isMounted = true;

    const loadCached = async () => {
      try {
        const cachedMemory = getCached<CampaignData | null>(`campaign_${id}`, null);
        if (cachedMemory && isMounted) {
          setCampaign(cachedMemory);
          setLoading(false);
        }

        const cachedDisk = await AsyncStorage.getItem(`campaign_cache_${id}`);
        if (!cachedDisk || !isMounted) return;
        const parsed = JSON.parse(cachedDisk);
        if (parsed?.data) {
          setCampaign(parsed.data);
          setLoading(false);
          setCached(`campaign_${id}`, parsed.data);
        }

      } catch (error) {
        console.warn('Failed to load cached campaign:', error);
      }
    };

    loadCached();
    InteractionManager.runAfterInteractions(() => {
      fetchCampaign(true);
    });

    let transactionChannel: any;
    let profileChannel: any;

    if (user?.id && supabase) {
      profileChannel = supabase
        .channel(`user-profile-${user.id}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `user_id=eq.${user.id}` },
          (payload) => {
            const n = payload.new as any;
            setCanExtendAds(Boolean(n?.can_extend_ads));
            setPauseProfile((prev) => ({
              ...(prev || {}),
              can_pause_ads: Boolean(n?.can_pause_ads),
              daily_pause_limit: Number(n?.daily_pause_limit) || (prev?.daily_pause_limit ?? 1),
            }));
          }
        )
        .subscribe();

      // Campaign row updates handled by useCampaignRealtime({ campaignId }) — avoids duplicate channels

      transactionChannel = supabase
        .channel(`campaign-transactions-${id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'transactions',
            filter: `campaign_id=eq.${id}`,
          },
          () => {
            fetchCampaign(true, true);
          }
        )
        .subscribe();
    }

    return () => {
      isMounted = false;
      if (supabase) {
        if (transactionChannel) supabase.removeChannel(transactionChannel);
        if (profileChannel) supabase.removeChannel(profileChannel);
      }
    };
  }, [user, id, fetchCampaign, persistCampaignSnapshot]);

  // Extend prompt: 1-hour auto-hide via AsyncStorage. Eligibility: can_extend_ads, active, tiktok_adgroup_id, daily_budget >= 20, no pending extension.
  useEffect(() => {
    if (!campaign?.id) return;
    const status = (campaign.status || '').toLowerCase();
    const dailyBudget = Number(campaign.daily_budget) || 0;
    const spentPercentage = displayBudget > 0 ? ((campaign.spend || 0) / displayBudget) * 100 : 0;
    const extStatus = campaign.extension_status;
    const noPendingExtension = extStatus !== 'verifying_payment' && extStatus !== 'processing' && !extStatus;
    const hasTiktokAdGroup = !!(campaign as any).tiktok_adgroup_id;
    const canExtend =
      canExtendAds &&
      hasTiktokAdGroup &&
      status === 'active' &&
      spentPercentage >= 75 &&
      dailyBudget >= 20 &&
      noPendingExtension;
    if (!canExtend) {
      setExtendPromptVisible(false);
      return;
    }
    let isMounted = true;
    const key = EXTEND_PROMPT_KEY(campaign.id);
    const run = async () => {
      const raw = await AsyncStorage.getItem(key);
      const stored = raw ? Number(raw) : NaN;
      const now = Date.now();
      if (!Number.isFinite(stored)) {
        await AsyncStorage.setItem(key, String(now));
        if (isMounted) setExtendPromptVisible(true);
        extendPromptTimerRef.current = setTimeout(() => {
          if (isMounted) setExtendPromptVisible(false);
        }, EXTEND_PROMPT_MS);
        return;
      }
      const elapsed = now - stored;
      if (elapsed >= EXTEND_PROMPT_MS) {
        if (isMounted) setExtendPromptVisible(false);
        return;
      }
      if (isMounted) setExtendPromptVisible(true);
      extendPromptTimerRef.current = setTimeout(() => {
        if (isMounted) setExtendPromptVisible(false);
      }, EXTEND_PROMPT_MS - elapsed);
    };
    run();
    return () => {
      isMounted = false;
      if (extendPromptTimerRef.current) {
        clearTimeout(extendPromptTimerRef.current);
        extendPromptTimerRef.current = null;
      }
    };
  }, [campaign?.id, campaign?.status, displayBudget, campaign?.spend, campaign?.daily_budget, campaign?.extension_status, canExtendAds]);

  const handleMaybeLaterOrCloseExtend = useCallback(async () => {
    if (!campaign?.id) return;
    await AsyncStorage.setItem(EXTEND_PROMPT_KEY(campaign.id), String(Date.now() - EXTEND_PROMPT_MS));
    setExtendPromptVisible(false);
  }, [campaign?.id]);

  const handlePause = async () => {
    if (!campaign) return;
    try {
      setIsPausing(true);

      const { data, error } = await supabase.functions.invoke('user-pause-ad', {
        body: { campaign_id: campaign.id },
      });

      // This should NOT happen anymore since the function returns HTTP 200,
      // but keep as safety net for network errors / 401 auth failures
      if (error) {
        console.error('[Pause] invoke error:', error);
        Alert.alert('Error', 'Network error. Please check your connection and try again.');
        return;
      }

      // SUCCESS
      if (data.success) {
        Alert.alert(
          t('adPaused') || 'Ad Paused',
          t('adPausedSuccess') || 'Your ad has been paused successfully.',
        );
        setShowPauseSuccessCard(true);
        fetchCampaign(true);
        return;
      }

      // BUSINESS ERROR — data.success === false
      // The edge function returns { success: false, error: "CODE", message: "..." }
      console.log('[Pause] Business error:', data.error, data.message);

      switch (data.error) {
        case 'NO_PERMISSION':
          Alert.alert(
            t('noPermission') || 'No Permission',
            t('noPermissionPause') || 'You do not have permission to pause ads.',
          );
          break;

        case 'INSUFFICIENT_SPEND':
          Alert.alert(
            t('cannotPause') || 'Cannot Pause',
            data.message || `Ad must spend at least $5 before pausing. Current: $${campaign?.spend?.toFixed(2)}`,
          );
          break;

        case 'DAILY_LIMIT_REACHED':
          Alert.alert(
            t('dailyLimit') || 'Daily Limit',
            data.message || `You've used all ${data.daily_limit} pauses today. Try again tomorrow.`,
          );
          break;

        case 'ALREADY_PAUSED':
          Alert.alert(
            t('alreadyPaused') || 'Already Paused',
            t('alreadyPausedMsg') || 'This ad has already been paused.',
          );
          break;

        case 'INVALID_STATUS':
          Alert.alert(
            t('cannotPause') || 'Cannot Pause',
            t('onlyActivePause') || 'Only active ads can be paused.',
          );
          break;

        case 'TIKTOK_API_ERROR':
          Alert.alert(
            t('pauseFailed') || 'Pause Failed',
            t('pauseFailedTiktok') || 'Failed to pause ad on TikTok. Please try again later.',
          );
          break;

        case 'NO_ADVERTISER':
        case 'NO_ADGROUP':
        case 'NO_TOKEN':
        case 'DB_UPDATE_ERROR':
          Alert.alert(
            t('error') || 'Error',
            t('pauseContactSupport') || 'Unable to pause this ad. Please contact support.',
          );
          break;

        default:
          Alert.alert(
            t('error') || 'Error',
            data.message || t('somethingWrong') || 'Something went wrong.',
          );
      }
    } catch (err) {
      console.error('[Pause] Unexpected error:', err);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsPausing(false);
    }
  };

  const showPauseConfirmation = async () => {
    if (!campaign || !user?.id) return;
    // Fetch today's pause usage
    const today = new Date().toISOString().split('T')[0];
    const { data: todayPauses } = await supabase
      .from('user_pause_limits')
      .select('pause_count')
      .eq('user_id', user.id)
      .eq('pause_date', today)
      .maybeSingle();

    const dailyLimit = pauseProfile?.daily_pause_limit || 1;
    const used = todayPauses?.pause_count || 0;
    const remaining = dailyLimit - used;

    if (remaining <= 0) {
      Alert.alert(
        t('dailyLimit') || 'Daily Limit Reached',
        t('dailyLimitMsg') || `You've used all ${dailyLimit} pauses today. Try again tomorrow.`,
      );
      return;
    }

    Alert.alert(
      t('pauseAd') || 'Pause Ad',
      `${t('pauseConfirm') || 'Are you sure you want to pause this ad? This action cannot be undone.'}\n\n${t('remainingPauses') || 'Remaining pauses today'}: ${remaining}/${dailyLimit}`,
      [
        { text: t('cancel') || 'Cancel', style: 'cancel' },
        {
          text: t('pauseNow') || 'Pause Now',
          style: 'destructive',
          onPress: () => handlePause(),
        },
      ],
    );
  };

  // Guard: no id from route params — avoid rendering content that may trigger layout/containerHeight crashes
  if (!id) {
    return (
      <View style={[styles.container, styles.loadingContainer, { paddingTop: insets.top }]}>
        <Text style={[styles.errorText, isRTL && styles.textRTL]}>{t('campaignNotFound')}</Text>
        <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
          <Text style={[styles.buttonText, isRTL && styles.textRTL]}>{t('goToCampaigns')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!campaign) {
    if (loading) {
      return (
        <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
          <Text style={[styles.errorText, isRTL && styles.textRTL]}>{t('loading')}</Text>
        </View>
      );
    }
    return (
      <View style={[styles.errorContainer, { paddingTop: insets.top }]}>
        <Text style={[styles.errorText, isRTL && styles.textRTL]}>{t('campaignNotFound')}</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.buttonText, isRTL && styles.textRTL]}>{t('goToCampaigns')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Deleted externally — never show detail, treat as not found
  if ((campaign.status || '').toLowerCase() === 'deleted_external') {
    return (
      <View style={[styles.errorContainer, { paddingTop: insets.top }]}>
        <Text style={[styles.errorText, isRTL && styles.textRTL]}>{t('campaignNotFound')}</Text>
        <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
          <Text style={[styles.buttonText, isRTL && styles.textRTL]}>{t('goToCampaigns')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isViewsObjective = campaign.objective === 'views';
  // Conversions objective includes both 'conversions' and 'lead_generation' - both show as "Contacts & Messages"
  const isConversionsObjective = campaign.objective === 'conversions' || campaign.objective === 'lead_generation' || campaign.objective === 'contact' || campaign.objective === 'leads';
  
  // Calculate metrics
  const cpm = campaign.views && campaign.views > 0 && campaign.spend
    ? (campaign.spend / campaign.views) * 1000
    : 0;
  const costPerConversion = campaign.leads && campaign.leads > 0 && campaign.spend
    ? campaign.spend / campaign.leads
    : 0;
  const costPerClick = campaign.clicks && campaign.clicks > 0 && campaign.spend
    ? campaign.spend / campaign.clicks
    : 0;

  const isAwaitingPayment = campaign.status === 'awaiting_payment';

  // Calculate finish date
  const finishDate = campaign.completed_at 
    ? new Date(campaign.completed_at)
    : campaign.started_at
    ? new Date(new Date(campaign.started_at).getTime() + campaign.duration_days * 24 * 60 * 60 * 1000)
    : new Date(new Date(campaign.created_at).getTime() + campaign.duration_days * 24 * 60 * 60 * 1000);

  // Format dates (numeric, no English month names)
  const formatDate = (date: Date) => formatDateTimeNumeric(date);

  // Show progress tracker for campaigns in workflow (not active/completed/rejected)
  const showProgressTracker = !['active', 'completed', 'paused', 'rejected', 'failed'].includes(campaign.status);
  
  // Progress tracker logic - matches workflow steps
  // Step 0 (Review) → waiting_for_admin
  // Step 1 (Payment) → awaiting_payment, verifying_payment
  // Step 2 (Launch) → pending
  // Step 3 (Complete) → active, completed, paused
  const getProgressStep = () => {
    if (campaign.status === 'waiting_for_admin') return 0; // Review step
    if (campaign.status === 'awaiting_payment' || campaign.status === 'verifying_payment') return 1; // Payment step
    if (campaign.status === 'pending') return 2; // Launch step
    if (campaign.status === 'active' || campaign.status === 'completed' || campaign.status === 'paused') return 3; // Complete
    return 0;
  };

  const progressStep = getProgressStep();
  const ageRange = campaign.target_age_min && campaign.target_age_max
    ? `${campaign.target_age_min}-${campaign.target_age_max}`
    : '18-65';
  const gender = campaign.target_gender === 'all' ? t('all') : campaign.target_gender || t('all');

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatShortNumber = (value: number): string => {
    return formatNumber(value);
  };

  // Format date for display (DD/MM/YYYY)
  const formatDateShort = (date: Date) => formatDateNumericDMY(date);

  // Get objective display name (translated)
  const getObjectiveDisplayName = () =>
    translateObjective(campaign.objective, language as 'ckb' | 'ar');

  // Get audience display name
  const getAudienceDisplayName = () => {
    const audience = campaign.target_audience;
    if (audience === 'arab') return t('arab');
    if (audience === 'kurdish') return t('kurdish');
    return t('all');
  };

  const displayBudget = getDisplayBudget(campaign);

  // Wallet payment: base + tax in USD, then convert to IQD using dynamic exchange rate.
  const baseBudgetUsd = displayBudget;
  const baseTaxUsd = calculateTax(baseBudgetUsd);
  const walletTotalUsd = baseBudgetUsd + baseTaxUsd;
  const walletTotalIqd = convertToIQD(walletTotalUsd);

  const payWithBalanceLabel = language === 'ckb' ? 'پارەدان لە باڵانس' : 'الدفع من الرصيد';
  const orPayDirectlyLabel = language === 'ckb' ? 'یان ڕاستەوخۆ پارە بدە' : 'أو ادفع مباشرة';
  const insufficientLabel = language === 'ckb' ? 'باڵانس بەس نییە' : 'الرصيد غير كافٍ';
  const addFundsLabel = language === 'ckb' ? 'زیادکردنی باڵانس' : 'إضافة رصيد';
  const closeLabel = language === 'ckb' ? 'داخستن' : 'إغلاق';

  const handlePayWithBalance = useCallback(async () => {
    if (!user || !campaign) return;
    // Wallet must cover base budget + tax (walletTotalUsd), while DB/API keep base-only USD.
    const costUsd = walletTotalUsd;
    if (walletBalance < costUsd) {
      Alert.alert(
        insufficientLabel,
        language === 'ckb'
          ? `${formatIQD(walletTotalIqd)} پێویستە بەڵام ${formatIQD(convertToIQD(walletBalance))} هەیە`
          : `تحتاج ${formatIQD(walletTotalIqd)} لكن لديك ${formatIQD(convertToIQD(walletBalance))}`,
        [
          { text: addFundsLabel, onPress: () => (navigation as any).navigate('ProfileStack', { screen: 'AddBalance' }) },
          { text: closeLabel, style: 'cancel' },
        ]
      );
      return;
    }
    const newBalanceUsd = walletBalance - costUsd;
    const costIqd = walletTotalIqd;
    try {
      await supabase.from('profiles').update({ wallet_balance: newBalanceUsd }).eq('user_id', user.id);
      await supabase
        .from('campaigns')
        .update({
          status: 'verifying_payment',
          payment_method_used: 'wallet_balance',
          payment_amount_iqd: String(costIqd),
          payment_transaction_id: `WALLET-${Date.now()}`,
        })
        .eq('id', campaign.id);
      await supabase.from('transactions').insert({
        user_id: user.id,
        campaign_id: campaign.id,
        type: 'payment',
        // Store BASE ONLY in transactions.amount (tax is platform revenue).
        amount: -(campaign.total_budget ?? baseBudgetUsd),
        status: 'completed',
        payment_method: 'wallet_balance',
        description: language === 'ckb' ? `پارەدانی کامپەین: ${campaign.title}` : `دفع الحملة: ${campaign.title}`,
      });
      toast.success(language === 'ckb' ? 'سەرکەوتوو' : 'تم', language === 'ckb' ? 'پارەدان تەواو بوو' : 'تم الدفع');
      setWalletBalance(newBalanceUsd);
      fetchCampaign(true);
    } catch (e: any) {
      console.error(e);
      const msg = getErrorMessageForUser(e, null, hasAdminAccess, language === 'ar' ? 'ar' : 'ckb');
      Alert.alert(hasAdminAccess ? 'Error' : (language === 'ckb' ? 'هەڵە' : 'خطأ'), msg);
    }
  }, [user, campaign, walletBalance, language, navigation, fetchCampaign, hasAdminAccess]);

  // Calculate start and end dates
  // Use real_end_date (selected date from app) if available, otherwise completed_at, otherwise calculate
  const startDate = campaign.started_at ? new Date(campaign.started_at) : new Date(campaign.created_at);
  const endDate = campaign.real_end_date 
    ? new Date(campaign.real_end_date) // Use the actual selected end date from the app
    : campaign.completed_at 
    ? new Date(campaign.completed_at)
    : campaign.started_at
    ? new Date(new Date(campaign.started_at).getTime() + campaign.duration_days * 24 * 60 * 60 * 1000)
    : new Date(new Date(campaign.created_at).getTime() + campaign.duration_days * 24 * 60 * 60 * 1000);

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={campaign.title}
        onBack={() => navigation.goBack()}
        rightElement={
          <CampaignStatusBadge
            status={campaign.status}
            rejectionReason={campaign.tiktok_rejection_reason}
            tiktokStatus={campaign.tiktok_adgroup_status}
          />
        }
        style={{ paddingTop: insets.top + 8, paddingBottom: 8 }}
      />
      <ScrollView
        style={[styles.scrollView, { flex: 1 }]}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={handleRefresh}
            tintColor="transparent"
            colors={['transparent']}
            progressViewOffset={-1000}
            style={{ opacity: 0 }}
          />
        }
      >
        <View style={{ paddingHorizontal: 16, width: '100%' }}>
        {/* Last Updated - Red, Centered */}
        {lastUpdated && (
          <View style={styles.lastUpdatedContainer}>
            <Text style={styles.lastUpdatedText}>
              {t('lastUpdated')}: {formatTime24(lastUpdated)}
            </Text>
          </View>
        )}

        {/* Extension status banner */}
        {!isPaymentsHidden && (() => {
          const ext = getExtensionStatusText(campaign.extension_status ?? null, (language as 'ckb' | 'ar') || 'ckb');
          if (!ext) return null;
          return (
            <View style={[styles.extensionStatusBanner, ext.color === 'warning' ? styles.extensionStatusBannerWarning : styles.extensionStatusBannerInfo]}>
              <Text style={ext.color === 'warning' ? styles.extensionStatusBannerTextWarning : styles.extensionStatusBannerTextInfo}>
                {ext.text}
              </Text>
            </View>
          );
        })()}

        {isAwaitingPayment && !isPaymentsHidden ? (
          <View style={styles.paymentOnlyContainer}>
            <View style={styles.paymentOnlyCard}>
              <Text style={[styles.paymentOnlyTitle, isRTL && styles.textRTL]}>{t('awaitingPayment')}</Text>
              <Text style={[styles.paymentOnlySubtitle, isRTL && styles.textRTL]}>
                {t('paymentRequired')} — {t('howToPay')}
              </Text>
            </View>

            {/* Pay with Account Balance - Option A */}
            <View style={styles.payWithBalanceCard}>
              <Text style={[styles.payWithBalanceTitle, isRTL && styles.textRTL]}>
                {language === 'ckb' ? 'باڵانسی جزدان' : 'الرصيد'}: {formatIQD(convertToIQD(walletBalance))}
              </Text>
              {walletBalance >= walletTotalUsd ? (
                <>
                  <TouchableOpacity
                    style={styles.payWithBalanceButton}
                    onPress={handlePayWithBalance}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['#7C3AED', '#6D28D9']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.payWithBalanceButtonGradient}
                    >
                      <Text style={styles.payWithBalanceButtonText}>
                        {payWithBalanceLabel} ({formatIQD(walletTotalIqd)})
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity style={[styles.payWithBalanceButton, styles.payWithBalanceButtonDisabled]} disabled>
                    <Text style={styles.payWithBalanceButtonTextDisabled}>{insufficientLabel}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.addFundsLink}
                    onPress={() => (navigation as any).navigate('ProfileStack', { screen: 'AddBalance' })}
                  >
                    <Text style={styles.addFundsLinkText}>{addFundsLabel}</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            <View style={styles.orDivider}>
              <View style={styles.orDividerLine} />
              <Text style={[styles.orDividerText, isRTL && styles.textRTL]}>{orPayDirectlyLabel}</Text>
              <View style={styles.orDividerLine} />
            </View>

            <TransactionIdInput
              campaignId={campaign.id}
              onSuccess={fetchCampaign}
            />
          </View>
        ) : (
        <>
        {/* Progress Tracker - Only show when NOT active/completed */}
        {showProgressTracker && (
          <View style={styles.progressContainer}>
            <View style={styles.progressStep}>
              <View style={[styles.progressIcon, progressStep >= 0 && styles.progressIconActive]}>
                <Clock size={20} color={progressStep >= 0 ? '#7C3AED' : '#CBD5E1'} />
              </View>
              <Text style={[styles.progressLabel, progressStep >= 0 && styles.progressLabelActive]}>
                {t('review') || 'Review'}
              </Text>
            </View>
            <View style={styles.progressLine} />
            <View style={styles.progressStep}>
              <View style={[styles.progressIcon, progressStep >= 1 && styles.progressIconActive]}>
                <CreditCard size={20} color={progressStep >= 1 ? '#7C3AED' : '#CBD5E1'} />
              </View>
              <Text style={[styles.progressLabel, progressStep >= 1 && styles.progressLabelActive]}>
                {t('payment') || 'Payment'}
              </Text>
            </View>
            <View style={styles.progressLine} />
            <View style={styles.progressStep}>
              <View style={[styles.progressIcon, progressStep >= 2 && styles.progressIconActive]}>
                <Play size={20} color={progressStep >= 2 ? '#7C3AED' : '#CBD5E1'} />
              </View>
              <Text style={[styles.progressLabel, progressStep >= 2 && styles.progressLabelActive]}>
                Launch
              </Text>
            </View>
          </View>
        )}

        {/* Main Campaign Card */}
        <View style={styles.mainCard}>
          {/* Card Header with Thumbnail */}
          <View style={styles.cardHeader}>
            <ThumbnailPreview campaign={campaign} />
            <View style={styles.cardHeaderText}>
              <Text style={styles.campaignName}>{campaign.title}</Text>
              <Text style={styles.objectiveType}>{getObjectiveDisplayName()}</Text>
            </View>
          </View>
          {!isPaymentsHidden && hasVideoLink && (
            <TouchableOpacity
              style={styles.videoButton}
              onPress={handleViewVideo}
              activeOpacity={0.7}
            >
              <Play size={16} color="#7C3AED" />
              <Text style={styles.videoButtonText}>{t('viewVideo')}</Text>
            </TouchableOpacity>
          )}
          {campaign.status === 'rejected' && !!campaign.tiktok_rejection_reason && (
            <View style={styles.rejectionReasonCard}>
              <Text style={styles.rejectionReasonLabel}>{t('rejected') || 'Rejected'}</Text>
              <Text style={styles.rejectionReasonText}>{campaign.tiktok_rejection_reason}</Text>
            </View>
          )}

          {/* Metrics */}
          <View style={styles.metricsRow}>
            {isPaymentsHidden ? (
              <>
                <View style={styles.metricCard}>
                  <Text style={styles.metricValue}>{formatShortNumber(campaign.views || 0)}</Text>
                  <Text style={styles.metricLabel}>{t('totalViews')}</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricValue}>{formatShortNumber(campaign.clicks || 0)}</Text>
                  <Text style={styles.metricLabel}>{t('clicks')}</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricValue}>{formatShortNumber(campaign.leads || 0)}</Text>
                  <Text style={styles.metricLabel}>{t('leads') || t('conversions')}</Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.metricCard}>
                  <Text style={styles.metricValue}>${(campaign.spend || 0).toFixed(2)}</Text>
                  <Text style={styles.metricLabel}>{t('spent')}</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricValue}>
                    {isViewsObjective 
                      ? `$${cpm.toFixed(2)}`
                      : formatShortNumber(campaign.leads || 0)
                    }
                  </Text>
                  <Text style={styles.metricLabel}>
                    {isViewsObjective ? t('costPer1kImpressions') : t('conversions')}
                  </Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricValue}>{formatShortNumber(campaign.views || 0)}</Text>
                  <Text style={styles.metricLabel}>{t('totalViews')}</Text>
                </View>
              </>
            )}
          </View>

          {!isPaymentsHidden && (
            <View style={styles.costCard}>
              <View style={styles.costIconContainer}>
                <DollarSign size={20} color={colors.primary.DEFAULT} />
              </View>
              <View style={styles.costTextContainer}>
                <Text style={styles.costLabel}>
                  {isViewsObjective ? t('costPer1kImpressions') : t('costPerConversion')}
                </Text>
                <Text style={styles.costValue}>
                  ${isViewsObjective ? cpm.toFixed(2) : costPerConversion.toFixed(2)}
                </Text>
              </View>
            </View>
          )}

          {/* Summary Text */}
          {!isPaymentsHidden && (
            <View style={styles.summaryTextContainer}>
              <Text style={styles.summaryText}>
                ${displayBudget.toFixed(2)} {t('totalBudget')} • {campaign.duration_days} {campaign.duration_days === 1 ? t('day') : t('days')}
              </Text>
              <Text style={styles.summaryText}>
                📅 {t('created')}: {formatDateShort(new Date(campaign.created_at))}
              </Text>
            </View>
          )}

          {/* Toggle Button for Details */}
          {!isPaymentsHidden && (
            <TouchableOpacity
              style={[styles.toggleButton, detailsExpanded && styles.toggleButtonExpanded]}
              onPress={() => setDetailsExpanded(!detailsExpanded)}
              activeOpacity={0.8}
            >
              <View style={styles.toggleLeft}>
                <View style={[styles.toggleIconContainer, detailsExpanded && styles.toggleIconExpanded]}>
                  <Eye size={20} color={detailsExpanded ? colors.foreground.DEFAULT : colors.foreground.muted} />
                </View>
                <Text style={[styles.toggleText, detailsExpanded && styles.toggleTextExpanded]}>
                  {t('viewDetailsAndGoals')}
                </Text>
              </View>
              {detailsExpanded ? (
                <ChevronUp size={20} color={colors.primary.DEFAULT} />
              ) : (
                <ChevronDown size={20} color={colors.foreground.muted} />
              )}
            </TouchableOpacity>
          )}

          {/* Expanded Details */}
          {!isPaymentsHidden && detailsExpanded && (
            <View style={styles.detailsContainer}>
              {/* Objective Card (Highlighted) */}
              <View style={[styles.detailCard, styles.detailCardHighlighted]}>
                <View style={[styles.detailIconContainer, styles.detailIconHighlighted]}>
                  <Target size={20} color={colors.primary.DEFAULT} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>{t('objective')}</Text>
                  <Text style={styles.detailValue}>{getObjectiveDisplayName()}</Text>
                </View>
              </View>

              {/* Target Audience Card */}
              <View style={styles.detailCard}>
                <View style={styles.detailIconContainer}>
                  <Users size={20} color={colors.foreground.muted} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>{t('targetAudience')}</Text>
                  <Text style={styles.detailValue}>{getAudienceDisplayName()}</Text>
                </View>
              </View>

              {!isPaymentsHidden && (
                <View style={styles.detailCard}>
                  <View style={styles.detailIconContainer}>
                    <DollarSign size={20} color={colors.foreground.muted} />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>{t('budget')}</Text>
                    <Text style={styles.detailValue}>${displayBudget.toFixed(2)}</Text>
                  </View>
                </View>
              )}

              {/* Age Range Card */}
              <View style={styles.detailCard}>
                <View style={styles.detailIconContainer}>
                  <Users size={20} color={colors.foreground.muted} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>{t('ageRange')}</Text>
                  <Text style={styles.detailValue}>{ageRange}</Text>
                </View>
              </View>

              {/* Gender Card */}
              <View style={styles.detailCard}>
                <View style={styles.detailIconContainer}>
                  <Users size={20} color={colors.foreground.muted} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>{t('gender')}</Text>
                  <Text style={styles.detailValue}>{gender}</Text>
                </View>
              </View>

              {/* Start Date Card */}
              <View style={styles.detailCard}>
                <View style={styles.detailIconContainer}>
                  <Calendar size={20} color={colors.foreground.muted} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>{t('startDate')}</Text>
                  <Text style={styles.detailValue}>{formatDateShort(startDate)}</Text>
                </View>
              </View>

              {/* End Date Card */}
              <View style={styles.detailCard}>
                <View style={styles.detailIconContainer}>
                  <Calendar size={20} color={colors.foreground.muted} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>{t('endDate')}</Text>
                  <Text style={styles.detailValue}>{formatDateShort(endDate)}</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* View Invoice Button - Only show for completed-like campaigns */}
        {!isPaymentsHidden && ['completed', 'paused'].includes((campaign.status || '').toLowerCase()) && (
          <View style={styles.invoiceButtonContainer}>
            <TouchableOpacity
              style={styles.invoiceButton}
              activeOpacity={0.85}
              onPress={() => {
                navigation.navigate('Invoice' as never, { id: campaign.id } as never);
              }}
            >
              <FileText size={18} color={colors.foreground.DEFAULT} />
              <Text style={styles.invoiceButtonText}>
                {t('viewInvoice')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Pause: after Invoice, before Boost Again. Only when canUserPause && !owner; hide completely when false. */}
        {(() => {
          const currentSpend = Number(campaign?.spend ?? 0);
          const campaignStatus = String(campaign?.status ?? '').toLowerCase();
          const hasAdGroup = !!String((campaign as any)?.tiktok_adgroup_id ?? '').trim();
          const dailyBudget = Number(campaign.daily_budget) || 0;
          const spentPercentage = displayBudget > 0 ? ((campaign.spend || 0) / displayBudget) * 100 : 0;
          const isExtensionProcessing = campaign.extension_status === 'processing';
          const isVerifyingPayment = campaign.extension_status === 'verifying_payment';
          const noPendingExtension = !isExtensionProcessing && !isVerifyingPayment && !campaign.extension_status;

          const canUserPause =
            pauseProfile?.can_pause_ads === true &&
            campaignStatus === 'active' &&
            hasAdGroup &&
            currentSpend >= 5.0 &&
            !(campaign as any)?.pause_locked &&
            !(campaign as any)?.is_paused_by_user &&
            !hasAdminAccess;
          const showPauseButton = canUserPause && !hasAdminAccess;

          if (__DEV__) {
            console.log('[CampaignDetail] Pause canUserPause inputs', {
              can_pause_ads: pauseProfile?.can_pause_ads,
              campaignStatus,
              hasAdGroup,
              currentSpend,
              pause_locked: (campaign as any)?.pause_locked,
              is_paused_by_user: (campaign as any)?.is_paused_by_user,
              isOwner: hasAdminAccess,
              showPauseButton,
              canUserPause,
            });
          }

          const canExtend =
            canExtendAds &&
            hasAdGroup &&
            campaignStatus === 'active' &&
            spentPercentage >= 75 &&
            dailyBudget >= 20 &&
            noPendingExtension;

          return (
          <>
          {showPauseButton && (
            <View style={styles.pauseButtonContainer}>
              <TouchableOpacity
                style={styles.pauseButton}
                activeOpacity={0.8}
                onPress={showPauseConfirmation}
                disabled={isPausing}
              >
                <Text style={styles.pauseButtonText}>{t('pauseAd') || 'Pause Ad'}</Text>
              </TouchableOpacity>
            </View>
          )}
          {!isPaymentsHidden && (isExtensionProcessing ? (
            <View style={styles.extendButtonContainer}>
              <View style={[styles.extendButton, { opacity: 0.8 }]}>
                <ActivityIndicator size="small" color={colors.primary.foreground} />
                <Text style={styles.extendButtonText}>
                  {language === 'ar' ? 'جاري المعالجة...' : 'لە پرۆسەکردندایە...'}
                </Text>
              </View>
            </View>
          ) : canExtend ? (
            <View style={styles.extendButtonContainer}>
              <TouchableOpacity
                style={styles.extendButton}
                activeOpacity={0.8}
                onPress={() => setShowExtendModal(true)}
              >
                <Plus size={20} color={colors.primary.foreground} />
                <Text style={styles.extendButtonText}>
                  {t('extendAd') || 'Extend'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null)}
          </>
          );
        })()}

        {/* Pause success - support card */}
        {showPauseSuccessCard && (
          <View style={styles.pauseSuccessCard}>
            <Text style={styles.pauseSuccessCardText}>
              {t('pauseSuccessMsg') || 'For refunds or to request reactivation, contact support:'}
            </Text>
            <TouchableOpacity
              onPress={() => Linking.openURL('https://wa.me/9647504881516')}
              style={styles.pauseSuccessCardButton}
              activeOpacity={0.8}
            >
              <Text style={styles.pauseSuccessCardButtonText}>
                {t('contactWhatsApp') || 'Contact via WhatsApp'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Boost Again Button - Only show for completed-like campaigns */}
        {!isPaymentsHidden && ['completed', 'paused'].includes((campaign.status || '').toLowerCase()) && (
          <View style={styles.boostAgainContainer}>
            <Text style={styles.hintText}>
              {t('repeatSameSponsor') || 'Repeat the same sponsor.'}
            </Text>
            <TouchableOpacity
              style={styles.boostButton}
              activeOpacity={0.8}
              onPress={() => {
                // Navigate to CreateAd with pre-filled data (ALL settings including video code)
                navigation.navigate('Main', { 
                  screen: 'CreateAd',
                  params: {
                    prefill: {
                      objective: campaign.objective,
                      daily_budget: campaign.daily_budget,
                      duration_days: campaign.duration_days,
                      target_audience: campaign.target_audience || 'all',
                      target_age_min: campaign.target_age_min || 13,
                      target_age_max: campaign.target_age_max || 65,
                      target_gender: campaign.target_gender || 'all',
                      call_to_action: campaign.call_to_action || 'CONTACT_US',
                      destination_url: (campaign as any).destination_url || null,
                      video_url: (campaign as any).video_url || '', // ✅ Autofill video code too
                    }
                  }
                });
              }}
            >
              <Rocket size={20} color={colors.primary.foreground} />
              <Text style={styles.boostButtonText}>
                {t('boostAgain') || 'Boost Again'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Extension Prompt - Show when eligible, auto-hide after 1 hour */}
        {(() => {
          const status = (campaign.status || '').toLowerCase();
          const dailyBudget = Number(campaign.daily_budget) || 0;
          const spentPercentage = displayBudget > 0 ? ((campaign.spend || 0) / displayBudget) * 100 : 0;
          const noPendingExtension = campaign.extension_status !== 'processing' && campaign.extension_status !== 'verifying_payment' && !campaign.extension_status;
          const hasTiktokAdGroup = !!(campaign as any).tiktok_adgroup_id;
          const canExtend =
            canExtendAds &&
            hasTiktokAdGroup &&
            status === 'active' &&
            spentPercentage >= 75 &&
            dailyBudget >= 20 &&
            noPendingExtension;
          
          return !isPaymentsHidden && canExtend && extendPromptVisible ? (
            <View style={styles.extensionPrompt}>
              <View style={styles.extensionPromptHeader}>
                <Sparkles size={20} color={colors.primary.DEFAULT} />
                <Text style={styles.extensionPromptTitle}>
                  {t('adPerformingWell') || 'Your ad is performing well! 🎉'}
                </Text>
                <TouchableOpacity
                  onPress={handleMaybeLaterOrCloseExtend}
                  style={styles.extensionPromptClose}
                >
                  <X size={18} color={colors.foreground.muted} />
                </TouchableOpacity>
              </View>
              <Text style={styles.extensionPromptMessage}>
                {t('spentPercentageMessage')?.replace('{percentage}', Math.round(spentPercentage).toString()) || 
                  `You've spent ${Math.round(spentPercentage)}% of your budget. Want to keep the momentum going?`}
              </Text>
              <View style={styles.extensionPromptButtons}>
                <TouchableOpacity
                  style={styles.extendNowButton}
                  onPress={() => setShowExtendModal(true)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.extendNowButtonText}>
                    {t('extendNow') || 'Extend Now'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.maybeLaterButton}
                  onPress={handleMaybeLaterOrCloseExtend}
                  activeOpacity={0.8}
                >
                  <Text style={styles.maybeLaterButtonText}>
                    {t('maybeLater') || 'Maybe Later'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null;
        })()}

        </>
        )}

        {/* Removed duplicate Campaign Details section - details are in collapsible section above */}

        {/* Transactions Section */}
        {!isPaymentsHidden && transactions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('transactions')}</Text>
            {transactions.map((transaction) => (
              <View key={transaction.id} style={styles.transactionRow}>
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionDescription}>{transaction.description}</Text>
                  <Text style={styles.transactionDate}>
                    {formatDateNumericDMY(new Date(transaction.created_at))}
                  </Text>
                </View>
                <Text style={[styles.transactionAmount, transaction.amount >= 0 ? styles.transactionAmountPositive : styles.transactionAmountNegative]}>
                  {transaction.amount >= 0 ? '+' : ''}${transaction.amount.toFixed(transaction.amount % 1 === 0 ? 0 : 2)}
                </Text>
              </View>
            ))}
          </View>
        )}
        </View>
      </ScrollView>

      {/* Extend Ad Modal - mount only when needed to avoid BottomSheet layout crashes on screen load */}
      {!isPaymentsHidden && campaign && showExtendModal && (
        <ExtendAdModal
          open={showExtendModal}
          onOpenChange={setShowExtendModal}
          campaignId={campaign.id}
          campaignTitle={campaign.title}
          dailyBudget={Number(campaign.daily_budget) || 20}
          totalBudget={getDisplayBudget(campaign)}
          durationDays={campaign.duration_days}
          realEndDate={campaign.real_end_date ?? undefined}
          extensionStatus={campaign.extension_status ?? null}
          onSuccess={() => {
            setShowExtendModal(false);
            fetchCampaign(true);
          }}
        />
      )}
    </View>
  );
}

// Create styles function that accepts fontFamily and isRTL (use RN.StyleSheet so it exists at runtime)
const createStyles = (colors: any, fontFamily: string, isRTL?: boolean) => RN.StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.DEFAULT,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.DEFAULT,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background.DEFAULT,
  },
  errorText: {
    fontSize: 18,
    color: colors.error,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingStart: spacing.md,
    paddingEnd: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.background.DEFAULT,
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
    color: colors.foreground.DEFAULT,
    fontWeight: '500',
    fontFamily,
  },
  backButtonText: {
    fontSize: 16,
    color: colors.foreground.DEFAULT,
    fontWeight: '500',
    fontFamily, // Use language-specific font
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.foreground.DEFAULT,
    fontFamily, // Use language-specific font
    flex: 1,
    marginHorizontal: spacing.sm,
    textAlign: 'center',
  },
  statusBadgeContainer: {
    minWidth: 100,
    alignItems: 'flex-end',
  },
  statusBadgeRTL: {
    alignItems: 'flex-start',
  },
  lastUpdatedContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: 2,
    paddingBottom: 4,
    alignItems: 'center',
  },
  lastUpdatedText: {
    fontSize: 11,
    color: colors.foreground.muted,
    fontWeight: '500',
    fontFamily, // Use language-specific font
  },
  extensionStatusBanner: {
    borderRadius: borderRadius.DEFAULT,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  extensionStatusBannerWarning: {
    backgroundColor: '#FEF3C7',
  },
  extensionStatusBannerInfo: {
    backgroundColor: '#DBEAFE',
  },
  extensionStatusBannerTextWarning: {
    fontSize: 13,
    color: '#92400E',
    fontWeight: '600',
    fontFamily,
  },
  extensionStatusBannerTextInfo: {
    fontSize: 13,
    color: '#1E40AF',
    fontWeight: '600',
    fontFamily,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    backgroundColor: colors.background.DEFAULT,
  },
  progressStep: {
    alignItems: 'center',
    gap: 8,
    minWidth: 60,
  },
  progressIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressIconActive: {
    backgroundColor: colors.background.secondary,
  },
  progressLabel: {
    fontSize: 12,
    color: '#CBD5E1',
    fontWeight: '500',
    fontFamily, // Use language-specific font
  },
  progressLabelActive: {
    color: '#7C3AED',
    fontWeight: '600',
    fontFamily, // Use language-specific font
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: colors.border.DEFAULT,
    marginHorizontal: spacing.sm,
    maxWidth: 40,
  },
  metricsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.md,
    gap: spacing.md,
  },
  metricsContainer2x2: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  cardWrapper: {
    flex: 1,
    minWidth: 0,
  },
  metricsContainerVertical: {
    padding: spacing.md,
    gap: spacing.md,
  },
  fullWidthCard: {
    width: '100%',
  },
  highlightedSpentCard: {
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: borderRadius.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary.dark,
    shadowColor: colors.primary.DEFAULT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    minHeight: 120,
    justifyContent: 'flex-start',
  },
  spentIconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  spentLabel: {
    fontSize: 14,
    color: colors.primary.foreground,
    fontWeight: '500',
    marginTop: 4,
    marginBottom: 4,
    fontFamily, // Use language-specific font
  },
  spentValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary.foreground,
    marginBottom: 4,
    fontFamily, // Use language-specific font (numbers use Poppins-Bold)
  },
  cpmCard: {
    backgroundColor: colors.card.background,
    borderRadius: borderRadius.card,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cpmLeft: {
    flex: 1,
  },
  cpmLabel: {
    fontSize: 14,
    color: colors.foreground.muted,
    fontWeight: '500',
    marginBottom: 4,
    fontFamily, // Use language-specific font
  },
  cpmValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.foreground.DEFAULT,
    fontFamily, // Use language-specific font (numbers use Poppins-Bold)
  },
  invoiceButtonContainer: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  invoiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.card,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.background.secondary,
    minHeight: 48,
  },
  invoiceButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.foreground.DEFAULT,
    fontFamily, // Use language-specific font
  },
  section: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.card.background,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.card,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  paymentOnlyContainer: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  paymentOnlyCard: {
    backgroundColor: colors.status.awaiting_payment.bg,
    borderRadius: borderRadius.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.status.awaiting_payment.text,
  },
  paymentOnlyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.status.awaiting_payment.text,
    marginBottom: spacing.xs,
    fontFamily,
  },
  paymentOnlySubtitle: {
    fontSize: 14,
    color: colors.status.awaiting_payment.text,
    fontWeight: '500',
    fontFamily,
  },
  payWithBalanceCard: {
    backgroundColor: colors.card.background,
    borderRadius: borderRadius.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    marginBottom: spacing.sm,
  },
  payWithBalanceTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.foreground.DEFAULT,
    marginBottom: 4,
    fontFamily,
  },
  payWithBalanceAvailable: {
    fontSize: 14,
    color: colors.foreground.muted,
    marginBottom: spacing.sm,
    fontFamily,
  },
  payWithBalanceButton: {
    borderRadius: 999,
    overflow: 'hidden',
  },
  payWithBalanceButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payWithBalanceButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
    fontFamily: 'Rabar_021',
  },
  payWithBalanceButtonDisabled: {
    backgroundColor: colors.border.DEFAULT,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 999,
  },
  payWithBalanceButtonTextDisabled: {
    color: colors.foreground.muted,
    fontWeight: '600',
    fontSize: 15,
    fontFamily: 'Rabar_021',
  },
  addFundsLink: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  addFundsLinkText: {
    fontSize: 14,
    color: colors.primary.DEFAULT,
    fontWeight: '600',
    fontFamily,
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.sm,
    gap: spacing.sm,
  },
  orDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border.DEFAULT,
  },
  orDividerText: {
    fontSize: 12,
    color: colors.foreground.muted,
    fontFamily,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.foreground.DEFAULT,
    marginBottom: spacing.md,
    fontFamily, // Use language-specific font
    textAlign: 'center',
  },
  detailsList: {
    gap: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.foreground.muted,
    fontWeight: '500',
    textAlign: isRTL ? 'right' : 'left',
    writingDirection: isRTL ? 'rtl' : 'ltr',
  },
  detailValue: {
    fontSize: 14,
    color: colors.foreground.DEFAULT,
    fontWeight: '600',
  },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 14,
    color: colors.foreground.DEFAULT,
    fontWeight: '500',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: colors.foreground.muted,
  },
  transactionAmount: {
    fontSize: 16,
    color: colors.success,
    fontWeight: '600',
  },
  transactionAmountPositive: {
    fontSize: 16,
    color: colors.success,
    fontWeight: '600',
  },
  transactionAmountNegative: {
    fontSize: 16,
    color: colors.error,
    fontWeight: '600',
  },
  button: {
    backgroundColor: colors.primary.DEFAULT,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.button,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: colors.primary.foreground,
    fontSize: 17,
    fontWeight: '600',
  },
  extensionPrompt: {
    margin: spacing.md,
    padding: spacing.md,
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.5)',
    borderRadius: borderRadius.card,
  },
  extensionPromptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  extensionPromptTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary.DEFAULT,
  },
  extensionPromptClose: {
    padding: spacing.xs,
  },
  extensionPromptMessage: {
    fontSize: 14,
    color: colors.foreground.muted,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  extensionPromptButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  extendNowButton: {
    flex: 1,
    backgroundColor: colors.primary.DEFAULT,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  extendNowButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary.foreground,
  },
  maybeLaterButton: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.button,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  maybeLaterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary.DEFAULT,
  },
  // New Redesign Styles
  mainCard: {
    backgroundColor: colors.card.background,
    borderRadius: 20,
    padding: 16,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  thumbnailContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#27272A',
    marginEnd: 12,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: 12,
  },
  thumbnailPlaceholderText: {
    marginTop: 4,
    fontSize: 9,
    color: colors.primary.DEFAULT,
    textAlign: 'center',
  },
  playOverlay: {
    ...RN.StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.overlay.medium,
  },
  cardHeaderText: {
    flex: 1,
  },
  videoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm,
    backgroundColor: '#F3E8FF',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    marginBottom: spacing.md,
    alignSelf: 'flex-start',
  },
  videoButtonText: {
    fontSize: 12,
    color: '#7C3AED',
    fontWeight: '600',
  },
  rejectionReasonCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.24)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  rejectionReasonLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 6,
    fontFamily,
    textAlign: isRTL ? 'right' : 'left',
    writingDirection: isRTL ? 'rtl' : 'ltr',
  },
  rejectionReasonText: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.foreground.DEFAULT,
    fontFamily,
    textAlign: isRTL ? 'right' : 'left',
    writingDirection: isRTL ? 'rtl' : 'ltr',
  },
  campaignName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.foreground.DEFAULT,
    fontFamily, // Use language-specific font (Rabar_021 for Kurdish/Arabic, Poppins for English)
    marginBottom: 4,
  },
  objectiveType: {
    fontSize: 14,
    color: colors.foreground.muted,
    fontFamily, // Use language-specific font
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.foreground.DEFAULT,
    fontFamily: 'Poppins-Bold', // Numbers always use Poppins
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: colors.foreground.muted,
    fontFamily, // Use language-specific font
  },
  costCard: {
    backgroundColor: colors.background.tertiary,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  costIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(124, 58, 237, 0.1)', // Lighter purple background
    alignItems: 'center',
    justifyContent: 'center',
  },
  costTextContainer: {
    flex: 1,
    marginStart: 12,
  },
  costLabel: {
    fontSize: 14,
    color: colors.foreground.muted,
    fontFamily, // Use language-specific font
    marginBottom: 4,
  },
  costValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary.DEFAULT,
    fontFamily: 'Poppins-Bold', // Numbers always use Poppins
  },
  summaryTextContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  summaryText: {
    fontSize: 14,
    color: colors.foreground.muted,
    fontFamily, // Use language-specific font
    marginBottom: 4,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: colors.background.secondary,
    borderColor: colors.border.DEFAULT,
  },
  toggleButtonExpanded: {
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
    borderColor: colors.primary.DEFAULT,
    borderWidth: 2,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  toggleIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: 12,
  },
  toggleIconExpanded: {
    backgroundColor: colors.primary.DEFAULT,
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.foreground.DEFAULT,
    fontFamily, // Use language-specific font
  },
  toggleTextExpanded: {
    color: colors.primary.DEFAULT,
  },
  detailsContainer: {
    marginTop: 16,
  },
  detailCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: 16,
    marginBottom: 12,
  },
  detailCardHighlighted: {
    borderColor: 'rgba(124, 58, 237, 0.3)',
    backgroundColor: 'rgba(124, 58, 237, 0.05)', // Very light purple highlight
  },
  detailIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: 12,
  },
  detailIconHighlighted: {
    backgroundColor: 'rgba(124, 58, 237, 0.1)', // Light purple
  },
  detailContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: colors.foreground.muted,
    fontFamily, // Use language-specific font
    textAlign: isRTL ? 'right' : 'left',
    writingDirection: isRTL ? 'rtl' : 'ltr',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.foreground.DEFAULT,
    fontFamily, // Use language-specific font
    textAlign: isRTL ? 'right' : 'left',
  },
  boostAgainContainer: {
    marginTop: 24,
    marginBottom: 32,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.background.secondary,
    marginHorizontal: spacing.md,
  },
  hintText: {
    fontSize: 14,
    color: colors.foreground.muted,
    fontFamily, // Use language-specific font
    textAlign: 'center',
    marginBottom: 12,
  },
  boostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary.DEFAULT,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: colors.primary.DEFAULT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  boostButtonText: {
    color: colors.primary.foreground,
    fontSize: 16,
    fontWeight: '600',
    fontFamily, // Use language-specific font
  },
  extendButtonContainer: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
    marginHorizontal: spacing.md,
  },
  pauseButtonContainer: {
    marginTop: spacing.md,
    marginHorizontal: spacing.md,
  },
  pauseButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  pauseButtonText: {
    color: '#B91C1C',
    fontSize: 15,
    fontWeight: '600',
    fontFamily,
  },
  pauseSuccessCard: {
    marginTop: spacing.md,
    marginHorizontal: spacing.md,
    padding: spacing.md,
    backgroundColor: '#F0FDF4',
    borderRadius: borderRadius.card,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    gap: spacing.sm,
  },
  pauseSuccessCardText: {
    fontSize: 14,
    color: '#166534',
    fontFamily,
  },
  pauseSuccessCardButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#22C55E',
    borderRadius: 8,
  },
  pauseSuccessCardButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily,
  },
  extendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary.DEFAULT,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: colors.primary.DEFAULT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  extendButtonText: {
    color: colors.primary.foreground,
    fontSize: 16,
    fontWeight: '600',
    fontFamily, // Use language-specific font
  },
});


