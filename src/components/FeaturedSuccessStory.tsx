import { Text } from '@/components/common/Text';
import { TikTokIcon } from '@/components/icons/TikTokIcon';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/integrations/supabase/client';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Trophy } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { Image } from 'react-native';
import { Linking, StyleSheet, TouchableOpacity, View } from 'react-native';

interface FeaturedCampaign {
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
}

const translations = {
  en: {
    topResult: 'Top Result This Week',
    spent: 'Spent',
    views: 'Views',
    costPer1K: 'Cost/1K',
    conversions: 'Conv.',
    costPerConv: 'Cost/Conv',
    ctaButton: 'Grow Your Business Like This',
    business: "'s Business",
    watchVideo: 'Watch',
  },
  ckb: {
    topResult: 'باشترین ئەنجامی ئەم هەفتەیە',
    spent: 'خەرج کراوە',
    views: 'بینین',
    costPer1K: 'تێچوو/١ک',
    conversions: 'گۆڕین',
    costPerConv: 'تێچوو/گۆڕین',
    ctaButton: 'بزنسەکەت وەک ئەمە گەورە بکە',
    business: ' بزنس',
    watchVideo: 'بینین',
  },
  ar: {
    topResult: 'أفضل نتيجة هذا الأسبوع',
    spent: 'المنفق',
    views: 'المشاهدات',
    costPer1K: 'التكلفة/١ك',
    conversions: 'تحويل',
    costPerConv: 'تكلفة/تحويل',
    ctaButton: 'نمّي عملك مثل هذا',
    business: ' عمل',
    watchVideo: 'شاهد',
  },
};

