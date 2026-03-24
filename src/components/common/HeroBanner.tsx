import { Text } from '@/components/common/Text';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { getTranslation, type LocaleKey } from '@/i18n/translations';
import { safeQuery, supabase } from '@/integrations/supabase/client';
import { borderRadius, spacing } from '@/theme/spacing';
import { getFontFamily } from '@/utils/fonts';
import LinearGradient from 'react-native-linear-gradient';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Dimensions,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Slide {
  title_en: string;
  title_ckb: string;
  title_ar: string;
  subtitle_en: string;
  subtitle_ckb: string;
  subtitle_ar: string;
  tag_en: string;
  tag_ckb: string;
  tag_ar: string;
}

const DEFAULT_SLIDES: Slide[] = [
  {
    title_en: 'Advertise on TikTok Easily',
    title_ckb: 'ڕیکلام لە تیکتۆک بکە بە ئاسانی',
    title_ar: 'اعلن على TikTok بسهولة',
    subtitle_en: 'Create your first ad and reach millions of users',
    subtitle_ckb: 'یەکەم ڕیکلامت دروست بکە و بگە بە ملیۆنان',
    subtitle_ar: 'أنشئ إعلانك الأول ووصل إلى الملايين',
    tag_en: 'TikTok Ads',
    tag_ckb: 'ڕیکلامی تیکتۆک',
    tag_ar: 'إعلانات TikTok',
  },
  {
    title_en: 'Reach Millions',
    title_ckb: 'بگە بە ملیۆنان',
    title_ar: 'وصل إلى الملايين',
    subtitle_en: 'Target the right audience with powerful tools',
    subtitle_ckb: 'ئامانجی بینەری دروست بگرە بە ئامرازە بەهێزەکان',
    subtitle_ar: 'استهدف الجمهور المناسب بأدوات قوية',
    tag_en: 'Easy Setup',
    tag_ckb: 'دانانی ئاسان',
    tag_ar: 'إعداد سهل',
  },
  {
    title_en: 'Fast Results',
    title_ckb: 'ئەنجامێکی خێرا',
    title_ar: 'نتائج سريعة',
    subtitle_en: 'See your campaign performance in real-time',
    subtitle_ckb: 'کارکردنی هەمبەرەکەت ببینە بە شێوەی کاتی',
    subtitle_ar: 'شاهد أداء حملتك في الوقت الفعلي',
    tag_en: 'Fast Results',
    tag_ckb: 'ئەنجامێکی خێرا',
    tag_ar: 'نتائج سريعة',
  },
];

// Translation keys for 3 tags per slide (ckb/ar only - no English)
const SLIDE_TAG_KEYS: [string, string, string][] = [
  ['tagTikTokAds', 'tagEasySetup', 'tagFastResults'],
  ['tagReachMillions', 'tagTargetAudience', 'tagPowerfulTools'],
  ['tagRealtime', 'tagAnalytics', 'tagPerformance'],
];

const AUTO_ROTATE_INTERVAL = 5000; // 5 seconds

