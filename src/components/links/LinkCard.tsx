import { Text } from '@/components/common/Text';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing } from '@/theme/spacing';
import { iconTransformRTL } from '@/utils/rtl';
import { Image } from 'react-native';
import { ChevronLeft, Link2, RefreshCw } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, TouchableOpacity, View } from 'react-native';

interface LinkCardProps {
  id: string;
  title: string;
  slug: string;
  shareCode?: string | null;
  cta?: string | null;
  syncStatus?: 'pending' | 'synced' | 'failed' | null;
  avatarUrl?: string | null;
  onRetry?: () => void;
  onEdit: () => void;
  onDelete?: () => void;
}

const getCTALabel = (ctaValue?: string | null, language?: string): string | null => {
  if (!ctaValue) return null;

  const ctaLabels: Record<string, { ckb: string; ar: string }> = {
    CONTACT_US: { ckb: 'پەیوەندیمان پێوە بکە', ar: 'تواصل معنا' },
    SEND_MESSAGE: { ckb: 'پەیام بنێرە', ar: 'أرسل رسالة' },
    LEARN_MORE: { ckb: 'زیاتر بزانە', ar: 'اعرف المزيد' },
    VISIT_WEBSITE: { ckb: 'سەردانی وێبسایت بکە', ar: 'زيارة الموقع' },
  };

  const lang = language === 'ar' ? 'ar' : 'ckb';
  const labels = ctaLabels[ctaValue];
  if (!labels) return null;
  return labels[lang];
};

export const LinkCard: React.FC<LinkCardProps> = ({
  id,
  title,
  slug,
  shareCode,
  cta,
  syncStatus,
  avatarUrl,
  onRetry,
  onEdit,
  onDelete,
}) => {
  const { language, isRTL } = useLanguage();
  const { colors } = useTheme();
  const ctaLabel = getCTALabel(cta, language);
  const styles = createStyles(colors, isRTL);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [avatarUrl]);

  useEffect(() => {
    if (syncStatus === 'pending') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [syncStatus, pulseAnim]);

  const syncLabels = language === 'ar'
    ? { pending: 'قيد المعالجة', failed: 'فشل', synced: 'مُزامَن' }
    : { pending: 'چاوەڕوان', failed: 'سەرکەوتوو نەبوو', synced: 'کار دەکا' };
  const syncMeta =
    syncStatus === 'pending'
      ? { label: syncLabels.pending, style: styles.syncPending, textStyle: styles.syncPendingText }
      : syncStatus === 'failed'
      ? { label: syncLabels.failed, style: styles.syncFailed, textStyle: styles.syncFailedText }
      : syncStatus === 'synced'
      ? { label: syncLabels.synced, style: styles.syncSynced, textStyle: styles.syncSyncedText }
      : null;

  return (
    <TouchableOpacity
      onPress={onEdit}
      onLongPress={onDelete}
      style={styles.card}
      activeOpacity={0.7}
    >
      <View style={styles.container}>
        {/* Avatar (if provided) - React Native requires source={{ uri }} and explicit dimensions */}
        {avatarUrl && typeof avatarUrl === 'string' && avatarUrl.startsWith('https://') && !imageFailed ? (
          <Image
            source={{ uri: avatarUrl }}
            style={styles.avatar}
            resizeMode="cover"
            onError={() => setImageFailed(true)}
          />
        ) : avatarUrl && imageFailed ? (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarFallbackText} numberOfLines={1}>
              {(title || slug || 'U').charAt(0).toUpperCase()}
            </Text>
          </View>
        ) : null}
        {/* Arrow indicator */}
        <View style={styles.arrowContainer}>
          <ChevronLeft
            size={20}
            color={colors.foreground.muted}
            style={iconTransformRTL()}
          />
        </View>

        {/* Center: Content - link name + badge (centered like English) */}
        <View style={styles.contentContainer}>
          <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
            {title || slug || (language === 'ckb' ? 'لینک' : language === 'ar' ? 'رابط' : 'Link')}
          </Text>
          {syncMeta ? (
            <TouchableOpacity
              disabled={syncStatus !== 'failed' || !onRetry}
              onPress={onRetry}
              style={[styles.syncBadge, syncMeta.style]}
              activeOpacity={0.7}
            >
              <View style={styles.syncBadgeContent}>
                {syncStatus === 'pending' ? (
                  <Animated.View
                    style={[
                      styles.syncDot,
                      styles.syncDotPending,
                      { transform: [{ scale: pulseAnim }], opacity: pulseAnim },
                    ]}
                  />
                ) : (
                  <View
                    style={[
                      styles.syncDot,
                      syncStatus === 'failed' ? styles.syncDotFailed : styles.syncDotSynced,
                    ]}
                  />
                )}
                <Text style={[styles.syncBadgeText, syncMeta.textStyle]} numberOfLines={1}>
                  {syncMeta.label}
                </Text>
                {syncStatus === 'failed' && <RefreshCw size={12} color={styles.syncFailedText.color} />}
              </View>
            </TouchableOpacity>
          ) : null}
          {ctaLabel ? (
            <View style={styles.ctaBadge}>
              <Text style={styles.ctaBadgeText} numberOfLines={1}>
                {ctaLabel}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Right: Icon */}
        <View style={styles.iconContainer}>
          <Link2 size={20} color={colors.foreground.muted} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const createStyles = (colors: any, isRTL?: boolean) => StyleSheet.create({
  card: {
    backgroundColor: colors.card.background,
    borderRadius: 20,
    paddingVertical: 18,
    paddingStart: 16,
    paddingEnd: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    overflow: 'hidden',
    width: '100%',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    maxWidth: '100%',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginEnd: spacing.sm,
  },
  avatarFallback: {
    backgroundColor: colors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFallbackText: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.foreground.muted,
  },
  arrowContainer: {
    justifyContent: 'center',
    flexShrink: 0,
  },
  contentContainer: {
    flex: 1,
    minWidth: 0,
    maxWidth: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.foreground.DEFAULT,
    marginBottom: 4,
    minHeight: 20,
    maxWidth: '100%',
    textAlign: (isRTL ? 'right' : 'left') as 'left' | 'right',
  },
  slug: {
    fontSize: 13,
    color: '#7C3AED',
    marginBottom: 4,
  },
  ctaBadge: {
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  syncBadge: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  syncBadgeContent: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 6,
  },
  syncDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
  },
  syncDotPending: {
    backgroundColor: '#F59E0B',
  },
  syncDotSynced: {
    backgroundColor: '#10B981',
  },
  syncDotFailed: {
    backgroundColor: '#EF4444',
  },
  syncBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  syncPending: {
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
  },
  syncPendingText: {
    color: '#F59E0B',
  },
  syncSynced: {
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
  },
  syncSyncedText: {
    color: '#10B981',
  },
  syncFailed: {
    backgroundColor: 'rgba(239, 68, 68, 0.18)',
  },
  syncFailedText: {
    color: '#EF4444',
  },
  ctaBadgeText: {
    fontSize: 12,
    color: colors.primary.DEFAULT,
    fontWeight: '500',
  },
  iconContainer: {
    width: 40,
    height: 40,
    minWidth: 40,
    borderRadius: 20,
    backgroundColor: colors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
});

export default LinkCard;
