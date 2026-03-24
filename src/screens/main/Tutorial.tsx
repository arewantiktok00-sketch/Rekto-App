import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  Linking,
  Alert,
  Image,
  Animated,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase, safeQuery } from '@/integrations/supabase/client';
import { Play, BookOpen } from 'lucide-react-native';
import LinearGradient from 'react-native-linear-gradient';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, borderRadius } from '@/theme/spacing';
import { getTypographyStyles } from '@/theme/typography';
import { Text } from '@/components/common/Text';

const REKTO_PURPLE_START = '#7C3AED';
const REKTO_PURPLE_END = '#9333EA';

interface Tutorial {
  id: string;
  title_en: string;
  title_ckb?: string | null;
  title_ar?: string | null;
  description_en: string;
  description_ckb?: string | null;
  description_ar?: string | null;
  video_url: string;
  display_order: number;
  thumbnail_url?: string | null;
}

/**
 * Extract YouTube video ID from common URL formats and return thumbnail URL.
 * Supports: youtube.com/watch?v=, youtu.be/, youtube.com/shorts/
 * Returns maxresdefault.jpg; falls back to hqdefault.jpg.
 */
export function getYoutubeThumbnail(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  let videoId: string | null = null;

  // youtube.com/watch?v=VIDEO_ID
  const watchMatch = trimmed.match(/(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/);
  if (watchMatch) videoId = watchMatch[1];

  // youtu.be/VIDEO_ID
  if (!videoId) {
    const shortMatch = trimmed.match(/(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (shortMatch) videoId = shortMatch[1];
  }

  // youtube.com/shorts/VIDEO_ID
  if (!videoId) {
    const shortsMatch = trimmed.match(/(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
    if (shortsMatch) videoId = shortsMatch[1];
  }

  if (!videoId) return null;
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

/** Fallback thumbnail (e.g. when maxresdefault 404). */
export function getYoutubeThumbnailFallback(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  let videoId: string | null = null;
  const watchMatch = trimmed.match(/(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/);
  if (watchMatch) videoId = watchMatch[1];
  if (!videoId) {
    const shortMatch = trimmed.match(/(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (shortMatch) videoId = shortMatch[1];
  }
  if (!videoId) {
    const shortsMatch = trimmed.match(/(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
    if (shortsMatch) videoId = shortsMatch[1];
  }
  if (!videoId) return null;
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

const normalizeVideoUrl = (url: string): string => {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return `https://${trimmed}`;
  }
  return trimmed;
};

function TutorialCard({
  title,
  description,
  thumbnailUri,
  thumbnailFallbackUri,
  watchLabel,
  onPress,
  onWatchPress,
  isRTL,
  styles: cardStyles,
}: {
  title: string;
  description: string;
  thumbnailUri: string | null;
  thumbnailFallbackUri?: string | null;
  watchLabel: string;
  onPress: () => void;
  onWatchPress: () => void;
  isRTL: boolean;
  styles: ReturnType<typeof createStyles>;
}) {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const [currentThumbUri, setCurrentThumbUri] = React.useState<string | null>(thumbnailUri);
  React.useEffect(() => {
    setCurrentThumbUri(thumbnailUri);
  }, [thumbnailUri]);
  const handleThumbError = () => {
    if (thumbnailFallbackUri && currentThumbUri === thumbnailUri) setCurrentThumbUri(thumbnailFallbackUri);
  };

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={({ pressed }) => [pressed && { opacity: 0.98 }]}
    >
      <Animated.View style={[cardStyles.card, isRTL && cardStyles.cardRTL, { transform: [{ scale: scaleAnim }] }]}>
        {/* Thumbnail */}
        <View style={cardStyles.thumbnailWrap}>
          {currentThumbUri ? (
            <Image
              source={{ uri: currentThumbUri }}
              style={cardStyles.thumbnail}
              resizeMode="cover"
              onError={handleThumbError}
            />
          ) : (
            <View style={cardStyles.thumbnailPlaceholder} />
          )}
          <View style={cardStyles.playOverlay}>
            <View style={cardStyles.playCircle}>
              <Play size={28} color={REKTO_PURPLE_START} fill={REKTO_PURPLE_START} />
            </View>
          </View>
        </View>

        {/* Title */}
        <Text style={[cardStyles.cardTitle, isRTL && cardStyles.textRTL]} numberOfLines={2} ellipsizeMode="tail">
          {title}
        </Text>
        {/* Description */}
        <Text style={[cardStyles.cardDescription, isRTL && cardStyles.textRTL]} numberOfLines={2} ellipsizeMode="tail">
          {description}
        </Text>
        {/* Watch Now button */}
        <Pressable onPress={onWatchPress} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
          <LinearGradient
            colors={[REKTO_PURPLE_START, REKTO_PURPLE_END]}
            style={cardStyles.watchButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={cardStyles.watchButtonText}>{watchLabel}</Text>
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </Pressable>
  );
}

export function Tutorial() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { t, language, isRTL } = useLanguage();
  const { colors } = useTheme();
  const typography = getTypographyStyles(language as 'ckb' | 'ar');
  const styles = createStyles(colors, insets, typography, isRTL);
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);

  const fetchTutorials = useCallback(async () => {
    try {
      const { data, error } = await safeQuery((client) =>
        client
          .from('tutorials')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true })
      );

      if (error) throw error;
      setTutorials(data || []);
    } catch (error: any) {
      console.error('Error fetching tutorials:', error);
      setTutorials([]);
    }
  }, []);

  useEffect(() => {
    fetchTutorials();
  }, [fetchTutorials]);

  useFocusEffect(
    useCallback(() => {
      fetchTutorials();
      return () => {};
    }, [fetchTutorials])
  );

  useEffect(() => {
    if (!supabase) return;
    const channel = supabase
      .channel('tutorials-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tutorials' }, () => fetchTutorials())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [fetchTutorials]);

  // Auto-refresh tutorials every 3 min when screen is mounted
  useEffect(() => {
    const interval = setInterval(fetchTutorials, 180000);
    return () => clearInterval(interval);
  }, [fetchTutorials]);

  const handleTutorialPress = async (tutorial: Tutorial) => {
    const normalizedUrl = normalizeVideoUrl(tutorial.video_url);
    if (!normalizedUrl) {
      Alert.alert(t('error') || 'Error', t('noVideoUrl') || 'No video URL available for this tutorial');
      return;
    }
    try {
      await Linking.openURL(normalizedUrl);
    } catch (error: any) {
      const httpsUrl = normalizedUrl.startsWith('http') ? normalizedUrl : `https://${normalizedUrl}`;
      try {
        await Linking.openURL(httpsUrl);
      } catch {
        Alert.alert(t('error') || 'Error', t('failedToOpenVideo') || 'Failed to open video. Please try again.');
      }
    }
  };

  const getThumbnailUris = (item: Tutorial): { primary: string | null; fallback: string | null } => {
    const manual = item.thumbnail_url && item.thumbnail_url.trim() ? item.thumbnail_url.trim() : null;
    if (manual) return { primary: manual, fallback: null };
    const url = normalizeVideoUrl(item.video_url);
    const primary = getYoutubeThumbnail(url);
    const fallback = getYoutubeThumbnailFallback(url);
    return { primary: primary || fallback, fallback: primary ? fallback : null };
  };

  const watchLabel = t('watchNow') || 'Watch Now';

  const renderItem = useCallback(
    ({ item }: { item: Tutorial }) => {
      const title =
        language === 'ckb' && item.title_ckb
          ? item.title_ckb
          : language === 'ar' && item.title_ar
          ? item.title_ar
          : item.title_en;
      const description =
        language === 'ckb' && item.description_ckb
          ? item.description_ckb
          : language === 'ar' && item.description_ar
          ? item.description_ar
          : item.description_en;
      const { primary: thumbnailUri, fallback: thumbnailFallbackUri } = getThumbnailUris(item);
      return (
        <TutorialCard
          title={title}
          description={description}
          thumbnailUri={thumbnailUri}
          thumbnailFallbackUri={thumbnailFallbackUri}
          watchLabel={watchLabel}
          onPress={() => handleTutorialPress(item)}
          onWatchPress={() => handleTutorialPress(item)}
          isRTL={isRTL}
          styles={styles}
        />
      );
    },
    [language, isRTL, styles, watchLabel]
  );

  const keyExtractor = (item: Tutorial) => item.id;

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t('tutorials') || t('tutorial') || 'Tutorials'}
        onBack={() => navigation.goBack()}
        style={{ paddingTop: insets.top + 16 }}
      />

      {tutorials.length === 0 ? (
        <View style={styles.emptyState}>
          <BookOpen size={64} color={colors.foreground.muted} />
          <Text style={[styles.emptyTitle, isRTL && styles.textRTL]}>{t('noTutorialsYet') || 'No Tutorials Yet'}</Text>
          <Text style={[styles.emptySubtitle, isRTL && styles.textRTL]}>{t('tutorialsComingSoon') || 'Tutorials coming soon'}</Text>
        </View>
      ) : (
        <FlatList
          data={tutorials || []}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const createStyles = (colors: any, insets: any, typography: any, isRTL?: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.DEFAULT,
    },
    textRTL: {
      textAlign: 'right',
      writingDirection: 'rtl',
    },
    listContent: {
      paddingHorizontal: 16,
      paddingTop: spacing.md,
      paddingBottom: Math.max(40, insets.bottom + 100),
    },
    card: {
      backgroundColor: colors.card.background,
      borderRadius: 22,
      marginBottom: spacing.lg,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
      flexDirection: isRTL ? 'column' : 'column',
    },
    cardRTL: {
      // RTL: keep column; text alignment handled by textRTL
    },
    thumbnailWrap: {
      width: '100%',
      height: 180,
      position: 'relative',
    },
    thumbnail: {
      width: '100%',
      height: '100%',
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
    },
    thumbnailPlaceholder: {
      width: '100%',
      height: '100%',
      backgroundColor: colors.background.secondary,
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
    },
    playOverlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
    },
    playCircle: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: 'rgba(255,255,255,0.95)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    cardTitle: {
      ...typography.h3,
      fontSize: 20,
      fontWeight: '700',
      marginTop: 14,
      paddingHorizontal: spacing.md,
      color: colors.foreground.DEFAULT,
      textAlign: isRTL ? 'right' : 'left',
      writingDirection: isRTL ? 'rtl' : 'ltr',
    },
    cardDescription: {
      fontSize: 14,
      color: colors.foreground.muted,
      marginTop: 6,
      paddingHorizontal: spacing.md,
      lineHeight: 20,
      textAlign: isRTL ? 'right' : 'left',
      writingDirection: isRTL ? 'rtl' : 'ltr',
    },
    watchButton: {
      alignSelf: 'stretch',
      width: '100%',
      height: 44,
      borderRadius: 14,
      marginTop: spacing.md,
      marginBottom: spacing.md,
      justifyContent: 'center',
      alignItems: 'center',
    },
    watchButtonText: {
      ...typography.label,
      color: colors.primary.foreground,
      fontSize: 16,
      fontWeight: '600',
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xl,
    },
    emptyTitle: {
      ...typography.h2,
      fontSize: 20,
      color: colors.foreground.DEFAULT,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
    },
    emptySubtitle: {
      ...typography.bodySmall,
      fontSize: 14,
      color: colors.foreground.muted,
      textAlign: 'right',
      writingDirection: 'rtl',
    },
  });
