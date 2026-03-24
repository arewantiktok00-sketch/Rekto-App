import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Linking, InteractionManager } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Trophy, Eye, Target, DollarSign, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { BackButton } from '@/components/common/BackButton';
import { Text } from '@/components/common/Text';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useRemoteConfig } from '@/contexts/RemoteConfigContext';
import { supabase } from '@/integrations/supabase/client';
import { getCached, setCached } from '@/services/globalCache';
import { getFontFamily, getNumberFontFamily } from '@/utils/getFontFamily';
import { isRTL, rtlText, ltrNumber, rtlRow } from '@/utils/rtl';
import { useAppSettingsRealtime } from '@/hooks/useAppSettingsRealtime';

interface RankedCampaign {
  id: string;
  title: string;
  thumbnail_url: string | null;
  spend: number;
  views: number;
  leads: number;
  objective: string | null;
  video_url: string | null;
  tiktok_public_url?: string | null;
  tiktok_video_id?: string | null;
  show_conversions: boolean;
  cost_per_conversion: number;
  rank: number;
}

interface MonthData {
  month: string;
  campaigns: RankedCampaign[];
}

export const TopResultsScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { t, language } = useLanguage();
  const { colors, isDark } = useTheme();
  const rtl = isRTL(language);
  const styles = useMemo(() => createStyles(colors, rtl, language), [colors, rtl, language]);
  const headerFgColor = colors.foreground?.DEFAULT ?? (isDark ? '#FAFAFA' : '#18181B');

  const [months, setMonths] = useState<MonthData[]>(() => getCached<MonthData[]>('top_results_months', []));
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { settings: config, isPaymentsHidden } = useRemoteConfig();
  const lastFetchRef = useRef(0);
  const MIN_FETCH_INTERVAL = 2000;

  const isValidThumbnail = (url?: string | null) =>
    typeof url === 'string' && url.startsWith('https://') && !url.includes('tiktokcdn.com');

  const isValidTikTokUrl = (url?: string | null) =>
    typeof url === 'string' && url.includes('/@');

  const resolveLegacyVideoUrl = async (campaignId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('tiktok-video-info', {
        body: { campaignId },
      });
      if (error) {
        if (__DEV__) {
          console.warn('[TopResultsScreen] Legacy video fetch failed:', error.message);
        }
        return null;
      }
      return data?.videoInfo?.tiktokUrl || data?.tiktokUrl || null;
    } catch (err) {
      if (__DEV__) {
        console.warn('[TopResultsScreen] Legacy video fetch error:', err);
      }
      return null;
    }
  };

  const fetchRankedCampaigns = useCallback(async () => {
    try {
      const now = Date.now();
      if (now - lastFetchRef.current < MIN_FETCH_INTERVAL) {
        return;
      }
      lastFetchRef.current = now;

      const { data, error } = await supabase.functions.invoke('featured-campaign', {
        body: { action: 'get_all_ranked' },
      });

      if (error) {
        setMonths([]);
        return;
      }

      const monthsData = (data?.months || []) as MonthData[];
      setMonths(monthsData);
      setCached('top_results_months', monthsData);
    } catch {
      setMonths([]);
    }
  }, []);
  const formatMonth = (monthKey?: string | null) => {
    if (!monthKey || typeof monthKey !== 'string') {
      return '';
    }
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
    const locale = language === 'ar' ? 'ar' : 'ckb';
    try {
      return date.toLocaleDateString(locale, { year: 'numeric', month: 'long' });
    } catch {
      return date.toLocaleDateString(locale === 'ar' ? 'ar-IQ' : 'ku', { year: 'numeric', month: 'long' });
    }
  };


  useEffect(() => {
    InteractionManager.runAfterInteractions(() => {
      fetchRankedCampaigns();
    });
  }, [fetchRankedCampaigns]);

  useFocusEffect(
    useCallback(() => {
      fetchRankedCampaigns();
    }, [fetchRankedCampaigns])
  );

  const topResultsEnabled = config?.features?.featured_story_enabled ?? true;

  const formatNumber = (num?: number | null) => {
    const safe = Number(num) || 0;
    if (safe >= 1000000) return (safe / 1000000).toFixed(1) + 'M';
    if (safe >= 1000) return (safe / 1000).toFixed(1) + 'K';
    return safe.toString();
  };

  const getRankColor = (rank: number) => {
    const text = colors.foreground.DEFAULT;
    if (rank === 1) return { bg: colors.warning, text };
    if (rank === 2) return { bg: colors.background.secondary, text };
    if (rank === 3) return { bg: colors.warning, text };
    return { bg: colors.background.secondary, text };
  };

  const getObjectiveLabel = (objective?: string | null) => {
    if (!objective || typeof objective !== 'string') return 'View';
    const normalized = objective.toLowerCase();
    if (['conversions', 'traffic', 'contacts', 'messages'].includes(normalized)) {
      return 'Contacts & Messages';
    }
    if (normalized.includes('video')) return 'View';
    return objective.replace(/_/g, ' ');
  };

  const headerTitle = t('topResults') || t('topResultsRankingTitle') || 'Top Results';
  const titleFont = getFontFamily(language as 'ckb' | 'ar', 'semibold');
  const HeaderRow = () => (
    <View style={styles.headerRow}>
      <BackButton onPress={() => navigation.goBack()} color={headerFgColor} style={styles.backButton} />
      <View style={styles.headerTitleCenter}>
        <Text
          style={[
            styles.headerTitleText,
            { fontFamily: titleFont, color: headerFgColor },
            rtlText(rtl),
          ]}
          numberOfLines={1}
        >
          {headerTitle}
        </Text>
      </View>
      <View style={styles.headerSpacer} />
    </View>
  );

  if (!topResultsEnabled) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <HeaderRow />
        </View>
        <View style={styles.emptyState}>
          <Trophy size={64} color={colors.foreground.muted} style={{ opacity: 0.3 }} />
          <Text style={[styles.emptyText, rtlText(rtl)]}>{t('featureUnavailable') || 'Feature currently unavailable'}</Text>
        </View>
      </View>
    );
  }

  const safeMonths = Array.isArray(months) ? months : [];

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <HeaderRow />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingStart: 16, paddingEnd: 16, paddingBottom: 40 }]}>
        {safeMonths.filter(Boolean).map((monthData, monthIndex) => (
          <View key={monthData?.month || `month-${monthIndex}`} style={styles.monthSection}>
            <View style={styles.monthHeader}>
              <Text
                style={[
                  styles.monthTitle,
                  rtlText(rtl)
                ]}
              >
                {t('monthlyResults') || 'Results for'} {formatMonth(monthData?.month)}
              </Text>
            </View>
            {(Array.isArray(monthData?.campaigns) ? monthData.campaigns : []).filter(Boolean).map((campaign, campaignIndex) => {
              const thumbnailUrl = campaign.thumbnail_url || null;
              const isThumbnailValid = isValidThumbnail(thumbnailUrl);

              return (
                <View key={campaign.id || `campaign-${monthIndex}-${campaignIndex}`} style={styles.campaignCard}>
              <View style={styles.campaignContent}>
                {/* RTL: image on right → thumbnail first in DOM; campaignContent uses row-reverse in RTL */}
                <View style={styles.thumbnailWrap}>
                  {isThumbnailValid ? (
                    <Image
                      source={{ uri: thumbnailUrl }}
                      style={styles.thumbnail}
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      style={[
                        styles.thumbnail,
                        styles.thumbnailPlaceholder,
                        { alignItems: 'center', justifyContent: 'center' },
                      ]}
                    >
                      <Trophy size={20} color="#9CA3AF" />
                    </View>
                  )}
                  <View
                    style={[
                      styles.rankBadge,
                      { backgroundColor: getRankColor(campaign.rank).bg },
                    ]}
                  >
                    <Trophy size={12} color={getRankColor(campaign.rank).text} />
                    <Text style={[styles.rankText, styles.numberLTR, { color: getRankColor(campaign.rank).text }]}>
                      {campaign.rank}
                    </Text>
                  </View>
                </View>

                <View style={styles.metricsGrid}>
                  <View style={styles.metricBox}>
                    <Eye size={16} color="#7C3AED" />
                    <Text style={[styles.metricLabel, rtlText(rtl)]}>{t('views') || 'Views'}</Text>
                    <Text style={[styles.metricValue, styles.numberLTR]}>{formatNumber(campaign.views)}</Text>
                  </View>
                  <View style={styles.metricBox}>
                    <Target size={16} color="#7C3AED" />
                    <Text style={[styles.metricLabel, rtlText(rtl)]}>{t('conversions') || 'Conversions'}</Text>
                    <Text style={[styles.metricValue, styles.numberLTR]}>{formatNumber(campaign.leads)}</Text>
                  </View>
                  {!isPaymentsHidden && (
                    <View style={styles.metricBox}>
                      <DollarSign size={16} color="#7C3AED" />
                      <Text style={[styles.metricLabel, rtlText(rtl)]}>
                        {campaign.show_conversions
                          ? t('costPerConv') || 'Cost/Conv'
                          : t('costPer1KViews') || 'Cost/1K'}
                      </Text>
                      <Text style={[styles.metricValuePurple, styles.numberLTR]}>
                        {campaign.show_conversions
                          ? `$${Number(campaign.cost_per_conversion || 0).toFixed(2)}`
                          : Number(campaign.views || 0) > 0
                          ? `$${((Number(campaign.spend || 0) / Number(campaign.views || 1)) * 1000).toFixed(2)}`
                          : '$0.00'}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {(() => {
                const hasVideoLink =
                  isValidTikTokUrl(campaign.tiktok_public_url) || !!campaign.video_url;
                return (
                  !isPaymentsHidden ? (
                    <TouchableOpacity
                      style={[styles.viewVideoButton, !hasVideoLink && styles.viewVideoButtonDisabled]}
                      onPress={async () => {
                        const publicUrl = campaign.tiktok_public_url || null;
                        const directUrl = campaign.video_url || null;
                        let url = isValidTikTokUrl(publicUrl) ? publicUrl : null;
                        if (!url && isValidTikTokUrl(directUrl)) {
                          url = directUrl;
                        }
                        if (!url && campaign.id) {
                          url = await resolveLegacyVideoUrl(campaign.id);
                        }
                        if (!url) return;
                        await Linking.openURL(url);
                      }}
                      activeOpacity={0.8}
                      disabled={!hasVideoLink}
                    >
                      <ExternalLink size={16} color={hasVideoLink ? '#7C3AED' : '#9CA3AF'} />
                      <Text style={[styles.viewVideoText, rtlText(rtl), !hasVideoLink && styles.viewVideoTextDisabled]}>
                        {campaign.show_conversions
                          ? t('viewVideo') || 'View Video'
                          : t('view') || 'View'}
                      </Text>
                    </TouchableOpacity>
                  ) : null
                );
              })()}

              <TouchableOpacity
                style={styles.moreInfoRow}
                onPress={() => setExpandedId(expandedId === campaign.id ? null : campaign.id)}
              >
                <Text style={[styles.moreInfoText, rtlText(rtl)]}>{t('moreInfo') || 'More Info'}</Text>
                {expandedId === campaign.id ? (
                  <ChevronUp size={18} color="#7C3AED" />
                ) : (
                  <ChevronDown size={18} color="#7C3AED" />
                )}
              </TouchableOpacity>

              {expandedId === campaign.id && (
                <View style={styles.moreInfoContent}>
                  {!isPaymentsHidden && (
                    <View style={styles.infoBox}>
                      <Text style={[styles.infoLabel, rtlText(rtl)]}>{t('totalSpend') || 'Total Spend'}</Text>
                      <Text style={[styles.infoValueNumber, styles.numberLTR]}>${Number(campaign.spend || 0).toFixed(2)}</Text>
                    </View>
                  )}
                  <View style={styles.infoBox}>
                    <Text style={[styles.infoLabel, rtlText(rtl)]}>{t('objective') || 'Objective'}</Text>
                    <Text style={[styles.infoValue, rtlText(rtl)]}>{getObjectiveLabel(campaign.objective)}</Text>
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </View>
    ))}

        {safeMonths.length === 0 && (
          <View style={styles.emptyState}>
            <Trophy size={64} color={colors.foreground.muted} style={{ opacity: 0.3 }} />
            <Text style={[styles.emptyText, rtlText(rtl)]}>{t('noResults') || 'No top results yet'}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const createStyles = (colors: any, rtl: boolean, language: 'ckb' | 'ar') => {
  const fontRegular = getFontFamily(language, 'regular');
  const fontMedium = getFontFamily(language, 'medium');
  const fontSemiBold = getFontFamily(language, 'semibold');
  const numberBold = getNumberFontFamily('bold');

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background.DEFAULT },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card?.background ?? colors.background?.DEFAULT ?? '#FFFFFF',
      borderBottomWidth: 1,
      borderBottomColor: colors.border?.DEFAULT ?? '#E5E7EB',
      paddingStart: 16,
      paddingEnd: 16,
      paddingBottom: 12,
      paddingTop: 12,
      width: '100%',
      minHeight: 56,
    },
    headerRow: {
      flexDirection: rtl ? 'row-reverse' : 'row',
      alignItems: 'center',
      height: 56,
      width: '100%',
    },
    backButton: {
      width: 40,
      height: 40,
      minWidth: 40,
      minHeight: 40,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.border?.DEFAULT ?? '#E4E4E7',
      backgroundColor: 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitleCenter: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitleText: {
      fontSize: 18,
      fontWeight: '600',
      textAlign: 'center',
      color: colors.foreground?.DEFAULT ?? '#18181B',
    },
    headerSpacer: { width: 40 },
    scroll: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 32 },
    monthSection: { marginBottom: 16 },
    monthHeader: { marginBottom: 8 },
    monthTitle: { color: colors.foreground.DEFAULT, fontSize: 14, fontFamily: fontSemiBold },
    campaignCard: {
      backgroundColor: colors.card.background,
      borderRadius: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border.DEFAULT,
      overflow: 'hidden',
    },
    campaignContent: {
      flexDirection: 'row',
      padding: 12,
      gap: 10,
    },
    metricsGrid: { flex: 1, flexDirection: 'row', gap: 6 },
    metricBox: {
      flex: 1,
      backgroundColor: colors.background.tertiary,
      borderRadius: 12,
      padding: 8,
      alignItems: 'center',
      gap: 2,
    },
    metricLabel: { fontSize: 9, color: colors.foreground.muted, marginTop: 2, fontFamily: fontRegular },
    metricValue: { fontSize: 14, color: colors.foreground.DEFAULT, fontFamily: numberBold },
    metricValuePurple: { fontSize: 14, color: colors.primary.DEFAULT, fontFamily: numberBold },
    thumbnailWrap: { width: 84, height: 110, position: 'relative' },
    thumbnail: { width: '100%', height: '100%', borderRadius: 10, borderWidth: 2, borderColor: colors.border.DEFAULT },
    thumbnailPlaceholder: { backgroundColor: colors.background.secondary, alignItems: 'center', justifyContent: 'center' },
    thumbnailPlaceholderText: {
      marginTop: 4,
      fontSize: 9,
      color: colors.foreground.muted,
      textAlign: 'center',
    },
    rankBadge: {
      position: 'absolute',
      top: -8,
      end: -8,
      backgroundColor: colors.warning,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    rankText: { fontSize: 12, fontFamily: numberBold },
    viewVideoButton: {
      marginStart: 16,
      marginEnd: 16,
      marginBottom: 12,
      paddingVertical: 10,
      borderWidth: 1.5,
      borderColor: colors.primary.DEFAULT,
      borderRadius: 12,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
    },
    viewVideoButtonDisabled: {
      borderColor: colors.border.DEFAULT,
    },
    viewVideoText: { color: colors.primary.DEFAULT, fontSize: 13, fontFamily: fontSemiBold },
    viewVideoTextDisabled: { color: colors.foreground.muted },
    moreInfoRow: {
      borderTopWidth: 1,
      borderTopColor: colors.border.DEFAULT,
      paddingStart: 16,
      paddingEnd: 16,
      paddingVertical: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    moreInfoText: { color: colors.primary.DEFAULT, fontFamily: fontMedium },
    moreInfoContent: { paddingStart: 16, paddingEnd: 16, paddingBottom: 16, flexDirection: 'row', gap: 12 },
    infoBox: { flex: 1, backgroundColor: colors.background.secondary, borderRadius: 8, padding: 12 },
    infoLabel: { fontSize: 12, color: colors.foreground.muted, fontFamily: fontRegular },
    infoValue: { color: colors.foreground.DEFAULT, fontFamily: fontMedium },
    infoValueNumber: { color: colors.foreground.DEFAULT, fontFamily: numberBold },
    numberLTR: {
      writingDirection: 'ltr',
      textAlign: 'left',
      fontFamily: 'Poppins-Bold',
    },
    emptyState: { alignItems: 'center', paddingVertical: 64 },
    emptyText: { marginTop: 16, fontSize: 16, color: colors.foreground.muted, fontFamily: fontMedium },
  });
};

