import { Text } from '@/components/common/Text';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRemoteConfig } from '@/contexts/RemoteConfigContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAppSettingsRealtime } from '@/hooks/useAppSettingsRealtime';
import { supabase } from '@/integrations/supabase/client';
import { getGlobalCache, setTopResultsCache } from '@/services/globalCache';
import { getFontFamily, getNumberFontFamily } from '@/utils/getFontFamily';
import { iconTransformRTL } from '@/utils/rtl';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { ArrowRight, DollarSign, Eye, Target, Trophy } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, Image, InteractionManager, Linking, StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Carousel from 'react-native-reanimated-carousel';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_HORIZONTAL_PADDING = 12 * 2;
const CARD_INNER_PADDING = 16 * 2;
const CAROUSEL_WIDTH = Math.min(SCREEN_WIDTH - CARD_HORIZONTAL_PADDING - CARD_INNER_PADDING, SCREEN_WIDTH - 56);

const isValidThumbnail = (url?: string | null) =>
  typeof url === 'string' && url.startsWith('https://') && !url.includes('tiktokcdn.com');

interface TopResultCampaign {
  id: string;
  title: string;
  thumbnail_url: string | null;
  user_name: string;
  spend: number;
  views: number;
  cpm: number;
  video_url: string | null;
  tiktok_public_url?: string | null;
  tiktok_video_id?: string | null;
  leads: number;
  objective: string | null;
  show_conversions: boolean;
  cost_per_conversion: number;
  rank: number;
  manual_rank: number | null;
}

const CACHE_KEY = 'top_results_cache';
const CACHE_EXPIRY = 5 * 60 * 1000;

const DotIndicator: React.FC<{ index: number; activeIndex: { value: number }; styles: { dot: any } }> = ({
  index,
  activeIndex,
  styles,
}) => {
  const animatedStyle = useAnimatedStyle(() => {
    const width = interpolate(activeIndex.value, [index - 1, index, index + 1], [8, 24, 8], 'clamp');
    const opacity = interpolate(activeIndex.value, [index - 1, index, index + 1], [0.3, 1, 0.3], 'clamp');
    return { width, opacity };
  });

  return <Animated.View style={[styles.dot, animatedStyle]} />;
};

