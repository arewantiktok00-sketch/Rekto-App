import { Text } from '@/components/common/Text';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/integrations/supabase/client';
import { borderRadius, spacing } from '@/theme/spacing';
import { getMonotonicMetrics } from '@/utils/metricsCache';
import { isRTL } from '@/utils/rtl';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { AlertCircle, CheckCircle, Clock, DollarSign, Eye, FileText, Megaphone, MessageCircle, Play, Plus } from 'lucide-react-native';
import React, { memo, useEffect, useState } from 'react';
import { Alert, Image, Linking, StyleSheet, TouchableOpacity, View } from 'react-native';
import { CampaignStatusBadge } from './CampaignStatusBadge';

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
  video_url?: string | null;
  tiktok_public_url?: string | null;
  tiktok_username?: string | null;
  tiktok_video_id?: string | null;
  tiktokRejectionReason?: string | null;
  tiktokAdStatus?: string | null;
  tiktokAdgroupStatus?: string | null;
  tiktokCampaignStatus?: string | null;
  total_budget?: number | null;
  daily_budget?: number | null;
  extension_status?: 'awaiting_payment' | 'verifying_payment' | null;
}

interface CampaignCardProps {
  campaign: Campaign;
  compact?: boolean;
  onPress?: (campaignId: string) => void;
  onExtendPress?: (campaign: Campaign) => void;
  canPauseAds?: boolean;
  onPausePress?: (campaign: Campaign) => void;
}

