import { Text } from '@/components/common/Text';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRemoteConfig } from '@/contexts/RemoteConfigContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/integrations/supabase/client';
import { borderRadius, spacing } from '@/theme/spacing';
import { getMonotonicMetrics } from '@/utils/metricsCache';
import { isRTL } from '@/utils/rtl';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { DollarSign, ExternalLink, Eye, FileText, Megaphone, MessageCircle, Play, Plus } from 'lucide-react-native';
import React, { memo, useEffect, useState } from 'react';
import { Alert, Image, Linking, StyleSheet, TouchableOpacity, View } from 'react-native';
import { getDisplayBudget, getExtensionStatusText } from '@/utils/campaignBudget';
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
  real_budget?: number | null;
  target_spend?: number | null;
  daily_budget?: number | null;
  extension_status?: 'awaiting_payment' | 'verifying_payment' | 'processing' | null;
}

interface CampaignCardProps {
  campaign: Campaign;
  compact?: boolean;
  onPress?: (campaignId: string) => void;
  onExtendPress?: (campaign: Campaign) => void;
  canPauseAds?: boolean;
  canExtendAds?: boolean;
  onPausePress?: (campaign: Campaign) => void;
}

const CampaignCardComponent: React.FC<CampaignCardProps> = ({
  campaign,
  compact = false,
  onPress,
  onExtendPress,
  canPauseAds = false,
  canExtendAds = false,
  onPausePress,
}) => {
  const navigation = useNavigation();
  const { t, language } = useLanguage();
  const { isPaymentsHidden } = useRemoteConfig();
  const rtl = isRTL(language);
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, rtl, isDark);
  const [imageError, setImageError] = useState(false);
  const [extendButtonHiddenByTimer, setExtendButtonHiddenByTimer] = useState(false);
  const thumbnailUrl = ((campaign as any).thumbnail_url as string | null) || null;
  const isValidThumbnail = (url?: string | null) =>
    !!url && url.startsWith('https://') && !url.includes('tiktokcdn.com');
  const isThumbnailValid = isValidThumbnail(thumbnailUrl);
  const shouldShowImage = isThumbnailValid && !imageError;

  const EXTEND_PROMPT_KEY = (cid: string) => `extend_prompt_shown_${cid}`;
  const EXTEND_PROMPT_MS = 60 * 60 * 1000;

  useEffect(() => {
    setImageError(false);
  }, [thumbnailUrl]);

  const displayBudget = getDisplayBudget(campaign);
  useEffect(() => {
    if (!campaign?.id) return;
    const status = (campaign.status || '').toLowerCase();
    const totalBudget = displayBudget;
    const spentPct = totalBudget > 0 ? ((campaign.spend ?? 0) / totalBudget) * 100 : 0;
    const extStatus = (campaign as any).extension_status;
    const noPendingExt = extStatus !== 'verifying_payment' && extStatus !== 'processing' && !extStatus;
    const canExtend =
      canExtendAds &&
      (status === 'active' || status === 'running') &&
      spentPct >= 75 &&
      (campaign.daily_budget ?? 0) >= 20 &&
      noPendingExt;
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
  }, [campaign?.id, campaign?.status, campaign?.spend, displayBudget, campaign?.daily_budget, (campaign as any)?.extension_status, (campaign as any)?.completed_at, campaign?.updated_at, campaign?.created_at, canExtendAds]);

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

  const status = (campaign.status || '').toLowerCase();
  const showInvoice = !isPaymentsHidden && (status === 'completed' || status === 'paused');

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
  const spentPercentage =
    displayBudget > 0 ? ((campaign.spend ?? 0) / displayBudget) * 100 : 0;
  const noPendingExtension = campaign.extension_status !== 'verifying_payment' && campaign.extension_status !== 'processing' && !campaign.extension_status;
  const canExtend =
    canExtendAds &&
    (status === 'active' || status === 'running') &&
    spentPercentage >= 75 &&
    dailyBudget >= 20 &&
    noPendingExtension &&
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
  const showViewVideo = !isPaymentsHidden && ['active', 'completed'].includes(status) && hasVideoLink;

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
              <Text style={[styles.compactTitle, rtl && styles.compactTitleRTL]} numberOfLines={1}>{campaign.title}</Text>
              <Text style={[styles.compactSubtitle, rtl && styles.compactSubtitleRTL]}>
                {isPaymentsHidden ? (t(campaign.status) || campaign.status) : `$${spend.toFixed(0)} ${t('spent')}`}
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

  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={handleCardPress} activeOpacity={0.7}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            {shouldShowImage ? (
              <View style={styles.thumbnailContainer}>
                <Image
                  source={{ uri: thumbnailUrl as string }}
                  style={styles.thumbnailImage}
                  resizeMode="cover"
                  onError={() => setImageError(true)}
                />
                <View style={styles.playOverlay}>
                  <Play size={16} color="#FFFFFF" />
                </View>
              </View>
            ) : (
              <View style={styles.thumbnailPlaceholder}>
                <Megaphone size={28} color="#9CA3AF" />
              </View>
            )}
            <View style={styles.cardHeaderText}>
              <Text style={[styles.title, rtl && styles.titleRTL]} numberOfLines={1}>{campaign.title}</Text>
              <Text style={[styles.subtitle, rtl && styles.subtitleRTL]}>{getObjectiveLabel(campaign.objective)}</Text>
            </View>
          </View>
          <CampaignStatusBadge status={campaign.status} />
        </View>

        {(() => {
          const ext = getExtensionStatusText(campaign.extension_status ?? null, (language as 'ckb' | 'ar') || 'ckb');
          if (!ext) return null;
          return (
            <View style={[styles.extensionStatusChip, ext.color === 'warning' ? styles.extensionStatusWarning : styles.extensionStatusInfo]}>
              <Text style={ext.color === 'warning' ? styles.extensionStatusTextWarning : styles.extensionStatusTextInfo} numberOfLines={1}>
                {ext.text}
              </Text>
            </View>
          );
        })()}

        {campaign.tiktokRejectionReason && (
          <View style={styles.rejectionBox}>
            <Text style={styles.rejectionText}>{campaign.tiktokRejectionReason}</Text>
          </View>
        )}

        {/* Metrics: icon left, then label + value (original layout) */}
        <View style={styles.metrics}>
          <View style={styles.metricItem}>
            <View style={styles.metricIconBadge}>
              <Eye size={14} color="#6D28D9" />
            </View>
            <View style={styles.metricContent}>
              <Text style={[styles.metricLabel, rtl && styles.metricLabelRTL]} numberOfLines={1}>{t('viewsDisplay')}</Text>
              <Text style={[styles.metricValue, { writingDirection: 'ltr', fontFamily: 'Poppins-Bold' }]}>{formatNumber(views)}</Text>
            </View>
          </View>
          <View style={styles.metricItem}>
            <View style={styles.metricIconBadge}>
              <MessageCircle size={14} color="#6D28D9" />
            </View>
            <View style={styles.metricContent}>
              <Text style={[styles.metricLabel, rtl && styles.metricLabelRTL]} numberOfLines={1}>
                {isPaymentsHidden ? (t('clicks') || 'Clicks') : (isConversionCampaign ? t('conversionsDisplay') : (t('costPer1KLabel') || '1k/ خەرجی بۆ'))}
              </Text>
              <Text style={[styles.metricValue, { writingDirection: 'ltr', fontFamily: 'Poppins-Bold' }]}>
                {isPaymentsHidden ? renderMetric(clicks) : (isConversionCampaign ? renderMetric(leads) : `$${cpm.toFixed(2)}`)}
              </Text>
            </View>
          </View>
          <View style={styles.metricItem}>
            <View style={styles.metricIconBadge}>
              <MessageCircle size={14} color="#6D28D9" />
            </View>
            <View style={styles.metricContent}>
              <Text style={[styles.metricLabel, rtl && styles.metricLabelRTL]} numberOfLines={1}>
                {isPaymentsHidden ? (t('leads') || t('conversionsDisplay')) : (isConversionCampaign ? (t('costPerConvLabel') || 'خەرجی بۆ / 1 نامە') : t('spend'))}
              </Text>
              <Text style={[styles.metricValue, { writingDirection: 'ltr', fontFamily: 'Poppins-Bold' }]}>
                {isPaymentsHidden ? renderMetric(leads) : (isConversionCampaign ? `$${costPerConversion.toFixed(2)}` : `$${spend.toFixed(0)}`)}
              </Text>
            </View>
          </View>
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
        {!isPaymentsHidden && canExtend && (
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
              <Text style={styles.extendButtonText}>{t('extendAd')}</Text>
          </TouchableOpacity>
        )}
        {showViewVideo && (
          <TouchableOpacity
            style={styles.videoButton}
            onPress={() => {
              handleViewVideo();
            }}
            activeOpacity={0.7}
          >
            <ExternalLink size={16} color="#FFFFFF" />
            <Text style={styles.videoButtonText}>{t('viewVideo')}</Text>
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
          <Text style={styles.invoiceButtonText}>{t('viewInvoiceDisplay')}</Text>
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
    prevProps.campaign.tiktokRejectionReason === nextProps.campaign.tiktokRejectionReason &&
    prevProps.campaign.tiktokAdgroupStatus === nextProps.campaign.tiktokAdgroupStatus &&
    (prevProps.campaign as any).thumbnail_url === (nextProps.campaign as any).thumbnail_url &&
    prevProps.compact === nextProps.compact &&
    prevProps.canPauseAds === nextProps.canPauseAds
  );
});

