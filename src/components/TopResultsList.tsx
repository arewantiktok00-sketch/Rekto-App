import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { ArrowLeft, DollarSign, Eye, Target, Trophy } from 'lucide-react-native';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Linking,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

import { Text } from '@/components/common/Text';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRemoteConfig } from '@/contexts/RemoteConfigContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/integrations/supabase/client';
import { isRTL as getIsRTL } from '@/utils/rtl';

const SCREEN_WIDTH = Dimensions.get('window').width;

// Thumbnail is valid only if it is a Supabase Storage URL (NOT TikTok CDN).
function getThumbnailUrl(c: Record<string, unknown>): string {
  const url =
    (c.thumbnail_url as string) ||
    (c.thumbnail as string) ||
    (c.cover_image_url as string) ||
    (c.cover_url as string) ||
    '';
  const s = typeof url === 'string' ? url.trim() : '';
  if (!s.startsWith('https://') || s.includes('tiktokcdn.com')) return '';
  return s;
}

function getViews(c: Record<string, unknown>): number {
  const v = c.views ?? c.impressions ?? c.play_count ?? 0;
  return Number(v) || 0;
}

function getSpend(c: Record<string, unknown>): number {
  const s = c.spend ?? c.total_spend ?? c.amount ?? 0;
  return Number(s) || 0;
}

const translations = {
  ckb: {
    topResults: 'باشترین ئەنجامەکان',
    seeMore: 'بینینی زیاتر',
    views: 'بینراو',
    conversions: 'نامە',
    costPerConv: 'خەرجی',
    costPer1K: 'خەرجی / ١ک',
    clickToWatch: 'گرتە بکە بۆ بینین',
    ctaButton: 'وەک ئەمە بڵاوی بکەرەوە',
    participate: 'بەشداربە',
    loading: 'بارکردنەوە...',
  },
  ar: {
    topResults: 'أفضل النتائج',
    seeMore: 'عرض المزيد',
    views: 'المشاهدات',
    conversions: 'التحويلات',
    costPerConv: 'تكلفة / تحويل',
    costPer1K: 'تكلفة / ١ك',
    clickToWatch: 'انقر للمشاهدة',
    ctaButton: 'روّج مثل هذا',
    participate: 'شارك',
    loading: 'جاري التحميل...',
  },
} as const;

function formatNumber(num: number): string {
  if (!num || num <= 0) return '0';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return num.toString();
}

// Exact shape from featured-campaign get_top
interface TopCampaign {
  id: string;
  title: string;
  thumbnail_url: string | null;
  user_name: string;
  spend: number;
  views: number;
  cpm: number;
  video_url: string | null;
  leads: number;
  objective: string | null;
  show_conversions: boolean;
  cost_per_conversion: number;
  rank: number;
}