export const HeroBanner: React.FC = () => {
  const { colors, isDark } = useTheme();
  const { language, isRTL } = useLanguage();
  const fontFamily = getFontFamily(isRTL);
  const styles = createStyles(colors, fontFamily, isDark, isRTL);
  
  const [slides, setSlides] = useState<Slide[]>(DEFAULT_SLIDES);
  const [currentIndex, setCurrentIndex] = useState(0);
  const autoRotateTimer = useRef<NodeJS.Timeout | null>(null);

  const normalizeSlides = useCallback((incoming: any): Slide[] => {
    if (!Array.isArray(incoming) || incoming.length === 0) {
      return DEFAULT_SLIDES;
    }

    const hasText = (value: unknown) =>
      typeof value === 'string' && value.trim().length > 0;

    const hasValidContent = incoming.some((slide: Slide) =>
      hasText(slide?.title_en) ||
      hasText(slide?.title_ckb) ||
      hasText(slide?.title_ar) ||
      hasText(slide?.subtitle_en) ||
      hasText(slide?.subtitle_ckb) ||
      hasText(slide?.subtitle_ar)
    );

    return hasValidContent ? incoming : DEFAULT_SLIDES;
  }, []);

  useEffect(() => {
    // Load banner content
    loadBannerContent();
    
    // Set up real-time subscription
    if (!supabase) {
      return;
    }

    const channel = supabase
      .channel('app-settings-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'app_settings',
          filter: 'key=eq.global',
        },
        (payload) => {
          const v = (payload.new as any)?.value;
          if (v?.banners) {
            const banners = (v.banners as any[]).filter((b: any) => b.enabled !== false) ?? [];
            if (banners.length > 0) setSlides(normalizeSlides(banners));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (slides.length <= 1) {
      if (autoRotateTimer.current) {
        clearInterval(autoRotateTimer.current);
      }
      return;
    }

    if (autoRotateTimer.current) {
      clearInterval(autoRotateTimer.current);
    }

    autoRotateTimer.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, AUTO_ROTATE_INTERVAL);

    return () => {
      if (autoRotateTimer.current) {
        clearInterval(autoRotateTimer.current);
      }
    };
  }, [slides.length]);

  useEffect(() => {
    setCurrentIndex(0);
  }, [slides.length]);


  const loadBannerContent = async () => {
    try {
      const { data: globalData } = await safeQuery((client) =>
        client
          .from('app_settings')
          .select('value')
          .eq('key', 'global')
          .single()
      );
      const bannersFromGlobal = globalData?.value?.banners?.filter((b: any) => b.enabled !== false) ?? [];
      if (Array.isArray(bannersFromGlobal) && bannersFromGlobal.length > 0) {
        setSlides(normalizeSlides(bannersFromGlobal));
        return;
      }

      const { data } = await safeQuery((client) =>
        client
          .from('app_settings')
          .select('value')
          .eq('key', 'banner_content')
          .single()
      );
      setSlides(normalizeSlides(data?.value?.slides));
    } catch (error) {
      console.error('Failed to load banner content:', error);
      setSlides(DEFAULT_SLIDES);
    }
  };

  const getLocalizedText = (
    slide: Slide,
    fallbackSlide: Slide,
    field: 'title' | 'subtitle' | 'tag'
  ): string => {
    const lang = language || 'ckb';
    const key = `${field}_${lang}` as keyof Slide;
    const fallbackKey = `${field}_en` as keyof Slide;
    const pick = (value: unknown) =>
      typeof value === 'string' ? value.trim() : '';
    return (
      pick(slide?.[key]) ||
      pick(slide?.[fallbackKey]) ||
      pick(fallbackSlide?.[key]) ||
      pick(fallbackSlide?.[fallbackKey]) ||
      ''
    );
  };

  const safeIndex = Number.isFinite(currentIndex) ? currentIndex : 0;
  const currentSlide = slides[safeIndex] || DEFAULT_SLIDES[0];
  const fallbackSlide = DEFAULT_SLIDES[safeIndex] || DEFAULT_SLIDES[0];
  const tagKeys = SLIDE_TAG_KEYS[safeIndex] || SLIDE_TAG_KEYS[0];
  const locale: LocaleKey = (language === 'ar' ? 'ar' : 'ckb');
  const currentTags = tagKeys.map((key) => getTranslation(key, locale));

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#7C3AED', '#6366F1']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        {/* Slide content */}
        <View style={styles.content}>
          {/* Title */}
          <Text style={styles.title}>{getLocalizedText(currentSlide, fallbackSlide, 'title')}</Text>
          
          {/* Subtitle */}
          <Text style={styles.subtitle}>{getLocalizedText(currentSlide, fallbackSlide, 'subtitle')}</Text>

          {/* Tags Row - localized only (ckb/ar) */}
          <View style={styles.tagsRow}>
            {currentTags.map((tag, idx) => (
              <View key={idx} style={styles.tagContainer}>
                <Text style={[styles.tag, { textAlign: 'right', writingDirection: 'rtl' }]}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Bottom Center Indicators */}
        <View style={styles.indicators}>
          {slides.map((_, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => {
                setCurrentIndex(idx);
                if (autoRotateTimer.current) {
                  clearInterval(autoRotateTimer.current);
                }
                autoRotateTimer.current = setInterval(() => {
                  setCurrentIndex((prev) => (prev + 1) % slides.length);
                }, AUTO_ROTATE_INTERVAL);
              }}
            >
              <View
                style={[
                  styles.dot,
                  idx === currentIndex && styles.activeDot,
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>
    </View>
  );
};

const createStyles = (colors: any, fontFamily: string, isDark: boolean, isRTL?: boolean) =>
  StyleSheet.create({
    container: {
      marginHorizontal: spacing.md,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
      borderRadius: borderRadius.card,
      overflow: 'hidden',
      minHeight: 150,
      width: undefined,
    },
    gradient: {
      flex: 1,
      padding: spacing.md,
      borderRadius: borderRadius.card,
      justifyContent: 'center',
      minHeight: 150,
    },
    content: {
      alignItems: 'center',
      zIndex: 1,
      paddingBottom: 10,
      justifyContent: 'center',
      minHeight: 115,
    },
    contentRTL: {
      alignItems: 'flex-end',
    },
    title: {
      fontSize: 20,
      fontFamily: fontFamily === 'Rabar_021' ? 'Rabar_021' : 'Poppins-Bold',
      color: colors.primary.foreground,
      textAlign: 'right',
      writingDirection: 'rtl',
      marginBottom: 6,
      fontWeight: '700',
      lineHeight: 28,
    },
    subtitle: {
      fontSize: 14,
      fontFamily: fontFamily === 'Rabar_021' ? 'Rabar_021' : 'Poppins-Regular',
      color: colors.primary.foreground,
      textAlign: 'right',
      writingDirection: 'rtl',
      marginBottom: 12,
      opacity: 0.95,
      lineHeight: 20,
    },
    tagsRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
      marginTop: 4,
    },
    tagsRowRTL: {
      justifyContent: 'flex-end',
    },
    tagContainer: {
      backgroundColor: colors.overlay.light,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.overlay.medium,
    },
    tag: {
      fontSize: 10,
      fontFamily: fontFamily === 'Rabar_021' ? 'Rabar_021' : 'Poppins-SemiBold',
      color: colors.primary.foreground,
      fontWeight: '600',
    },
    indicators: {
      position: 'absolute',
      bottom: 8,
      start: 0,
      end: 0,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 6,
      zIndex: 10,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.overlay.medium,
    },
    activeDot: {
      width: 20,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.primary.foreground,
    },
  });
