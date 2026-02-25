import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, InteractionManager, Linking, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase, safeQuery } from '@/integrations/supabase/client';
import { getFontFamily } from '@/theme/typography';
import { CampaignStatusBadge } from '@/components/common/CampaignStatusBadge';
import { StatCard } from '@/components/common/StatCard';
import { TransactionIdInput } from '@/components/common/TransactionIdInput';
import { ExtendAdModal } from '@/components/common/ExtendAdModal';
import { Eye, DollarSign, Clock, CreditCard, Play, MousePointer, Target, FileText, Check, Sparkles, X, ChevronDown, ChevronUp, Users, Calendar, Rocket, Plus, Megaphone } from 'lucide-react-native';
import { Image } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, borderRadius } from '@/theme/spacing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text } from '@/components/common/Text';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { toast } from '@/utils/toast';
import { getCached, getGlobalCache, setCached } from '@/services/globalCache';

interface CampaignData {
  id: string;
  title: string;
  objective: string;
  status: string;
  daily_budget: number;
  total_budget: number;
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
  video_url?: string | null;
  api_error?: string | null;
  extension_status?: 'awaiting_payment' | 'verifying_payment' | null;
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
  const fontFamily = getFontFamily(language as 'ckb' | 'ar');
  
  // Create styles with current font family (must be before any usage)
  const styles = createStyles(colors, fontFamily, isRTL);
  
  const { id } = route.params as { id: string };
  const cachedCampaign = getCached<CampaignData | null>(`campaign_${id}`, null);
  const cachedCampaigns = getCached<CampaignData[]>('campaigns', []);
  const cachedFromList =
    cachedCampaigns.find((item) => item?.id === id) ||
    getGlobalCache().campaignsById.get(id) ||
    null;
  const cachedTransactions = getCached<Transaction[]>(`campaign_transactions_${id}`, []);