const CampaignCardComponent: React.FC<CampaignCardProps> = ({
  campaign,
  compact = false,
  onPress,
  onExtendPress,
  canPauseAds = false,
  onPausePress,
}) => {
  const navigation = useNavigation();
  const { t, language } = useLanguage();
  const rtl = isRTL(language);
  const { colors } = useTheme();
  const styles = createStyles(colors, rtl);
  const [imageError, setImageError] = useState(false);
  const [extendButtonHiddenByTimer, setExtendButtonHiddenByTimer] = useState(false);
  const thumbnailUrl = ((campaign as any).thumbnail_url as string | null) || null;
  const isValidThumbnail = (url?: string | null) =>
    !!url && url.startsWith('https://') && !url.includes('tiktokcdn.com');
  const isThumbnailValid = isValidThumbnail(thumbnailUrl);
  const shouldShowImage = isThumbnailValid && !imageError;

  const EXTEND_PROMPT_KEY = (cid: string) => `extend_prompt_shown_${cid}`;
  const EXTEND_PROMPT_MS = 30 * 60 * 1000;

  useEffect(() => {
    setImageError(false);
  }, [thumbnailUrl]);

  useEffect(() => {
    if (!campaign?.id) return;
    const status = (campaign.status || '').toLowerCase();
    const totalBudget = (campaign.total_budget ?? 0);
    const spentPct = totalBudget > 0 ? ((campaign.spend ?? 0) / totalBudget) * 100 : 0;
    const canExtend =
      (status === 'active' || status === 'running' || status === 'completed' || status === 'paused') &&
      (campaign.daily_budget ?? 0) >= 20 &&
      !(campaign as any).extension_status &&
      spentPct >= 75;
    if (!canExtend) {
      setExtendButtonHiddenByTimer(false);
      return;
    }
    let isMounted = true;
    AsyncStorage.getItem(EXTEND_PROMPT_KEY(campaign.id)).then((raw) => {
      if (!isMounted) return;
      if (!raw) {
        setExtendButtonHiddenByTimer(false);
        return;
      }
      const stored = Number(raw);
      const elapsed = Date.now() - stored;
      setExtendButtonHiddenByTimer(Number.isFinite(stored) && elapsed >= EXTEND_PROMPT_MS);
    });
    return () => { isMounted = false; };
  }, [campaign?.id, campaign?.status, campaign?.spend, campaign?.total_budget, campaign?.daily_budget, (campaign as any)?.extension_status]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const isConversionCampaign = ['conversions', 'traffic', 'contacts', 'lead_generation'].includes(
    campaign.objective?.toLowerCase() || ''
  );

  // Use monotonic metrics to prevent flickering
  const { views, spend, leads, clicks } = getMonotonicMetrics(
    campaign.id,
    campaign.views ?? 0,
    campaign.spend ?? 0,
    campaign.leads ?? 0,
    campaign.clicks ?? 0
  );

  const renderMetric = (value: number | null | undefined, format: (n: number) => string = formatNumber) => {
    if (value === null || value === undefined) return format(0);
    return format(value);
  };

  const showInvoice = campaign.status === 'completed';

  const getObjectiveLabel = (objective?: string) => {
    const normalized = objective?.toLowerCase();
    if (!normalized) return t('campaign') || 'Campaign';
    if (normalized.includes('view')) return t('views') || 'Views';
    if (['conversions', 'lead_generation', 'contact', 'leads', 'traffic', 'messages'].includes(normalized)) {
      return t('contactsMessages') || 'Contacts & Messages';
    }
    return normalized;
  };

  const dailyBudget = campaign.daily_budget || 0;
  const status = (campaign.status || '').toLowerCase();
  const spentPercentage =
    (campaign.total_budget ?? 0) > 0
      ? ((campaign.spend ?? 0) / (campaign.total_budget ?? 1)) * 100
      : 0;
  const canExtend =
    (status === 'active' || status === 'running' || status === 'completed' || status === 'paused') &&
    dailyBudget >= 20 &&
    !campaign.extension_status &&
    spentPercentage >= 75 &&
    !extendButtonHiddenByTimer;
  const canPause =
    canPauseAds &&
    (status === 'active' || status === 'running') &&
    (campaign.spend ?? 0) >= 5;

  const cpm = campaign.impressions && campaign.impressions > 0 && spend
    ? (spend / campaign.impressions) * 1000
    : 0;

  const costPerConversion = leads && leads > 0 && spend
    ? spend / leads
    : 0;

  const hasVideoLink =
    (typeof campaign.tiktok_public_url === 'string' && campaign.tiktok_public_url.includes('/@')) ||
    !!campaign.video_url;

  const resolveLegacyVideoUrl = async () => {
    if (!campaign.video_url || !supabase) return null;
    try {
      const { data, error } = await supabase.functions.invoke('tiktok-video-info', {
        body: {
          authCode: campaign.video_url,
          campaignId: campaign.id,
        },
      });
      if (error) {
        if (__DEV__) {
          console.warn('[CampaignCard] Legacy video fetch failed:', error.message);
        }
        return null;
      }
      return data?.videoInfo?.tiktokUrl || data?.tiktokUrl || null;
    } catch (err) {
      if (__DEV__) {
        console.warn('[CampaignCard] Legacy video fetch error:', err);
      }
      return null;
    }
  };

  // Open pre-resolved URL; sync cycle auto-populates tiktok_public_url. Fallback to API only if still missing.
  const handleViewVideo = async () => {
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
  };

  const handleCardPress = () => {
    if (onPress) {
      onPress(campaign.id);
    } else {
      navigation.navigate('CampaignDetail', { id: campaign.id });
    }
  };

  if (compact) {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={handleCardPress}
      >
        <View style={styles.compactContent}>
          <View style={styles.compactLeft}>
            {/* Compact Thumbnail */}
            {shouldShowImage ? (
              <View style={styles.thumbnailContainerCompact}>
                <Image
                  source={{ uri: thumbnailUrl as string }}
                  style={styles.thumbnailImage}
                  resizeMode="cover"
                  onError={() => setImageError(true)}
                />
              </View>
            ) : (
              <View style={styles.thumbnailPlaceholderCompact}>
                <Megaphone size={20} color="#9CA3AF" />
              </View>
            )}
            <View style={styles.compactText}>
              <Text style={styles.compactTitle} numberOfLines={1}>{campaign.title}</Text>
              <Text style={styles.compactSubtitle}>
                ${spend.toFixed(0)} {t('spent')}
              </Text>
            </View>
          </View>
          <CampaignStatusBadge
            status={campaign.status}
            rejectionReason={campaign.tiktokRejectionReason}
            tiktokStatus={campaign.tiktokAdgroupStatus}
            compact
          />
        </View>
      </TouchableOpacity>
    );
  }

  const getStatusInfo = () => {
    const status = campaign.status?.toLowerCase();
    if (status === 'awaiting_payment' || status === 'verifying_payment') {
      return { color: '#F59E0B', bg: '#FEF3C7', icon: AlertCircle, text: t('awaitingPayment') || 'Awaiting Payment' };
    }
    if (status === 'completed' || status === 'paused') {
      return { color: '#3B82F6', bg: '#DBEAFE', icon: CheckCircle, text: t('completed') || 'Completed' };
    }
    if (status === 'pending' || status === 'waiting_for_admin' || status === 'in_review') {
      return { color: '#8B5CF6', bg: '#EDE9FE', icon: Clock, text: t('inReview') || 'In Review' };
    }
    if (status === 'active' || status === 'running') {
      return { color: '#10B981', bg: '#D1FAE5', icon: CheckCircle, text: t('active') || 'Active' };
    }
    return { color: '#6B7280', bg: '#F3F4F6', icon: AlertCircle, text: status || 'Unknown' };
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={handleCardPress} activeOpacity={0.7}>
        <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          {/* Thumbnail */}
            {shouldShowImage ? (
            <View style={styles.thumbnailContainer}>
                <Image
                  source={{ uri: thumbnailUrl as string }}
                  style={styles.thumbnailImage}
                  resizeMode="cover"
                  onError={() => setImageError(true)}
                />
            </View>
          ) : (
            <View style={styles.thumbnailPlaceholder}>
              <Megaphone size={28} color="#9CA3AF" />
            </View>
          )}
          <View style={styles.cardHeaderText}>
            <Text style={styles.title} numberOfLines={1}>{campaign.title}</Text>
            <Text style={styles.subtitle}>{getObjectiveLabel(campaign.objective)}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
          <StatusIcon size={14} color={statusInfo.color} />
          <Text style={[styles.statusText, { color: statusInfo.color }]}>
            {statusInfo.text}
          </Text>
        </View>
        </View>

        {campaign.tiktokRejectionReason && (
          <View style={styles.rejectionBox}>
            <Text style={styles.rejectionText}>{campaign.tiktokRejectionReason}</Text>
          </View>
        )}

        <View style={styles.metrics}>
        <View style={styles.metricItem}>
          <Eye size={16} color="#71717A" />
          <View style={styles.metricContent}>
            <Text style={styles.metricLabel} numberOfLines={1}>
              {t('views')}
            </Text>
            <Text style={styles.metricValue}>{renderMetric(views || campaign.impressions)}</Text>
          </View>
        </View>

        {isConversionCampaign ? (
          <>
            <View style={styles.metricItem}>
              <MessageCircle size={16} color="#71717A" />
              <View style={styles.metricContent}>
                <Text style={styles.metricLabel} numberOfLines={1}>
                  {t('conversions')}
                </Text>
                <Text style={styles.metricValue}>{renderMetric(leads)}</Text>
              </View>
            </View>
            <View style={styles.metricItem}>
              <DollarSign size={16} color="#71717A" />
              <View style={styles.metricContent}>
                <Text style={styles.metricLabel} numberOfLines={1}>
                  {t('costPerConv') || 'Cost/Conv'}
                </Text>
                <Text style={styles.metricValue}>${costPerConversion.toFixed(2)}</Text>
              </View>
            </View>
          </>
        ) : (
          <>
            <View style={styles.metricItem}>
              <DollarSign size={16} color="#71717A" />
              <View style={styles.metricContent}>
                <Text style={styles.metricLabel} numberOfLines={1}>
                  {t('costPer1KViews') || 'Cost/1K'}
                </Text>
                <Text style={styles.metricValue}>${cpm.toFixed(2)}</Text>
              </View>
            </View>
            <View style={styles.metricItem}>
              <DollarSign size={16} color="#71717A" />
              <View style={styles.metricContent}>
                <Text style={styles.metricLabel} numberOfLines={1}>
                  {t('spend')}
                </Text>
                <Text style={styles.metricValue}>${spend.toFixed(0)}</Text>
              </View>
            </View>
          </>
        )}
        </View>
      </TouchableOpacity>

      <View style={styles.actionButtons}>
        {canPause && (
          <TouchableOpacity
            style={styles.pauseButton}
            onPress={() => onPausePress?.(campaign)}
            activeOpacity={0.7}
          >
            <Text style={styles.pauseButtonText}>{t('pauseAd') || 'Pause Ad'}</Text>
          </TouchableOpacity>
        )}
        {canExtend && (
          <TouchableOpacity
            style={styles.extendButton}
            onPress={() => {
              if (onExtendPress) {
                onExtendPress(campaign);
              }
            }}
            activeOpacity={0.7}
          >
            <Plus size={16} color={colors.primary.foreground} />
            <Text style={styles.extendButtonText}>{t('extendAd') || 'Extend'}</Text>
          </TouchableOpacity>
        )}
        {hasVideoLink && (
          <TouchableOpacity
            style={styles.videoButton}
            onPress={() => {
              handleViewVideo();
            }}
            activeOpacity={0.7}
          >
            <Play size={16} color="#7C3AED" />
            <Text style={styles.videoButtonText}>{t('viewVideo') || 'View Video'}</Text>
          </TouchableOpacity>
        )}
      {showInvoice && (
        <TouchableOpacity
          style={styles.invoiceButton}
          onPress={() => {
            navigation.navigate('Invoice', { id: campaign.id });
          }}
          activeOpacity={0.7}
        >
          <FileText size={16} color="#6B7280" />
          <Text style={styles.invoiceButtonText}>{t('viewInvoice') || 'View Invoice'}</Text>
        </TouchableOpacity>
      )}
      </View>
    </View>
  );
};