export const FeaturedSuccessStory: React.FC = () => {
  const navigation = useNavigation();
  const { language } = useLanguage();
  const { colors } = useTheme();
  const [campaign, setCampaign] = useState<FeaturedCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEnabled, setIsEnabled] = useState(true);
  const [thumbnailLoadError, setThumbnailLoadError] = useState(false);

  const t = translations[language as keyof typeof translations] || translations.en;
  const isRTL = language === 'ckb' || language === 'ar';
  const styles = createStyles(colors);

  const isValidThumbnail = (url?: string | null) =>
    !!url && url.startsWith('https://') && !url.includes('tiktokcdn.com');

  const isValidTikTokUrl = (url?: string | null) =>
    typeof url === 'string' && url.includes('/@');

  const resolveLegacyVideoUrl = async (campaignId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('tiktok-video-info', {
        body: { campaignId },
      });
      if (error) {
        if (__DEV__) {
          console.warn('[FeaturedSuccessStory] Legacy video fetch failed:', error.message);
        }
        return null;
      }
      return data?.videoInfo?.tiktokUrl || data?.tiktokUrl || null;
    } catch (err) {
      if (__DEV__) {
        console.warn('[FeaturedSuccessStory] Legacy video fetch error:', err);
      }
      return null;
    }
  };

  const fetchFeatured = useCallback(async () => {
    try {
      setLoading(true);
      console.log('[FeaturedSuccessStory] Fetching featured campaign...');
      const { data, error } = await supabase.functions.invoke('featured-campaign', {
        body: { action: 'get' },
      });
      console.log('[FeaturedSuccessStory] Response:', { data, error });
      if (!error) {
        const incoming = data?.campaign ?? null;
        setCampaign(incoming);
      } else {
        setCampaign(null);
      }
    } catch (err) {
      console.error('[FeaturedSuccessStory] Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchGlobalSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('app-settings', {
        body: { action: 'get', key: 'global' },
      });

      if (!error && data?.settings?.value?.features) {
        const enabled =
          data.settings.value.features.featured_story_enabled ?? true;
        setIsEnabled(enabled);
      }
    } catch (err) {
      // Keep previous enabled state if fetch fails
    }
  }, []);

  useEffect(() => {
    fetchFeatured();
    fetchGlobalSettings();

    const featuredChannel = supabase
      .channel('rn-featured-campaign')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'app_settings',
          filter: 'key=eq.featured_campaign_id',
        },
        () => fetchFeatured()
      )
      .subscribe();

    const globalChannel = supabase
      .channel('rn-featured-toggle')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'app_settings',
          filter: 'key=eq.global',
        },
        (payload) => {
          if (payload.new && 'value' in payload.new) {
            const settings = payload.new.value as {
              features?: { featured_story_enabled?: boolean };
            };
            const enabled = settings?.features?.featured_story_enabled ?? true;
            setIsEnabled(enabled);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(featuredChannel);
      supabase.removeChannel(globalChannel);
    };
  }, [fetchFeatured, fetchGlobalSettings]);

  useEffect(() => {
    setThumbnailLoadError(false);
  }, [campaign?.id]);

  useEffect(() => {
    if (__DEV__) {
      console.log('[FeaturedSuccessStory] State:', { isEnabled, loading, hasCampaign: !!campaign });
    }
  }, [isEnabled, loading, campaign]);

  useFocusEffect(
    useCallback(() => {
      fetchFeatured();
    }, [fetchFeatured])
  );

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  if (!isEnabled || loading || !campaign) return null;

  const costPer1K =
    campaign.views > 0 ? ((campaign.spend / campaign.views) * 1000).toFixed(2) : '0.00';

  const thumbnailUrl = campaign.thumbnail_url || null;
  const isThumbnailValid = isValidThumbnail(thumbnailUrl);
  const showThumbnail = isThumbnailValid && !thumbnailLoadError;

  return (
    <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="trophy" size={16} color="#7C3AED" />
          </View>
          <Text style={[styles.headerText, isRTL && styles.rtlText]}>{t.topResult}</Text>
          <Ionicons name="sparkles" size={16} color="#EAB308" />
        </View>

        <View style={styles.content}>
          <TouchableOpacity
            onPress={async () => {
              const publicUrl = (campaign as any).tiktok_public_url as string | null;
              const directUrl = (campaign as any).video_url as string | null;
              let url = isValidTikTokUrl(publicUrl) ? publicUrl : null;
              if (!url && isValidTikTokUrl(directUrl)) {
                url = directUrl;
              }
              if (!url && campaign?.id) {
                url = await resolveLegacyVideoUrl(campaign.id);
              }
              if (url) {
                Linking.openURL(url);
              }
            }}
            style={styles.thumbnailContainer}
            activeOpacity={0.8}
          >
            {showThumbnail && thumbnailUrl ? (
              <Image source={{ uri: thumbnailUrl }} style={styles.thumbnail} resizeMode="cover" onError={() => setThumbnailLoadError(true)} />
            ) : (
              <View
                style={[
                  styles.thumbnail,
                  styles.placeholderThumb,
                  { backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
                ]}
              >
                <Trophy size={24} color="#9CA3AF" />
              </View>
            )}
            <View style={styles.playOverlay}>
              <View style={styles.playButton}>
                <Ionicons name="play" size={14} color="#000" style={{ marginStart: 2 }} />
              </View>
            </View>
            <View style={styles.trendingBadge}>
              <Ionicons name="trending-up" size={10} color="#fff" />
            </View>
          </TouchableOpacity>

          <View style={styles.info}>
            <Text style={[styles.businessName, isRTL && styles.rtlText]} numberOfLines={1}>
              {campaign.user_name}
              {t.business}
            </Text>

            <View style={styles.metricsRow}>
              <View style={styles.metric}>
                <Text style={[styles.metricLabel, isRTL && styles.rtlText]}>{t.spent}</Text>
                <View style={styles.metricValue}>
                  <Ionicons name="logo-usd" size={10} color={colors.success} />
                  <Text style={styles.metricNumber}>{campaign.spend?.toFixed(0)}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.metric}>
                <Text style={[styles.metricLabel, isRTL && styles.rtlText]}>{t.views}</Text>
                <View style={styles.metricValue}>
                  <Ionicons name="eye" size={10} color={colors.primary.DEFAULT} />
                  <Text style={styles.metricNumber}>{formatNumber(campaign.views)}</Text>
                </View>
              </View>

              {campaign.show_conversions ? (
                <>
                  <View style={styles.divider} />
                  <View style={styles.metric}>
                    <Text style={[styles.metricLabel, isRTL && styles.rtlText]}>{t.conversions}</Text>
                    <View style={styles.metricValue}>
                      <Ionicons name="trending-up" size={10} color={colors.success} />
                      <Text style={styles.metricNumber}>{formatNumber(campaign.leads)}</Text>
                    </View>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.metric}>
                    <Text style={[styles.metricLabel, isRTL && styles.rtlText]}>{t.costPerConv}</Text>
                    <Text style={[styles.metricNumber, styles.greenText]}>
                      ${campaign.cost_per_conversion?.toFixed(2) || '0.00'}
                    </Text>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.divider} />
                  <View style={styles.metric}>
                    <Text style={[styles.metricLabel, isRTL && styles.rtlText]}>{t.costPer1K}</Text>
                    <Text style={[styles.metricNumber, styles.greenText]}>${costPer1K}</Text>
                  </View>
                </>
              )}
            </View>
          </View>
        </View>

        <View style={styles.buttonsRow}>
          {(isValidTikTokUrl((campaign as any).tiktok_public_url) || !!(campaign as any).video_url) ? (
            <TouchableOpacity
              style={styles.watchButton}
              onPress={async () => {
                const publicUrl = (campaign as any).tiktok_public_url as string | null;
                const directUrl = (campaign as any).video_url as string | null;
                let url = isValidTikTokUrl(publicUrl) ? publicUrl : null;
                if (!url && isValidTikTokUrl(directUrl)) {
                  url = directUrl;
                }
                if (!url && campaign?.id) {
                  url = await resolveLegacyVideoUrl(campaign.id);
                }
                if (url) {
                  Linking.openURL(url);
                }
              }}
            >
              <TikTokIcon size={14} color={colors.primary.foreground} />
              <Text style={[styles.watchButtonText, isRTL && styles.rtlText]}>{t.watchVideo}</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => navigation.navigate('CreateAd' as never)}
          >
            <Ionicons name="sparkles" size={14} color={colors.primary.foreground} />
            <Text style={[styles.ctaButtonText, isRTL && styles.rtlText]}>{t.ctaButton}</Text>
            <Ionicons
              name={isRTL ? 'arrow-back' : 'arrow-forward'}
              size={14}
              color={colors.primary.foreground}
            />
          </TouchableOpacity>
        </View>
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    backgroundColor: colors.card.background,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.3)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  headerIcon: {
    padding: 6,
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    borderRadius: 8,
  },
  headerText: {
    fontSize: 13,
    color: colors.primary.DEFAULT,
    flex: 1,
  },
  rtlText: {
    textAlign: 'right',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  thumbnailContainer: { position: 'relative' },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(124, 58, 237, 0.3)',
  },
  placeholderThumb: {
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    marginTop: 4,
    fontSize: 9,
    color: colors.foreground.muted,
    textAlign: 'center',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay.medium,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.card.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendingBadge: {
    position: 'absolute',
    bottom: -4,
    end: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  businessName: {
    fontSize: 14,
    color: colors.foreground.DEFAULT,
    marginBottom: 8,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metric: { alignItems: 'center' },
  metricLabel: {
    fontSize: 10,
    color: colors.foreground.muted,
  },
  metricValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  metricNumber: {
    fontSize: 12,
    color: colors.foreground.DEFAULT,
  },
  greenText: {
    color: colors.success,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: colors.overlay.light,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  watchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.3)',
    backgroundColor: 'transparent',
  },
  watchButtonText: {
    fontSize: 12,
    color: colors.foreground.DEFAULT,
  },
  ctaButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#7C3AED',
  },
  ctaButtonText: {
    fontSize: 12,
    color: '#fff',
  },
});