  const [campaign, setCampaign] = useState<CampaignData | null>(cachedCampaign || cachedFromList);
  const [transactions, setTransactions] = useState<Transaction[]>(cachedTransactions);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [extendPromptVisible, setExtendPromptVisible] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const extendPromptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const EXTEND_PROMPT_KEY = (cid: string) => `extend_prompt_shown_${cid}`;
  const EXTEND_PROMPT_MS = 30 * 60 * 1000;
  const [thumbnailError, setThumbnailError] = useState(false);
  const [canPauseAds, setCanPauseAds] = useState(false);
  const [showPauseSuccessCard, setShowPauseSuccessCard] = useState(false);
  const [pauseLimitInfo, setPauseLimitInfo] = useState<{ daily_limit: number; remaining: number } | null>(null);
  const lastFetchRef = useRef(0);
  const MIN_FETCH_INTERVAL = 2000;
  const hasVideoLink =
    (typeof campaign?.tiktok_public_url === 'string' && campaign?.tiktok_public_url.includes('/@')) ||
    !!campaign?.video_url;

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
          <View style={styles.playOverlay}>
            <Play color={colors.primary.foreground} fill={colors.primary.foreground} size={24} />
          </View>
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
      const { data, error } = await supabase.functions.invoke('tiktok-video-info', {
        body: {
          authCode: campaign.video_url,
          campaignId: campaign.id,
        },
      });
      if (error) {
        if (__DEV__) {
          console.warn('[CampaignDetail] Legacy video fetch failed:', error.message);
        }
        return null;
      }
      return data?.videoInfo?.tiktokUrl || data?.tiktokUrl || null;
    } catch (err) {
      if (__DEV__) {
        console.warn('[CampaignDetail] Legacy video fetch error:', err);
      }
      return null;
    }
  }, [campaign?.id, campaign?.video_url]);

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
      Alert.alert(t('error') || 'Error', t('noVideoUrl') || 'No video URL available');
      return;
    }
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert(t('error') || 'Error', t('cannotOpenUrl') || 'Cannot open this URL');
    }
  }, [campaign, resolveLegacyVideoUrl, t]);

  const fetchCampaign = useCallback(async () => {
    if (!user || !id) return;

    const now = Date.now();
    if (now - lastFetchRef.current < MIN_FETCH_INTERVAL) {
      return;
    }
    lastFetchRef.current = now;

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
            .select('can_pause_ads, daily_pause_limit')
            .eq('user_id', user.id)
            .maybeSingle()
        ),
      ]);

      if (campaignResult.status === 'fulfilled') {
        const { data, error } = campaignResult.value;
        if (error) {
          console.error('Error fetching campaign:', error);
        } else if (data) {
          setCampaign((prev) => {
            if (!prev) return data;
            return {
              ...data,
              views: Math.max(prev.views || 0, data.views || 0),
              spend: Math.max(prev.spend || 0, data.spend || 0),
              leads: Math.max(prev.leads || 0, data.leads || 0),
              clicks: Math.max(prev.clicks || 0, data.clicks || 0),
            };
          });
          setCached(`campaign_${id}`, data);
          getGlobalCache().campaignsById.set(id, data);
          await AsyncStorage.setItem(
            `campaign_cache_${id}`,
            JSON.stringify({ data, timestamp: Date.now() })
          );
        }
      }

      if (transactionResult.status === 'fulfilled' && transactionResult.value.data) {
        setTransactions(transactionResult.value.data);
        setCached(`campaign_transactions_${id}`, transactionResult.value.data);
      }

      if (profileResult.status === 'fulfilled') {
        const profile = profileResult.value.data as { can_pause_ads?: boolean; daily_pause_limit?: number } | null;
        setCanPauseAds(Boolean(profile?.can_pause_ads));
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
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  }, [user, id]);

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
      fetchCampaign();
    });

    const interval = setInterval(() => {
      InteractionManager.runAfterInteractions(() => {
        fetchCampaign();
      });
    }, 15000);

    let campaignChannel: any;
    let transactionChannel: any;
    let profileChannel: any;

    if (user?.id && supabase) {
      profileChannel = supabase
        .channel(`user-profile-${user.id}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `user_id=eq.${user.id}` },
          (payload) => setCanPauseAds(Boolean((payload.new as any)?.can_pause_ads))
        )
        .subscribe();

      campaignChannel = supabase
        .channel(`campaign-${id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'campaigns',
            filter: `id=eq.${id}`,
          },
          () => {
            fetchCampaign();
          }
        )
        .subscribe();

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
            fetchCampaign();
          }
        )
        .subscribe();
    }

    return () => {
      isMounted = false;
      clearInterval(interval);
      if (supabase) {
        if (campaignChannel) supabase.removeChannel(campaignChannel);
        if (transactionChannel) supabase.removeChannel(transactionChannel);
        if (profileChannel) supabase.removeChannel(profileChannel);
      }
    };
  }, [user, id, fetchCampaign]);

  // Extend prompt: 30-minute auto-hide via AsyncStorage (persists across restarts)
  useEffect(() => {
    if (!campaign?.id) return;
    const status = (campaign.status || '').toLowerCase();
    const spentPercentage = campaign.total_budget > 0
      ? ((campaign.spend || 0) / campaign.total_budget) * 100
      : 0;
    const canExtend =
      (status === 'active' || status === 'running' || status === 'completed' || status === 'paused') &&
      campaign.daily_budget >= 20 &&
      !campaign.extension_status &&
      spentPercentage >= 75;
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
  }, [campaign?.id, campaign?.status, campaign?.total_budget, campaign?.spend, campaign?.daily_budget, campaign?.extension_status]);

  const handleMaybeLaterOrCloseExtend = useCallback(async () => {
    if (!campaign?.id) return;
    await AsyncStorage.setItem(EXTEND_PROMPT_KEY(campaign.id), String(Date.now() - EXTEND_PROMPT_MS));
    setExtendPromptVisible(false);
  }, [campaign?.id]);

  const handlePauseAd = async () => {
    if (!campaign) return;
    const status = (campaign.status || '').toLowerCase();
    const spend = campaign.spend ?? 0;
    const pauseLocked = !!(campaign as any).pause_locked;
    const isPausedByUser = !!(campaign as any).is_paused_by_user;

    if (!canPauseAds) {
      Alert.alert(t('noPermission') || 'No Permission', t('noPermissionPause') || 'You do not have permission to pause ads.');
      return;
    }
    if (spend < 5) {
      Alert.alert(t('cannotPause') || 'Cannot Pause', (t('pauseMinSpend') || 'Ad must spend at least $5 before pausing. Current: $') + spend.toFixed(2));
      return;
    }
    if (pauseLocked || isPausedByUser) {
      Alert.alert(t('alreadyPaused') || 'Already Paused', t('adAlreadyPaused') || 'This ad has already been paused.');
      return;
    }
    if (status !== 'active' && status !== 'running') {
      Alert.alert(t('cannotPause') || 'Cannot Pause', t('onlyActiveCanPause') || 'Only active ads can be paused.');
      return;
    }

    const remaining = pauseLimitInfo?.remaining ?? 1;
    const limit = pauseLimitInfo?.daily_limit ?? 1;
    const confirmMsg = remaining <= 0
      ? (t('dailyLimitPauses') || "You've used all pauses today.")
      : (t('pauseConfirmRemaining', { remaining: String(remaining), limit: String(limit) }) || `You have ${remaining}/${limit} pauses remaining today. Pause this ad?`);
    Alert.alert(
      t('pauseAd') || 'Pause Ad',
      confirmMsg,
      [
        { text: t('cancel') || 'Cancel', style: 'cancel' },
        {
          text: t('pauseAd') || 'Pause',
          onPress: async () => {
            try {
              const { data, error } = await supabase.functions.invoke('user-pause-ad', {
                body: { campaign_id: campaign.id },
              });
              if (error) {
                Alert.alert(t('error') || 'Error', error.message);
                return;
              }
              if (data?.success) {
                setShowPauseSuccessCard(true);
                toast.info(t('adPaused') || 'Ad Paused', t('adPausedMessage') || 'Your ad has been paused successfully.');
                fetchCampaign();
                return;
              }
              switch (data?.error) {
                case 'NO_PERMISSION':
                  Alert.alert(t('noPermission') || 'No Permission', t('noPermissionPause') || 'You do not have permission to pause ads.');
                  break;
                case 'INSUFFICIENT_SPEND':
                  Alert.alert(t('cannotPause') || 'Cannot Pause', (t('pauseMinSpend') || 'Ad must spend at least $5 before pausing. Current: $') + spend.toFixed(2));
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
              fetchCampaign();
            } catch (err: any) {
              fetchCampaign();
              toast.error(t('failedToPause') || 'Failed to pause ad', err?.message || 'Please try again');
            }
          },
        },
      ]
    );
  };

  if (!campaign) {
    if (loading) {
      return (
        <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
          <Text style={[styles.errorText, isRTL && styles.textRTL]}>{t('loading') || 'Loading...'}</Text>
        </View>
      );
    }
    return (
      <View style={[styles.errorContainer, { paddingTop: insets.top }]}>
        <Text style={[styles.errorText, isRTL && styles.textRTL]}>{t('campaignNotFound')}</Text>
        <TouchableOpacity
          style={[styles.button, isRTL && styles.rowReverse]}
          onPress={() => navigation.goBack()}
        >
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

  // Format dates
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Show progress tracker for campaigns in workflow (not active/completed/rejected)
  const showProgressTracker = !['active', 'completed', 'paused', 'rejected', 'failed'].includes(campaign.status);
  
  // Progress tracker logic - matches workflow steps
  // Step 0 (Review) → waiting_for_admin
  // Step 1 (Payment) → awaiting_payment, verifying_payment
  // Step 2 (Launch) → pending
  // Step 3 (Complete) → active, completed
  const getProgressStep = () => {
    if (campaign.status === 'waiting_for_admin') return 0; // Review step
    if (campaign.status === 'awaiting_payment' || campaign.status === 'verifying_payment') return 1; // Payment step
    if (campaign.status === 'pending') return 2; // Launch step
    if (campaign.status === 'active' || campaign.status === 'completed') return 3; // Complete
    return 0;
  };

  const progressStep = getProgressStep();
  const ageRange = campaign.target_age_min && campaign.target_age_max
    ? `${campaign.target_age_min}-${campaign.target_age_max}`
    : '18-65';
  const gender = campaign.target_gender === 'all' ? 'All' : campaign.target_gender || 'All';

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatShortNumber = (value: number): string => {
    return formatNumber(value);
  };

  // Format date for display (DD-MM-YYYY)
  const formatDateShort = (date: Date) => {
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Get objective display name
  const getObjectiveDisplayName = () => {
    if (isViewsObjective) return 'Video Views';
    if (isConversionsObjective) return 'Contacts & Messages';
    return campaign.objective;
  };

  // Get audience display name
  const getAudienceDisplayName = () => {
    const audience = campaign.target_audience;
    if (audience === 'arab') return t('arab');
    if (audience === 'kurdish') return t('kurdish');
    return t('all');
  };

  // Get budget (use real_budget if available, otherwise total_budget)
  const displayBudget = campaign.real_budget || campaign.total_budget;

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
      >
        <View style={{ paddingHorizontal: 16, width: '100%' }}>
        {/* Last Updated - Red, Centered */}
        {lastUpdated && (
          <View style={styles.lastUpdatedContainer}>
            <Text style={styles.lastUpdatedText}>
              {t('lastUpdated') || 'Last updated'}: {lastUpdated.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                second: '2-digit',
                hour12: true,
              })}
            </Text>
          </View>
        )}

        {isAwaitingPayment ? (
          <View style={styles.paymentOnlyContainer}>
            <View style={[styles.paymentOnlyCard, isRTL && styles.paymentOnlyCardRTL]}>
              <Text style={[styles.paymentOnlyTitle, isRTL && styles.textRTL]}>{t('awaitingPayment')}</Text>
              <Text style={[styles.paymentOnlySubtitle, isRTL && styles.textRTL]}>
                {t('paymentRequired')} — {t('howToPay')}
              </Text>
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
                Review
              </Text>
            </View>
            <View style={styles.progressLine} />
            <View style={styles.progressStep}>
              <View style={[styles.progressIcon, progressStep >= 1 && styles.progressIconActive]}>
                <CreditCard size={20} color={progressStep >= 1 ? '#7C3AED' : '#CBD5E1'} />
              </View>
              <Text style={[styles.progressLabel, progressStep >= 1 && styles.progressLabelActive]}>
                Payment
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
          {hasVideoLink && (
            <TouchableOpacity
              style={styles.videoButton}
              onPress={handleViewVideo}
              activeOpacity={0.7}
            >
              <Play size={16} color="#7C3AED" />
              <Text style={styles.videoButtonText}>{t('viewVideo') || 'View Video'}</Text>
            </TouchableOpacity>
          )}

          {/* 3 Metric Cards Row */}
          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>${(campaign.spend || 0).toFixed(2)}</Text>
              <Text style={styles.metricLabel}>{t('spent') || 'Spent'}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>
                {isViewsObjective 
                  ? `$${cpm.toFixed(2)}`
                  : formatShortNumber(campaign.leads || 0)
                }
              </Text>
              <Text style={styles.metricLabel}>
                {isViewsObjective 
                  ? t('costPer1kImpressions') || 'CPM'
                  : t('conversions') || 'Conversions'
                }
              </Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{formatShortNumber(campaign.views || 0)}</Text>
              <Text style={styles.metricLabel}>{t('totalViews') || 'Views'}</Text>
            </View>
          </View>

          {/* Cost Highlight Card */}
          <View style={styles.costCard}>
            <View style={styles.costIconContainer}>
              <DollarSign size={20} color={colors.primary.DEFAULT} />
            </View>
            <View style={styles.costTextContainer}>
              <Text style={styles.costLabel}>
                {isViewsObjective 
                  ? t('costPer1kImpressions') || 'Cost / 1K Views'
                  : t('costPerConversion') || 'Cost / Conversion'
                }
              </Text>
              <Text style={styles.costValue}>
                ${isViewsObjective ? cpm.toFixed(2) : costPerConversion.toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Summary Text */}
          <View style={styles.summaryTextContainer}>
            <Text style={styles.summaryText}>
              ${displayBudget.toFixed(2)} {t('totalBudget') || 'Total Budget'} • {campaign.duration_days} {campaign.duration_days === 1 ? t('day') || 'day' : t('days') || 'days'}
            </Text>
            <Text style={styles.summaryText}>
              📅 {t('created') || 'Created'}: {formatDateShort(new Date(campaign.created_at))}
            </Text>
          </View>

          {/* Toggle Button for Details */}
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
                {t('viewDetailsAndGoals') || 'View Details & Goals'}
              </Text>
            </View>
            {detailsExpanded ? (
              <ChevronUp size={20} color={colors.primary.DEFAULT} />
            ) : (
              <ChevronDown size={20} color={colors.foreground.muted} />
            )}
          </TouchableOpacity>

          {/* Expanded Details */}
          {detailsExpanded && (
            <View style={styles.detailsContainer}>
              {/* Objective Card (Highlighted) */}
              <View style={[styles.detailCard, styles.detailCardHighlighted]}>
                <View style={[styles.detailIconContainer, styles.detailIconHighlighted]}>
                  <Target size={20} color={colors.primary.DEFAULT} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>{t('objective') || 'Objective'}</Text>
                  <Text style={styles.detailValue}>{getObjectiveDisplayName()}</Text>
                </View>
              </View>

              {/* Target Audience Card */}
              <View style={styles.detailCard}>
                <View style={styles.detailIconContainer}>
                  <Users size={20} color={colors.foreground.muted} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>{t('targetAudience') || 'Target Audience'}</Text>
                  <Text style={styles.detailValue}>{getAudienceDisplayName()}</Text>
                </View>
              </View>

              {/* Budget Card */}
              <View style={styles.detailCard}>
                <View style={styles.detailIconContainer}>
                  <DollarSign size={20} color={colors.foreground.muted} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>{t('budget') || 'Budget'}</Text>
                  <Text style={styles.detailValue}>${displayBudget.toFixed(2)}</Text>
                </View>
              </View>

              {/* Age Range Card */}
              <View style={styles.detailCard}>
                <View style={styles.detailIconContainer}>
                  <Users size={20} color={colors.foreground.muted} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>{t('ageRange') || 'Age Range'}</Text>
                  <Text style={styles.detailValue}>{ageRange}</Text>
                </View>
              </View>

              {/* Gender Card */}
              <View style={styles.detailCard}>
                <View style={styles.detailIconContainer}>
                  <Users size={20} color={colors.foreground.muted} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>{t('gender') || 'Gender'}</Text>
                  <Text style={styles.detailValue}>{gender}</Text>
                </View>
              </View>

              {/* Start Date Card */}
              <View style={styles.detailCard}>
                <View style={styles.detailIconContainer}>
                  <Calendar size={20} color={colors.foreground.muted} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>{t('startDate') || 'Start Date'}</Text>
                  <Text style={styles.detailValue}>{formatDateShort(startDate)}</Text>
                </View>
              </View>

              {/* End Date Card */}
              <View style={styles.detailCard}>
                <View style={styles.detailIconContainer}>
                  <Calendar size={20} color={colors.foreground.muted} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>{t('endDate') || 'End Date'}</Text>
                  <Text style={styles.detailValue}>{formatDateShort(endDate)}</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* View Invoice Button - Only show for completed campaigns */}
        {campaign.status === 'completed' && (
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
                {t('viewInvoice') || 'View Invoice'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Extend Button - Show when eligible: 75%+ of budget spent; Pause - after $5 spent */}
        {(() => {
          const status = (campaign.status || '').toLowerCase();
          const spentPercentage = campaign.total_budget > 0
            ? ((campaign.spend || 0) / campaign.total_budget) * 100
            : 0;
          const canExtend =
            (status === 'active' || status === 'running' || status === 'completed' || status === 'paused') &&
            campaign.daily_budget >= 20 &&
            !campaign.extension_status &&
            spentPercentage >= 75;

          const canPause =
            canPauseAds &&
            (status === 'active' || status === 'running') &&
            (campaign.spend || 0) >= 5 &&
            !(campaign as any).pause_locked &&
            !(campaign as any).is_paused_by_user;

          return (
          <>
          {canPause && (
            <View style={styles.pauseButtonContainer}>
              <TouchableOpacity
                style={styles.pauseButton}
                activeOpacity={0.8}
                onPress={handlePauseAd}
              >
                <Text style={styles.pauseButtonText}>{t('pauseAd') || 'Pause Ad'}</Text>
              </TouchableOpacity>
            </View>
          )}
          {canExtend ? (
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
          ) : null}
          </>
          );
        })()}

        {/* Pause success - support card */}
        {showPauseSuccessCard && (
          <View style={styles.pauseSuccessCard}>
            <Text style={styles.pauseSuccessCardText}>
              {t('forRefundsOrReactivation') || 'For refunds or to request reactivation, contact support:'}
            </Text>
            <TouchableOpacity
              onPress={() => Linking.openURL('https://wa.me/9647504881516')}
              style={styles.pauseSuccessCardButton}
              activeOpacity={0.8}
            >
              <Text style={styles.pauseSuccessCardButtonText}>
                {t('contactViaWhatsApp') || 'Contact via WhatsApp'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Boost Again Button - Only show for completed campaigns */}
        {campaign.status === 'completed' && (
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

        {/* Extension Prompt - Show when eligible (75%+ of budget spent), auto-hide after 30 min */}
        {(() => {
          const status = (campaign.status || '').toLowerCase();
          const spentPercentage = campaign.total_budget > 0
            ? ((campaign.spend || 0) / campaign.total_budget) * 100
            : 0;
          const canExtend =
            (status === 'active' || status === 'running' || status === 'completed' || status === 'paused') &&
            campaign.daily_budget >= 20 &&
            !campaign.extension_status &&
            spentPercentage >= 75;
          
          return canExtend && extendPromptVisible ? (
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
        {transactions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Transactions</Text>
            {transactions.map((transaction) => (
              <View key={transaction.id} style={styles.transactionRow}>
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionDescription}>{transaction.description}</Text>
                  <Text style={styles.transactionDate}>
                    {new Date(transaction.created_at).toLocaleDateString('en-US', {
                      month: 'numeric',
                      day: 'numeric',
                      year: 'numeric',
                    })}
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

      {/* Extend Ad Modal */}
      {campaign && (
        <ExtendAdModal
          open={showExtendModal}
          onOpenChange={setShowExtendModal}
          campaignId={campaign.id}
          campaignTitle={campaign.title}
          dailyBudget={campaign.daily_budget}
          onSuccess={() => {
            setShowExtendModal(false);
            fetchCampaign();
          }}
        />
      )}
    </View>
  );
}

// Create styles function that accepts fontFamily and isRTL
const createStyles = (colors: any, fontFamily: string, isRTL?: boolean) => StyleSheet.create({
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
  paymentOnlyCardRTL: {
    alignItems: 'flex-end',
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
    ...StyleSheet.absoluteFillObject,
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
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.foreground.DEFAULT,
    fontFamily, // Use language-specific font
    textAlign: 'right',
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