// Memoize component for FlatList performance
export const CampaignCard = memo(CampaignCardComponent, (prevProps, nextProps) => {
  // Only re-render if campaign data actually changed
  return (
    prevProps.campaign.id === nextProps.campaign.id &&
    prevProps.campaign.status === nextProps.campaign.status &&
    prevProps.campaign.views === nextProps.campaign.views &&
    prevProps.campaign.spend === nextProps.campaign.spend &&
    prevProps.campaign.leads === nextProps.campaign.leads &&
    prevProps.campaign.clicks === nextProps.campaign.clicks &&
    (prevProps.campaign as any).thumbnail_url === (nextProps.campaign as any).thumbnail_url &&
    prevProps.compact === nextProps.compact &&
    prevProps.canPauseAds === nextProps.canPauseAds
  );
});

const createStyles = (colors: any, rtl: boolean) => {
  const rowDir = 'row';
  return StyleSheet.create({
  card: {
    backgroundColor: colors.card.background,
    borderRadius: borderRadius.card + 2,
    padding: spacing.md + 4,
    marginBottom: spacing.md,
    marginHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  compactContent: {
    flexDirection: rowDir,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compactLeft: {
    flex: 1,
    marginEnd: 12,
    flexDirection: rowDir,
    alignItems: 'center',
    gap: 12,
  },
  compactText: {
    flex: 1,
  },
  compactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0A0A0F',
    marginBottom: 4,
    fontFamily: 'Poppins-SemiBold',
  },
  compactSubtitle: {
    fontSize: 14,
    color: '#71717A',
    fontFamily: 'Poppins-Regular',
  },
  cardHeader: {
    flexDirection: rowDir,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  cardHeaderLeft: {
    flex: 1,
    marginEnd: spacing.md,
    flexDirection: rowDir,
    alignItems: 'center',
    gap: 12,
  },
  cardHeaderText: {
    flex: 1,
  },
  thumbnailContainer: {
    width: 64,
    height: 64,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
  },
  thumbnailContainerCompact: {
    width: 48,
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  thumbnailPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailPlaceholderText: {
    fontSize: 9,
    color: '#E5E7EB',
    textAlign: 'center',
  },
  thumbnailPlaceholderCompact: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailPlaceholderTextCompact: {
    fontSize: 8,
    color: '#E5E7EB',
    textAlign: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0A0A0F',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#71717A',
    textTransform: 'capitalize',
    marginTop: 2,
    fontWeight: '400',
  },
  statusBadge: {
    flexDirection: rowDir,
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  rejectionBox: {
    backgroundColor: colors.status.rejected.bg,
    borderRadius: borderRadius.DEFAULT,
    padding: spacing[3],
    marginBottom: spacing[3],
  },
  rejectionText: {
    fontSize: 12,
    color: colors.status.rejected.text,
  },
  metrics: {
    flexDirection: rowDir,
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: spacing.sm,
  },
  metricItem: {
    flex: 1,
    flexDirection: rowDir,
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  metricContent: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 11,
    color: '#71717A',
    marginBottom: 2,
    fontWeight: '400',
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0A0A0F',
  },
  actionButtons: {
    flexDirection: rowDir,
    gap: spacing.xs + 2,
    marginTop: spacing.md,
  },
  pauseButton: {
    flex: 1,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseButtonText: {
    fontSize: 11,
    color: '#B91C1C',
    fontWeight: '600',
  },
  videoButton: {
    flex: 1,
    flexDirection: rowDir,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.xs,
    backgroundColor: '#F3E8FF',
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  videoButtonText: {
    fontSize: 11,
    color: '#7C3AED',
    fontWeight: '600',
  },
  invoiceButton: {
    flex: 1,
    flexDirection: rowDir,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.xs,
    backgroundColor: '#F3F4F6',
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  invoiceButtonText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  extendButton: {
    flex: 1,
    flexDirection: rowDir,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.xs,
    backgroundColor: '#7C3AED',
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  extendButtonText: {
    fontSize: 11,
    color: colors.primary.foreground,
    fontWeight: '600',
  },
  });
};

