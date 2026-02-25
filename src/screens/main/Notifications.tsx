import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase, supabaseRead } from '@/integrations/supabase/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getGlobalCache, setNotificationsCache, getCached, setCached } from '@/services/globalCache';
import {
  Bell,
  Check,
  BellOff,
  CheckCheck,
  Gift,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Info,
  Megaphone,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { getFontFamily } from '@/utils/getFontFamily';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { spacing, borderRadius } from '@/theme/spacing';
import { format, formatDistanceToNow } from 'date-fns';
import { NotificationDetailModal } from '@/components/common/NotificationDetailModal';
import { ExpiredOfferModal } from '@/components/common/ExpiredOfferModal';
import { Text } from '@/components/common/Text';
import { Swipeable } from 'react-native-gesture-handler';
import { isRTL, rtlText, rtlRow } from '@/utils/rtl';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info' | 'admin' | 'discount';
  is_read: boolean;
  created_at: string;
  campaign_id?: string;
}

const CACHE_KEY = 'notifications_cache';

export function Notifications() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const rtl = isRTL(language);
  const { colors, isDark } = useTheme();

  const fontFamily = getFontFamily(language as 'ckb' | 'ar', 'regular');
  const fontFamilyMedium = getFontFamily(language as 'ckb' | 'ar', 'medium');
  const fontFamilySemiBold = getFontFamily(language as 'ckb' | 'ar', 'semibold');
  const fontFamilyBold = getFontFamily(language as 'ckb' | 'ar', 'bold');
  const styles = createStyles(colors, isDark, fontFamily, fontFamilyMedium, fontFamilySemiBold, fontFamilyBold, rtl);
  const [notifications, setNotifications] = useState<Notification[]>(() =>
    getCached<Notification[]>('notifications', getGlobalCache().notifications || [])
  );
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showExpiredOffer, setShowExpiredOffer] = useState(false);

  useEffect(() => {
    if (!user) return;
    const loadCached = async () => {
      try {
        const cached = await AsyncStorage.getItem(`${CACHE_KEY}_${user.id}`);
        if (!cached) return;
        const parsed = JSON.parse(cached);
        if (parsed?.data) {
          setNotifications(parsed.data);
        }
      } catch {
        // Ignore cache errors
      }
    };

    loadCached();
    fetchNotifications();
  }, [user]);

  useEffect(() => {
    if (user) {
      const channel = supabaseRead
        .channel(`user-notifications-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            if (payload.eventType === 'INSERT' && payload.new) {
              const updated = [payload.new as Notification, ...notifications];
              const deduped = dedupeNotifications(updated);
              setNotifications(deduped);
              setNotificationsCache(deduped);
              setCached('notifications', deduped);
              return;
            }
            fetchNotifications();
          }
        )
        .subscribe();

      return () => {
      supabaseRead.removeChannel(channel);
      };
    }
  }, [user]);

  const dedupeNotifications = (items: Notification[]) => {
    const latestByKey = new Map<string, Notification>();
    items.forEach((notif) => {
      const key = `${notif.campaign_id || 'global'}-${notif.title}`;
      const existing = latestByKey.get(key);
      if (!existing) {
        latestByKey.set(key, notif);
        return;
      }
      const existingTime = new Date(existing.created_at).getTime();
      const currentTime = new Date(notif.created_at).getTime();
      if (currentTime > existingTime) {
        latestByKey.set(key, notif);
      }
    });
    return Array.from(latestByKey.values()).sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  };

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabaseRead
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      if (data) {
        const deduped = dedupeNotifications(data);
        setNotifications(deduped);
        setNotificationsCache(deduped);
        setCached('notifications', deduped);
        await AsyncStorage.setItem(
          `${CACHE_KEY}_${user.id}`,
          JSON.stringify({ data: deduped, timestamp: Date.now() })
        );
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      // No loading UI
    }
  };
  const isPromoNotification = (notification: Notification) => {
    const title = (notification.title && String(notification.title)) || '';
    const message = (notification.message && String(notification.message)) || '';
    const titleLower = title.toLowerCase();
    const messageLower = message.toLowerCase();
    return (
      notification.type === 'admin' ||
      notification.type === 'discount' ||
      titleLower.includes('discount') ||
      titleLower.includes('offer') ||
      titleLower.includes('promo') ||
      messageLower.includes('discount') ||
      messageLower.includes('offer') ||
      messageLower.includes('promo') ||
      messageLower.includes('خەسم') ||
      messageLower.includes('داشکان') ||
      titleLower.includes('ئۆفەر') ||
      titleLower.includes('عرض')
    );
  };

  const checkPromoActive = async () => {
    try {
      const { data } = await supabase.functions.invoke('owner-content', {
        body: { action: 'getActivePromo' },
      });
      return Boolean(data?.active && data?.banner?.enabled);
    } catch (error) {
      console.warn('[Notifications] Failed to check promo status:', error);
      return false;
    }
  };

  const handleNotificationPress = useCallback(
    async (notification: Notification) => {
      if (!notification.is_read) {
        markAsRead(notification.id);
      }

      if (isPromoNotification(notification)) {
        const isActive = await checkPromoActive();
        if (!isActive) {
          setShowExpiredOffer(true);
          return;
        }
      }

      setSelectedNotification(notification);
      setShowDetailModal(true);
    },
    []
  );

  const handleDismiss = useCallback(
    async (id: string) => {
      try {
        await supabaseRead.from('notifications').delete().eq('id', id);
      } catch (error) {
        console.warn('[Notifications] Failed to delete notification:', error);
      }
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setNotificationsCache(notifications.filter((n) => n.id !== id));
    },
    [notifications]
  );

  const getIconBackground = (type: string) => {
    switch (type) {
      case 'success':
        return 'rgba(34, 197, 94, 0.2)';
      case 'error':
        return 'rgba(239, 68, 68, 0.2)';
      case 'warning':
        return 'rgba(234, 179, 8, 0.2)';
      case 'admin':
      case 'discount':
        return 'rgba(168, 85, 247, 0.2)';
      default:
        return 'rgba(59, 130, 246, 0.2)';
    }
  };

  const PulseDot = () => {
    const anim = useRef(new Animated.Value(0.6)).current;
    useEffect(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: 700, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.6, duration: 700, useNativeDriver: true }),
        ])
      ).start();
    }, [anim]);
    return (
      <Animated.View style={[styles.unreadDot, { opacity: anim, transform: [{ scale: anim }] }]} />
    );
  };

  const renderRightActions = () => (
    <View style={styles.deleteAction}>
      <Text style={styles.deleteActionText}>{t('delete') || 'Delete'}</Text>
    </View>
  );

  const sanitizeNotificationText = (value: string, fallback: string) => {
    // Display text as-is - backend should send correct language
    return value || fallback;
  };

  /** Fix erroneous ".review" / ". is" etc. in server messages (leading dot after space). */
  const sanitizeNotificationMessage = (msg: string) => {
    if (!msg || typeof msg !== 'string') return msg;
    return msg.replace(/\s+\.(\w)/g, ' $1').trim();
  };

  const formatRelativeTime = (date: Date) => {
    if (language === 'en') {
      return formatDistanceToNow(date, { addSuffix: true });
    }
    const diffMs = Date.now() - date.getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) {
      return language === 'ckb' ? 'ئێستا' : 'الآن';
    }
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);
    if (years > 0) {
      return language === 'ckb' ? `${years} ساڵ پێش` : `منذ ${years} سنة`;
    }
    if (months > 0) {
      return language === 'ckb' ? `${months} مانگ پێش` : `منذ ${months} شهر`;
    }
    if (weeks > 0) {
      return language === 'ckb' ? `${weeks} هەفتە پێش` : `منذ ${weeks} أسبوع`;
    }
    if (days > 0) {
      return language === 'ckb' ? `${days} ڕۆژ پێش` : `منذ ${days} يوم`;
    }
    if (hours > 0) {
      return language === 'ckb' ? `${hours} کاتژمێر پێش` : `منذ ${hours} ساعة`;
    }
    return language === 'ckb' ? `${minutes} خولەک پێش` : `منذ ${minutes} دقيقة`;
  };

  const markAsRead = async (id: string) => {
    try {
      await supabaseRead
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);
      fetchNotifications();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };


  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success':
        return '#22C55E';
      case 'error':
        return '#EF4444';
      case 'warning':
        return '#EAB308';
      case 'admin':
      case 'discount':
        return '#A855F7';
      default:
        return '#3B82F6';
    }
  };

  const getIcon = (notification: Notification) => {
    const msg = (notification.message && String(notification.message)) || '';
    const title = (notification.title && String(notification.title)) || '';
    const isDiscount =
      notification.type === 'admin' ||
      notification.type === 'discount' ||
      title.toLowerCase().includes('discount') ||
      msg.toLowerCase().includes('discount') ||
      msg.toLowerCase().includes('خەسم') ||
      msg.toLowerCase().includes('داشکان');

    if (isDiscount) return <Gift size={20} color="#7C3AED" />;

    switch (notification.type) {
      case 'success':
        return <CheckCircle size={20} color="#22C55E" />;
      case 'warning':
        return <AlertTriangle size={20} color="#EAB308" />;
      case 'error':
        return <AlertCircle size={20} color="#EF4444" />;
      case 'admin':
        return <Megaphone size={20} color="#A855F7" />;
      default:
        return <Info size={20} color="#3B82F6" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={unreadCount > 0 ? `${t('notifications') || 'Notifications'} (${unreadCount})` : (t('notifications') || 'Notifications')}
        onBack={() => navigation.goBack()}
        style={{ paddingTop: insets.top + 16 }}
      />

      <ScrollView style={styles.content} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: Math.max(40, insets.bottom + spacing.xl) }}>
        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <BellOff size={48} color={colors.foreground.muted} />
            <Text style={[styles.emptyText, isRTL && styles.textRTL]}>{t('noNotificationsYet') || 'No notifications yet'}</Text>
            <Text style={[styles.emptySubtext, isRTL && styles.textRTL]}>
              {t('noNotificationsDesc') || "You'll see updates about your campaigns here"}
            </Text>
          </View>
        ) : (
          notifications.map((notification) => (
            <Swipeable
              key={notification.id}
              renderRightActions={renderRightActions}
              onSwipeableOpen={() => handleDismiss(notification.id)}
            >
              <TouchableOpacity
                style={[
                  styles.notificationCard,
                  isRTL && styles.notificationCardRTL,
                  !notification.is_read && (isRTL ? styles.notificationCardUnreadRTL : styles.notificationCardUnread),
                ]}
                onPress={() => handleNotificationPress(notification)}
              >
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: getIconBackground(notification.type) },
                  ]}
                >
                  {getIcon(notification)}
                </View>
                <View style={styles.notificationContent}>
                  <View style={[styles.titleRow, isRTL && styles.rowReverse]}>
                    <Text
                      style={[
                        styles.notificationTitle,
                        !notification.is_read && styles.unreadTitle,
                        isRTL && styles.textRTL,
                      ]}
                      numberOfLines={2}
                    >
                      {sanitizeNotificationText(
                        notification.title,
                        t('notificationTitleGeneric') || 'Notification'
                      )}
                    </Text>
                    {!notification.is_read && <PulseDot />}
                  </View>
                  <Text style={[styles.notificationMessage, isRTL && styles.textRTL]} numberOfLines={2}>
                    {sanitizeNotificationMessage(
                      sanitizeNotificationText(
                        notification.message,
                        t('notificationMessageGeneric') || 'Tap to view details'
                      )
                    )}
                  </Text>
                  <Text style={[styles.notificationDate, isRTL && styles.textRTL]}>
                    {formatRelativeTime(new Date(notification.created_at))}
                  </Text>
                </View>
              </TouchableOpacity>
            </Swipeable>
          ))
        )}
      </ScrollView>

      {/* Notification Detail Modal - MUST be rendered */}
      <NotificationDetailModal
        notification={selectedNotification}
        visible={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedNotification(null);
        }}
        onMarkAsRead={(id) => {
          markAsRead(id);
        }}
        onViewCampaign={(campaignId) => {
          setShowDetailModal(false);
          navigation.navigate('CampaignDetail', { id: campaignId });
        }}
        onCreateAd={() => {
          setShowDetailModal(false);
          navigation.navigate('Main', { screen: 'CreateAd' });
        }}
      />
      <ExpiredOfferModal
        visible={showExpiredOffer}
        onClose={() => setShowExpiredOffer(false)}
      />
    </View>
  );
}

const createStyles = (
  colors: any,
  isDark: boolean,
  fontFamily: string,
  fontFamilyMedium: string,
  fontFamilySemiBold: string,
  fontFamilyBold: string,
  isRTL?: boolean
) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.DEFAULT,
  },
  headerRTL: {
    flexDirection: 'row',
  },
  backButtonRTL: {
    start: undefined,
    end: spacing.md,
  },
  headerActions: {
    position: 'absolute',
    end: spacing.md,
    padding: 6,
  },
  headerActionsRTL: {
    start: spacing.md,
    end: undefined,
  },
  header: {
    position: 'relative',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingStart: spacing.md,
    paddingEnd: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.card.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
  },
  backButtonWrap: {
    position: 'absolute',
    start: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 10,
  },
  backButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.foreground.DEFAULT,
  },
  rowReverse: {
    flexDirection: 'row',
  },
  headerTitle: {
    alignItems: 'center',
  },
  headerText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.foreground.DEFAULT,
    fontFamily: fontFamilyBold,
    textAlign: 'center',
  },
  unreadCount: {
    fontSize: 14,
    fontFamily: fontFamily,
    color: colors.foreground.muted,
    marginTop: 2,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: fontFamilySemiBold,
    color: colors.foreground.DEFAULT,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: fontFamily,
    color: colors.foreground.muted,
    textAlign: 'center',
    marginTop: 8,
  },
  notificationCard: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colors.card.background,
    borderRadius: 12,
    gap: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  notificationCardRTL: {
    flexDirection: 'row',
  },
  textRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  notificationCardUnread: {
    borderStartWidth: 4,
    borderStartColor: colors.primary.DEFAULT,
    backgroundColor: isDark ? 'rgba(124, 58, 237, 0.1)' : colors.primary.light + '20',
  },
  notificationCardUnreadRTL: {
    borderStartWidth: 0,
    borderEndWidth: 4,
    borderEndColor: colors.primary.DEFAULT,
    backgroundColor: isDark ? 'rgba(124, 58, 237, 0.1)' : colors.primary.light + '20',
  },
  iconContainer: {
    marginTop: 2,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notificationTitle: {
    fontSize: 14,
    fontFamily: fontFamilyMedium,
    color: colors.foreground.DEFAULT,
    flex: 1,
  },
  unreadTitle: {
    fontFamily: fontFamilySemiBold,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
  },
  deleteAction: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    backgroundColor: '#EF4444',
    paddingHorizontal: 20,
    marginBottom: 8,
    borderRadius: 12,
  },
  notificationMessage: {
    fontSize: 14,
    fontFamily: fontFamily,
    color: colors.foreground.muted,
    marginTop: 4,
  },
  notificationDate: {
    fontSize: 12,
    fontFamily: fontFamily,
    color: '#71717A',
    marginTop: 8,
  },
  deleteActionText: {
    color: '#fff',
    fontFamily: fontFamilyBold,
    fontWeight: '700',
  },
});