export const TopResultsList: React.FC = () => {
  const { t, language, isRTL } = useLanguage();
  const { colors } = useTheme();
  const { settings: config } = useRemoteConfig();
  const navigation = useNavigation();
  const styles = useMemo(() => createStyles(colors, isRTL, language), [colors, isRTL, language]);
  const [items, setItems] = useState<TopResultCampaign[]>(() => getGlobalCache().topResults || []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const activeIndex = useSharedValue(0);
  const lastFetchRef = useRef(0);
  const MIN_FETCH_INTERVAL = 2000;

  const loadCache = useCallback(async () => {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (!cached) return;
      const parsed = JSON.parse(cached);
      const cacheAge = Date.now() - (parsed.timestamp || 0);
      if (parsed.data && cacheAge < CACHE_EXPIRY) {
        setItems(parsed.data);
        setTopResultsCache(parsed.data);
      }
    } catch {
      // Ignore cache errors
    }
  }, []);

  const fetchTopResults = useCallback(async () => {
    try {
      const now = Date.now();
      if (now - lastFetchRef.current < MIN_FETCH_INTERVAL) {
        return;
      }
      lastFetchRef.current = now;

      const { data, error } = await supabase.functions.invoke('featured-campaign', {
        body: { action: 'get_top', limit: 3 },
      });

      if (!error && data?.campaigns) {
        const campaigns = data.campaigns as TopResultCampaign[];
        setItems(campaigns);
        setTopResultsCache(campaigns);
        await AsyncStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ data: campaigns, timestamp: Date.now() })
        );
      }
    } catch {
      // Ignore fetch errors
    }
  }, []);

  useEffect(() => {
    loadCache();
    InteractionManager.runAfterInteractions(() => {
      fetchTopResults();
    });

    const channel = supabase
      .channel('top-results-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'campaigns',
        },
        () => fetchTopResults()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadCache, fetchTopResults]);

  useAppSettingsRealtime({
    enabled: true,
    settingsKey: 'global',
    onUpdate: () => {
      fetchTopResults();
    },
  });

  useAppSettingsRealtime({
    enabled: true,
    settingsKey: 'featured_campaign_id',
    onUpdate: () => {
      fetchTopResults();
    },
  });

  const carouselData = useMemo(
    () => (isRTL ? [...items].reverse() : items),
    [items, isRTL]
  );

  const topResultsEnabled = config?.features?.featured_story_enabled ?? true;
  if (!topResultsEnabled) return null;
  if (carouselData.length === 0) return null;

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return { bg: '#FACC15', text: '#111827' };
      case 2:
        return { bg: '#D1D5DB', text: '#111827' };
      case 3:
        return { bg: '#D97706', text: '#111827' };
      default:
        return { bg: '#F3F4F6', text: '#111827' };
    }
  };

  const isValidTikTokUrl = (url?: string | null) =>
    typeof url === 'string' && url.includes('/@');

  const resolveLegacyVideoUrl = async (campaignId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('tiktok-video-info', {
        body: { campaignId },
      });
      if (error) {
        if (__DEV__) {
          console.warn('[TopResultsList] Legacy video fetch failed:', error.message);
        }
        return null;
      }
      return data?.videoInfo?.tiktokUrl || data?.tiktokUrl || null;
    } catch (err) {
      if (__DEV__) {
        console.warn('[TopResultsList] Legacy video fetch error:', err);
      }
      return null;
    }
  };

  const openVideoForItem = async (item: TopResultCampaign) => {
    const publicUrl = item.tiktok_public_url || null;
    const directUrl = item.video_url || null;
    let url = isValidTikTokUrl(publicUrl) ? publicUrl : null;
    if (!url && isValidTikTokUrl(directUrl)) {
      url = directUrl;
    }
    if (!url && item.id) {
      url = await resolveLegacyVideoUrl(item.id);
    }
    if (!url) return;
    await Linking.openURL(url);
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIcon}>
          <Trophy size={18} color="#7C3AED" />
        </View>
        <Text style={styles.sectionTitle}>
          {t('topResults') || 'Top Results'}
        </Text>
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.seeMore}
          onPress={() => navigation.navigate('TopResults' as never)}
        >
          <Text style={[styles.seeMoreText, isRTL && styles.seeMoreTextRTL]}>{t('seeMore') || 'See More'}</Text>
          <ArrowRight size={14} color="#7C3AED" style={iconTransformRTL()} />
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <View style={styles.carouselWrapper}>
          <Carousel
            width={CAROUSEL_WIDTH}
            height={120}
            data={carouselData}
            autoPlay
            autoPlayInterval={4000}
            loop
            onSnapToItem={(index) => {
              setCurrentIndex(index);
              activeIndex.value = withTiming(index, { duration: 300 });
            }}
            scrollAnimationDuration={300}
            renderItem={({ item }) => {
              const handleViewVideo = async () => {
                await openVideoForItem(item);
              };

              const rankColors = getRankColor(item.rank || 0);
              const thumbnailUrl = item.thumbnail_url || null;
              const isThumbnailValid = isValidThumbnail(thumbnailUrl);

              return (
                <View style={styles.slideOuter}>
                  <View style={[styles.slideContent, isRTL && styles.rowReverse]}>
                    <View style={[styles.metricsRow, isRTL && styles.metricsRowRTL]}>
                      <View style={styles.metricBox}>
                        <Eye size={14} color="#7C3AED" />
                        <Text style={styles.metricLabel} numberOfLines={2}>
                          {t('views') || 'Views'}
                        </Text>
                        <Text style={styles.metricValue}>
                          {item.views >= 1000 ? `${(item.views / 1000).toFixed(1)}K` : item.views}
                        </Text>
                      </View>
                      <View style={styles.metricBox}>
                        <Target size={14} color="#7C3AED" />
                        <Text style={styles.metricLabel} numberOfLines={2}>
                          {t('conversions') || 'Conversions'}
                        </Text>
                        <Text style={styles.metricValue}>{item.leads}</Text>
                      </View>
                      <View style={styles.metricBox}>
                        <DollarSign size={14} color="#7C3AED" />
                        <Text style={styles.metricLabel} numberOfLines={2}>
                          {item.show_conversions
                            ? t('costPerConv') || 'Cost/Conv'
                            : t('costPer1KViews') || 'Cost/1K'}
                        </Text>
                        <Text style={[styles.metricValue, styles.metricValuePurple]}>
                          {item.show_conversions
                            ? `$${item.cost_per_conversion?.toFixed(2) || '0.00'}`
                            : item.views > 0
                            ? `$${((item.spend / item.views) * 1000).toFixed(2)}`
                            : '$0.00'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.thumbnailContainer}>
                      <View style={styles.thumbnailWrapContainer}>
                        <TouchableOpacity
                          style={styles.thumbnailWrap}
                          onPress={handleViewVideo}
                          activeOpacity={0.85}
                        >
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
                                { backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
                              ]}
                            >
                              <Trophy size={18} color="#9CA3AF" />
                            </View>
                          )}
                        </TouchableOpacity>
                        <View
                          style={[
                            styles.rankBadgeOverlay,
                            { backgroundColor: rankColors.bg },
                          ]}
                        >
                          <Trophy size={10} color={rankColors.text} />
                          <Text style={[styles.rankText, { color: rankColors.text }]}>
                            #{item.rank || 1}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              );
            }}
          />
        </View>

        <TouchableOpacity
          style={[styles.watchRow, isRTL && styles.rowReverse]}
          activeOpacity={0.8}
          onPress={async () => {
            const item = carouselData[currentIndex] || carouselData[0];
            if (!item) return;
            await openVideoForItem(item);
          }}
        >
          <Text style={styles.watchText}>{t('clickToWatch') || 'Click to watch'}</Text>
          <ArrowRight size={14} color="#7C3AED" style={iconTransformRTL()} />
        </TouchableOpacity>

        <View style={styles.dotsRow}>
          {carouselData.slice(0, 3).map((_, idx) => (
            <DotIndicator key={idx} index={idx} activeIndex={activeIndex} styles={styles} />
          ))}
        </View>
      </View>

      <View style={[styles.promoteCard, isRTL && styles.rowReverse]}>
        <Text style={[styles.promoteText, isRTL && styles.promoteTextRTL]}>{t('promoteLikeThis') || 'Promote Like This'}</Text>
        <TouchableOpacity
          style={[styles.promoteButton, isRTL && styles.rowReverse]}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Main' as never, { screen: 'CreateAd' } as never)}
        >
          <Text style={[styles.promoteButtonText, isRTL && styles.promoteTextRTL]}>{t('participate') || 'Participate'}</Text>
          <ArrowRight size={14} color={colors.primary.foreground} style={iconTransformRTL()} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const createStyles = (colors: any, isRTL: boolean, language: 'ckb' | 'ar') => {
  const fontRegular = getFontFamily(language, 'regular');
  const fontMedium = getFontFamily(language, 'medium');
  const fontSemiBold = getFontFamily(language, 'semibold');
  const numberSemiBold = getNumberFontFamily('semibold');
  const numberBold = getNumberFontFamily('bold');

  return StyleSheet.create({
    section: {
      marginHorizontal: 0,
      marginBottom: 16,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    sectionIcon: {
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor: 'rgba(124, 58, 237, 0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    sectionTitle: {
      fontSize: 14,
      color: '#111827',
      flex: 1,
      fontFamily: fontSemiBold,
      textAlign: 'left',
      writingDirection: 'rtl',
    },
    seeMore: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    seeMoreText: {
      fontSize: 12,
      color: '#7C3AED',
      fontFamily: fontMedium,
    },
    seeMoreTextRTL: {
      textAlign: 'right',
      writingDirection: 'rtl',
    },
    card: {
      borderRadius: 16,
      padding: 16,
      backgroundColor: colors.card.background,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      marginBottom: 12,
      overflow: 'hidden',
      paddingTop: 18,
      paddingBottom: 12,
    },
    carouselWrapper: {
      height: 132,
      justifyContent: 'center',
      overflow: 'hidden',
      width: '100%',
    },
    slideOuter: {
      flex: 1,
      width: '100%',
      maxWidth: '100%',
      borderRadius: 12,
      overflow: 'hidden',
      paddingHorizontal: 4,
    },
    slideContent: {
      flex: 1,
      width: '100%',
      maxWidth: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    rowReverse: {
      flexDirection: 'row-reverse',
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    rankBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: '#FACC15',
    },
    rankText: {
      color: '#111827',
      fontSize: 11,
      fontFamily: numberSemiBold,
    },
    cardContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    metricsRow: {
      flex: 1,
      flexDirection: 'row',
      gap: 6,
      marginEnd: 8,
      minWidth: 0,
    },
    metricsRowRTL: {
      marginEnd: 0,
      marginStart: 8,
    },
    metricBox: {
      flex: 1,
      backgroundColor: '#F3F4F6',
      borderRadius: 12,
      paddingVertical: 8,
      paddingHorizontal: 4,
      minHeight: 70,
      minWidth: 0,
      alignItems: 'center',
      gap: 2,
    },
    metricLabel: {
      fontSize: 9,
      color: '#111827',
      textAlign: 'center',
      lineHeight: 11,
      fontFamily: fontRegular,
    },
    metricValue: {
      fontSize: 13,
      color: '#111827',
      fontWeight: '700',
      fontFamily: numberBold,
    },
    metricValuePurple: {
      color: '#7C3AED',
      fontWeight: '700',
      fontFamily: numberBold,
    },
    thumbnailContainer: {
      width: 72,
      height: 72,
      minWidth: 72,
      maxWidth: 72,
      position: 'relative',
      flexShrink: 0,
    },
    thumbnailWrapContainer: {
      width: 72,
      height: 72,
      borderRadius: 12,
      overflow: 'hidden',
      position: 'relative',
    },
    thumbnailWrap: {
      width: 72,
      height: 72,
      borderRadius: 12,
      overflow: 'hidden',
    },
    thumbnail: {
      width: 72,
      height: 72,
      borderRadius: 12,
    },
    thumbnailPlaceholder: {
      backgroundColor: '#374151',
      alignItems: 'center',
      justifyContent: 'center',
    },
    thumbnailPlaceholderText: {
      marginTop: 4,
      fontSize: 9,
      color: '#E5E7EB',
      textAlign: 'center',
    },
    rankBadgeOverlay: {
      position: 'absolute',
      top: 4,
      end: 4,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 999,
      maxWidth: 36,
      overflow: 'hidden',
    },
    greenText: {
      color: '#22C55E',
    },
    watchRow: {
      marginTop: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    watchText: {
      fontSize: 12,
      color: '#7C3AED',
      fontFamily: fontMedium,
    },
    dotsRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 6,
      marginTop: 8,
      marginBottom: 0,
    },
    dot: {
      height: 8,
      borderRadius: 4,
    },
    dotActive: {
      width: 22,
      backgroundColor: '#7C3AED',
    },
    dotInactive: {
      width: 8,
      backgroundColor: 'rgba(161, 161, 170, 0.3)',
    },
    promoteCard: {
      borderRadius: 16,
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: colors.card.background,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    promoteText: {
      fontSize: 14,
      color: '#111827',
      fontFamily: fontSemiBold,
    },
    promoteTextRTL: {
      textAlign: 'right',
      writingDirection: 'rtl',
    },
    promoteButton: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 12,
      backgroundColor: '#7C3AED',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    promoteButtonText: {
      fontSize: 12,
      color: colors.primary.foreground,
      fontFamily: fontSemiBold,
    },
    rtlText: {
      textAlign: 'right',
    },
  });
};