const createStyles = (colors: any, _rtl: boolean, isDark: boolean) => {
  const textPrimary = isDark ? '#FAFAFA' : '#18181B';
  const textMuted = isDark ? '#A1A1AA' : '#71717A';
  return StyleSheet.create({
  card: {
    backgroundColor: colors.card?.background ?? '#FFFFFF',
    borderRadius: borderRadius.card + 2,
    padding: spacing.md + 4,
    marginBottom: spacing.md,
    marginHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border?.DEFAULT ?? '#E4E4E7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compactLeft: {
    flex: 1,
    marginEnd: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  compactText: {
    flex: 1,
  },
  compactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: textPrimary,
    marginBottom: 4,
    fontFamily: 'Poppins-SemiBold',
  },
  compactTitleRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  compactSubtitle: {
    fontSize: 14,
    color: textMuted,
    fontFamily: 'Poppins-Regular',
  },
  compactSubtitleRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  cardHeaderLeft: {
    flex: 1,
    marginEnd: spacing.md,
    flexDirection: 'row',
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
    backgroundColor: '#F4F4F5',
    borderWidth: 1,
    borderColor: '#E4E4E7',
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
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  thumbnailPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#EDE9FE',
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
    color: textPrimary,
    marginBottom: 4,
  },
  titleRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  subtitle: {
    fontSize: 13,
    color: textMuted,
    textTransform: 'capitalize',
    marginTop: 2,
    fontWeight: '400',
  },
  subtitleRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  statusBadge: {
    flexDirection: 'row',
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
  extensionStatusChip: {
    borderRadius: borderRadius.DEFAULT,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    marginBottom: spacing[3],
  },
  extensionStatusWarning: {
    backgroundColor: '#FEF3C7',
  },
  extensionStatusInfo: {
    backgroundColor: '#DBEAFE',
  },
  extensionStatusTextWarning: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '500',
  },
  extensionStatusTextInfo: {
    fontSize: 12,
    color: '#1E40AF',
    fontWeight: '500',
  },
  metrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: spacing.sm,
  },
  metricItem: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  metricIconBadge: {
    padding: 6,
    backgroundColor: '#EDE9FE',
    borderRadius: 8,
  },
  metricContent: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 11,
    color: textMuted,
    marginBottom: 2,
    fontWeight: '400',
  },
  metricLabelRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '700',
    color: textPrimary,
    flexShrink: 0,
  },
  actionButtons: {
    flexDirection: 'row',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.xs,
    backgroundColor: '#7C3AED',
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  videoButtonText: {
    fontSize: 11,
    color: colors.primary?.foreground ?? '#FFFFFF',
    fontWeight: '600',
  },
  invoiceButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.xs,
    backgroundColor: colors.background?.secondary ?? '#F3F4F6',
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  invoiceButtonText: {
    fontSize: 11,
    color: textMuted,
    fontWeight: '600',
  },
  extendButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
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