const TopResultsListInner: React.FC = () => {
  const { language } = useLanguage();
  const { colors, isDark } = useTheme();
  const { isPaymentsHidden } = useRemoteConfig();
  const navigation = useNavigation();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const locale = language === 'ar' ? 'ar' : 'ckb';
  const t = translations[locale];
  const isRTL = getIsRTL(language);

  const [campaigns, setCampaigns] = useState<TopCampaign[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [videoLoadingId, setVideoLoadingId] = useState<string | null>(null);

  const initialLoadDoneRef = useRef(false);
  const lastFetchTimeRef = useRef(0);
  const listRef = useRef<FlatList<TopCampaign> | null>(null);

  const fetchEnabled = useCallback(async () => {
    try {
      const { data } = await supabase.functions.invoke('app-settings', {
        body: { action: 'get', key: 'global' },
      });
      const value = data?.settings?.value ?? data?.value;
      const isEnabled = value?.features?.featured_story_enabled ?? true;
      setEnabled(!!isEnabled);
    } catch {
      setEnabled(true);
    }
  }, []);

  const fetchTopCampaigns = useCallback(async (silent = false) => {
    const now = Date.now();
    if (!initialLoadDoneRef.current) {
      setLoading(true);
    } else if (silent) {
      // Silent refresh: no loading state change
    } else if (now - lastFetchTimeRef.current < 60000) {
      return;
    }

    if (!silent) lastFetchTimeRef.current = now;

    try {
      const { data, error } = await supabase.functions.invoke('featured-campaign', {
        body: { action: 'get_top', limit: 3 },
      });
      const list = data?.campaigns as TopCampaign[] | undefined;
      if (!error && Array.isArray(list)) {
        setCampaigns(prev => {
          const prevIds = prev.map(c => c.id).join(',');
          const nextIds = list.map(c => c.id).join(',');
          if (prevIds === nextIds && prev.length === list.length) return prev;
          return list.length > 0 ? list : prev;
        });
      }
    } catch (e) {
      if (__DEV__) console.warn('[TopResultsList] fetchTopCampaigns error:', e);
    } finally {
      initialLoadDoneRef.current = true;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEnabled();
    fetchTopCampaigns();
  }, [fetchEnabled, fetchTopCampaigns]);

  useFocusEffect(
    useCallback(() => {
      fetchTopCampaigns(true);
    }, [fetchTopCampaigns])
  );

  // Auto-refresh top results in background every 90s (silent, no loading state)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchTopCampaigns(true);
    }, 90000);
    return () => clearInterval(interval);
  }, [fetchTopCampaigns]);

  // Realtime: only toggle feature flag, never refetch campaigns directly
  useEffect(() => {
    const channel = supabase
      .channel('app-settings-global')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'app_settings',
          filter: 'key=eq.global',
        },
        payload => {
          const value = (payload.new as any)?.value;
          const isEnabled = value?.features?.featured_story_enabled ?? true;
          setEnabled(!!isEnabled);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Auto-advance every 4 seconds when multiple campaigns
  useEffect(() => {
    if (campaigns.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex(prev => {
        const next = (prev + 1) % campaigns.length;
        listRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 4000);
    return () => clearInterval(timer);
  }, [campaigns.length]);

  const openVideo = useCallback(
    async (campaign: TopCampaign) => {
      const direct = campaign.video_url ?? '';
      if (direct && direct.includes('/@')) {
        Linking.openURL(direct);
        return;
      }

      setVideoLoadingId(campaign.id);
      try {
        const { data } = await supabase.functions.invoke('get-campaign-video', {
          body: { id: campaign.id },
        });
        const url = data?.video_url ?? null;
        if (url && typeof url === 'string') {
          Linking.openURL(url);
        } else {
          const msg = locale === 'ar' ? 'لا يوجد فيديو' : 'ڤیدیۆ بەردەست نییە';
          // eslint-disable-next-line no-console
          console.warn('[TopResultsList] video url missing');
          // No toast util imported here to avoid extra flicker; Dashboard may toast separately
          console.log(msg);
        }
      } catch (e) {
        const msg = locale === 'ar' ? 'لا يوجد فيديو' : 'ڤیدیۆ بەردەست نییە';
        console.log(msg, e);
      } finally {
        setVideoLoadingId(null);
      }
    },
    [locale]
  );

  if (!enabled) return null;

  const initialLoading = loading && !initialLoadDoneRef.current;
  if (!initialLoading && campaigns.length === 0) {
    // Feature enabled, but no campaigns — hide entire section.
    return null;
  }

  const renderItem = ({ item }: { item: TopCampaign }) => {
    const c = item as unknown as Record<string, unknown>;
    const views = getViews(c);
    const spend = getSpend(c);
    const leads = Number(item.leads ?? 0) || 0;

    const showConv = item.show_conversions === true;
    const costValue = showConv
      ? (item.cost_per_conversion != null
          ? item.cost_per_conversion.toFixed(2)
          : leads > 0
            ? (spend / leads).toFixed(2)
            : '0.00')
      : views > 0
        ? ((spend / views) * 1000).toFixed(2)
        : '0.00';
    const costLabel = showConv ? t.costPerConv : t.costPer1K;

    const thumbUrl = getThumbnailUrl(c);
    const hasThumb = thumbUrl.length > 0;

    const rank = Number(item.rank ?? 0) || 1;
    const rankBg = rank === 1 ? '#FACC15' : rank === 2 ? '#D1D5DB' : '#D97706';
    const rankText = rank === 1 ? '#854D0E' : rank === 2 ? '#374151' : '#FFF7ED';

    const cardBg = isDark ? '#18181B' : '#FFFFFF';
    const cardBorder = isDark ? '#3F3F46' : '#E4E4E7';
    const isVideoLoading = videoLoadingId === item.id;

    return (
      <View
        style={{
          width: SCREEN_WIDTH - 32,
          height: 220,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <View style={[styles.outerCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <View style={styles.mainRow}>
            {/* LEFT: 3-column metrics grid */}
            <View style={styles.metricsGrid}>
              <View style={[styles.metricCol, isDark && styles.metricColDark]}>
                <Eye size={18} color="#7C3AED" />
                <Text style={styles.metricLabel}>{t.views}</Text>
                <Text style={styles.metricValue} useNumbersFont>
                  {formatNumber(views)}
                </Text>
              </View>
              <View style={[styles.metricCol, isDark && styles.metricColDark]}>
                <Target size={18} color="#7C3AED" />
                <Text style={styles.metricLabel}>{t.conversions}</Text>
                <Text style={styles.metricValue} useNumbersFont>
                  {formatNumber(leads)}
                </Text>
              </View>
              {!isPaymentsHidden && (
                <View style={[styles.metricCol, isDark && styles.metricColDark]}>
                  <DollarSign size={18} color="#EF4444" />
                  <Text style={styles.metricLabel}>{costLabel}</Text>
                  <Text style={styles.metricCostValue} useNumbersFont>
                    {'$' + costValue}
                  </Text>
                </View>
              )}
            </View>

            {/* RIGHT: 96x96 thumbnail with rank badge overlay */}
            <View style={styles.thumbWrap}>
              {hasThumb ? (
                <Image
                  source={{ uri: thumbUrl }}
                  style={[styles.thumb, isDark && styles.thumbDark]}
                  resizeMode="cover"
                  onError={() => {
                    // If load fails, render placeholder instead.
                  }}
                />
              ) : (
                <View style={[styles.thumbPlaceholder, isDark && styles.thumbPlaceholderDark]}>
                  <Trophy size={32} color="#71717A" />
                </View>
              )}
              <View
                style={[
                  styles.rankBadge,
                  { backgroundColor: rankBg },
                  (isRTL ? styles.rankBadgeRTL : styles.rankBadgeLTR),
                ]}
              >
                <Trophy size={12} color={rankText} />
                <Text style={[styles.rankBadgeText, { color: rankText }]} useNumbersFont>
                  {rank.toString()}
                </Text>
              </View>
            </View>
          </View>

          {/* Click to watch */}
          {!isPaymentsHidden && item.video_url ? (
            <TouchableOpacity
              onPress={() => openVideo(item)}
              disabled={isVideoLoading}
              style={styles.watchRow}
            >
              {isVideoLoading ? (
                <ActivityIndicator size="small" color="#7C3AED" />
              ) : (
                <>
                  <Text style={styles.watchText}>{t.clickToWatch}</Text>
                  <ArrowLeft
                    size={16}
                    color="#7C3AED"
                    style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }}
                  />
                </>
              )}
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.section} collapsable={false}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderLeft}>
          <View style={styles.sectionIcon}>
            <Trophy size={20} color="#6D28D9" />
          </View>
          <Text style={styles.sectionTitle}>{t.topResults}</Text>
        </View>
        <TouchableOpacity
          onPress={() => (navigation as any).navigate('TopResults' as never)}
          style={styles.sectionLink}
        >
          <Text style={styles.sectionLinkText}>{t.seeMore}</Text>
          <ArrowLeft
            size={16}
            color="#7C3AED"
            style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }}
          />
        </TouchableOpacity>
      </View>

      {initialLoading ? (
          <View style={styles.emptyOrLoadingBox}>
          <ActivityIndicator size="small" color="#7C3AED" />
          <Text style={styles.emptyOrLoadingText}>{t.loading}</Text>
        </View>
      ) : (
        <>
          <FlatList
            ref={listRef}
            data={campaigns || []}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            removeClippedSubviews={false}
            keyExtractor={(item) => item.id}
            style={{ width: SCREEN_WIDTH - 32, alignSelf: 'center' }}
            initialNumToRender={3}
            windowSize={5}
            maxToRenderPerBatch={3}
            getItemLayout={(_, index) => {
              const length = SCREEN_WIDTH - 32;
              return { length, offset: length * index, index };
            }}
            onMomentumScrollEnd={e => {
              const width = SCREEN_WIDTH - 32;
              const index = Math.round(e.nativeEvent.contentOffset.x / width);
              setActiveIndex(index);
            }}
            renderItem={renderItem}
          />

          <View style={styles.dotsRow}>
            {campaigns.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  index === activeIndex ? styles.dotActive : styles.dotInactive,
                ]}
              />
            ))}
          </View>

          {!isPaymentsHidden && (
            <View style={[styles.ctaCard, isDark && styles.ctaCardDark]}>
              <Text style={styles.ctaText}>{t.ctaButton}</Text>
              <TouchableOpacity
                onPress={() => (navigation as any).navigate('Main', { screen: 'CreateAd' })}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#7C3AED', '#9333EA']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.ctaButton}
                >
                  <Text style={styles.ctaButtonText}>{t.participate}</Text>
                  <ArrowLeft size={16} color="#FFFFFF" style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }} />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </View>
  );
};

export const TopResultsList = memo(TopResultsListInner);

const createStyles = (colors: { foreground?: { DEFAULT?: string; muted?: string }; background?: { secondary?: string }; border?: { DEFAULT?: string } }, isDark: boolean) =>
  StyleSheet.create({
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyOrLoadingBox: {
    minHeight: 180,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    backgroundColor: isDark ? '#27272A' : '#F4F4F5',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: isDark ? '#3F3F46' : '#E4E4E7',
  },
  emptyOrLoadingBoxDark: {
    backgroundColor: '#27272A',
    borderColor: '#3F3F46',
  },
  emptyOrLoadingText: {
    fontSize: 14,
    color: isDark ? '#A1A1AA' : '#52525B',
    fontFamily: 'Rabar_021',
    marginTop: 8,
    textAlign: 'center',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionIcon: {
    padding: 6,
    backgroundColor: '#EDE9FE',
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: isDark ? '#FAFAFA' : '#18181B',
    fontFamily: 'Rabar_021',
  },
  sectionLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sectionLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7C3AED',
    fontFamily: 'Rabar_021',
  },
  outerCard: {
    width: SCREEN_WIDTH - 40,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E4E4E7',
    padding: 16,
    overflow: 'visible',
  },
  mainRow: {
    flexDirection: 'row',
    gap: 16,
  },
  metricsGrid: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    minWidth: 0,
  },
  metricCol: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#F4F4F5',
    minWidth: 0,
  },
  metricColDark: {
    backgroundColor: 'rgba(63,63,70,0.5)',
  },
  metricLabel: {
    fontSize: 9,
    color: isDark ? '#FAFAFA' : '#52525B',
    fontFamily: 'Rabar_021',
    marginTop: 4,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '700',
    color: isDark ? '#FAFAFA' : '#18181B',
    fontFamily: 'Poppins-Bold',
    writingDirection: 'ltr',
  },
  metricCostValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#7C3AED',
    fontFamily: 'Poppins-Bold',
    writingDirection: 'ltr',
  },
  thumbWrap: {
    width: 96,
    height: 96,
    position: 'relative',
    borderRadius: 12,
    overflow: 'visible',
  },
  thumb: {
    width: 96,
    height: 96,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E4E4E7',
  },
  thumbDark: {
    borderColor: '#3F3F46',
  },
  thumbPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 12,
    backgroundColor: '#F4F4F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbPlaceholderDark: {
    backgroundColor: '#27272A',
  },
  rankBadge: {
    position: 'absolute',
    top: -8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  rankBadgeLTR: {
    left: -6,
  },
  rankBadgeRTL: {
    right: -6,
    left: undefined,
  },
  rankBadgeText: {
    fontSize: 12,
    fontFamily: 'Poppins-Bold',
  },
  watchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 8,
  },
  watchText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7C3AED',
    fontFamily: 'Rabar_021',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  dot: {
    height: 8,
    width: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
    height: 8,
    backgroundColor: '#7C3AED',
  },
  dotInactive: {
    width: 8,
    height: 8,
    backgroundColor: 'rgba(113,113,122,0.3)',
  },
  ctaCard: {
    backgroundColor: isDark ? '#18181B' : (colors.background?.secondary ?? '#FFFFFF'),
    borderRadius: 12,
    borderWidth: 1,
    borderColor: isDark ? '#27272A' : (colors.border?.DEFAULT ?? '#E4E4E7'),
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  ctaCardDark: {
    backgroundColor: '#18181B',
    borderColor: '#27272A',
  },
  ctaText: {
    fontSize: 14,
    color: isDark ? '#A1A1AA' : '#52525B',
    fontFamily: 'Rabar_021',
    fontWeight: '500',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  ctaButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Rabar_021',
  },
});

