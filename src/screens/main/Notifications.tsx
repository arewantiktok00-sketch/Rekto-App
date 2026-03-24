import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase, supabaseRead } from '@/integrations/supabase/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getGlobalCache, setNotificationsCache, getCached, setCached } from '@/services/globalCache';
import { AlertCircle, AlertTriangle, BellOff, Check, CheckCheck, Info } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { getFontFamily } from '@/utils/getFontFamily';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { spacing, borderRadius } from '@/theme/spacing';
import { format } from 'date-fns';
import { NotificationDetailModal } from '@/components/common/NotificationDetailModal';
import { ExpiredOfferModal } from '@/components/common/ExpiredOfferModal';
import { Text } from '@/components/common/Text';
import { Swipeable } from 'react-native-gesture-handler';
import { isRTL, rtlText, rtlRow } from '@/utils/rtl';
import { getNotificationMessageForDisplay } from '@/utils/errorHandling';
import { useOwnerAuth } from '@/hooks/useOwnerAuth';
import { translateNotification } from '@/utils/notificationTranslator';
import { toast } from '@/utils/toast';

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
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { hasAdminAccess } = useOwnerAuth();
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
  const initialLoadDone = useRef(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showExpiredOffer, setShowExpiredOffer] = useState(false);

  const getNotificationType = useCallback((type?: string): Notification['type'] | 'info' => {
    if (type === 'success' || type === 'warning' || type === 'error' || type === 'info' || type === 'admin' || type === 'discount') {
      return type;
    }
    return 'info';
  }, []);

  const getNotificationTone = useCallback((type?: string) => {
    const normalizedType = getNotificationType(type);
    switch (normalizedType) {
      case 'success':
        return {
          accent: colors.success,
          borderColor: `${colors.success}26`,
          backgroundColor: `${colors.success}0D`,
          unreadBackgroundColor: `${colors.success}14`,
          messageColor: colors.success,
          icon: <Check size={18} color={colors.success} strokeWidth={2.5} />,
        };
      case 'warning':
        return {
          accent: colors.warning,
          borderColor: `${colors.warning}33`,
          backgroundColor: `${colors.warning}12`,
          unreadBackgroundColor: `${colors.warning}1A`,
          messageColor: colors.warning,
          icon: <AlertTriangle size={18} color={colors.warning} strokeWidth={2.2} />,
        };
      case 'error':
        return {
          accent: colors.error,
          borderColor: `${colors.error}26`,
          backgroundColor: `${colors.error}0D`,
          unreadBackgroundColor: `${colors.error}14`,
          messageColor: colors.error,
          icon: <AlertCircle size={18} color={colors.error} strokeWidth={2.2} />,
        };
      default:
        return {
          accent: colors.info,
          borderColor: `${colors.info}26`,
          backgroundColor: `${colors.info}0D`,
          unreadBackgroundColor: `${colors.info}14`,
          messageColor: colors.foreground.muted,
          icon: <Info size={18} color={colors.info} strokeWidth={2} />,
        };
    }
  }, [colors, getNotificationType]);

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
    const doFetch = async () => {
      await fetchNotifications();
      initialLoadDone.current = true;
    };
    void doFetch();
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      if (!user || !initialLoadDone.current) return;
      void fetchNotifications();
    }, [user])
  );

  useEffect(() => {
    if (!user) return;
    let channel: ReturnType<typeof supabaseRead.channel> | null = null;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    let retryCount = 0;

    const subscribe = () => {
      if (retryTimeout) {
        clearTimeout(retryTimeout);
        retryTimeout = null;
      }
      if (channel) {
        supabaseRead.removeChannel(channel);
        channel = null;
      }
      channel = supabaseRead
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
            const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
            if (eventType === 'INSERT' && payload.new) {
              const newNotif = payload.new as Notification;
              setNotifications((prev) => {
                if (prev.some((n) => n.id === newNotif.id)) return prev;
                const updated = [newNotif, ...prev];
                setNotificationsCache(updated);
                setCached('notifications', updated);
                return updated;
              });
              // Realtime INSERT = fresh; always show toast
              const titleStr = (newNotif.title != null && String(newNotif.title)) || t('notificationTitleGeneric');
              const msgStr = (newNotif.message != null && String(newNotif.message)) || t('notificationMessageGeneric');
              const { title: translatedTitle, message: translatedMessage } = translateNotification(titleStr, msgStr, (language || 'en') as 'en' | 'ckb' | 'ar');
              toast.info(translatedTitle || titleStr, translatedMessage || msgStr);
              return;
            }
            if (eventType === 'UPDATE' && payload.new) {
              const updatedNotif = payload.new as Notification;
              setNotifications((prev) => {
                const next = prev.map((n) => (n.id === updatedNotif.id ? updatedNotif : n));
                setNotificationsCache(next);
                setCached('notifications', next);
                return next;
              });
              return;
            }
            if (eventType === 'DELETE' && payload.old) {
              const oldId = (payload.old as { id: string }).id;
              setNotifications((prev) => {
                const next = prev.filter((n) => n.id !== oldId);
                setNotificationsCache(next);
                setCached('notifications', next);
                return next;
              });
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') retryCount = 0;
          else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            const delay = Math.min(1000 * 2 ** retryCount, 15000);
            retryCount += 1;
            if (!retryTimeout) retryTimeout = setTimeout(subscribe, delay);
          }
        });
    };
    subscribe();

    return () => {
      if (retryTimeout) clearTimeout(retryTimeout);
      if (channel) supabaseRead.removeChannel(channel);
    };
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
        .order('created_at', { ascending: false });

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

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    try {
      await supabaseRead
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id);
      const updated = notifications.map((n) => ({ ...n, is_read: true }));
      setNotifications(updated);
      setNotificationsCache(updated);
      setCached('notifications', updated);
      await AsyncStorage.setItem(
        `${CACHE_KEY}_${user.id}`,
        JSON.stringify({ data: updated, timestamp: Date.now() })
      );
      const msg = language === 'ckb' ? 'هەموو ئاگادارییەکان وەک خوێندراوەتەوە' : language === 'ar' ? 'تم تعليم الكل كمقروء' : 'All marked as read';
      toast.success(msg);
    } catch (error) {
      console.warn('[Notifications] Failed to mark all as read:', error);
      toast.error(language === 'ckb' ? 'کێشە هەیە' : 'Something went wrong');
    }
  }, [user, language, notifications]);

  type SectionKey = 'today' | 'yesterday' | 'older';
  const groupNotificationsByDate = (list: Notification[]): { key: SectionKey; label: string; data: Notification[] }[] => {
    const today: Notification[] = [];
    const yesterday: Notification[] = [];
    const older: Notification[] = [];
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
    list.forEach((n) => {
      const t = new Date(n.created_at).getTime();
      if (t >= todayStart) today.push(n);
      else if (t >= yesterdayStart) yesterday.push(n);
      else older.push(n);
    });
    const sections: { key: SectionKey; label: string; data: Notification[] }[] = [];
    const todayLabel = language === 'ckb' ? 'ئەمڕۆ' : 'اليوم';
    const yesterdayLabel = language === 'ckb' ? 'دوێنێ' : 'أمس';
    const olderLabel = language === 'ckb' ? 'پێشتر' : 'قديم';
    if (today.length > 0) sections.push({ key: 'today', label: todayLabel, data: today });
    if (yesterday.length > 0) sections.push({ key: 'yesterday', label: yesterdayLabel, data: yesterday });
    if (older.length > 0) sections.push({ key: 'older', label: olderLabel, data: older });
    return sections;
  };

  const renderRightActions = () => (
    <View style={styles.markReadAction}>
      <Text style={styles.markReadActionText}>{language === 'ckb' ? 'خوێندنەوە' : language === 'ar' ? 'تعليم كمقروء' : 'Mark read'}</Text>
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

  const markAsRead = useCallback(async (id: string) => {
    const next = notifications.map((n) => (n.id === id ? { ...n, is_read: true } : n));
    setNotifications(next);
    setNotificationsCache(next);
    setCached('notifications', next);
    try {
      await supabaseRead
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);
    } catch (error) {
      console.error('Error marking as read:', error);
      fetchNotifications();
    }
  }, [notifications]);


  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={unreadCount > 0 ? `${t('notifications')} (${unreadCount})` : t('notifications')}
        onBack={() => navigation.goBack()}
        style={{ paddingTop: insets.top + 16 }}
        rightElement={
          hasAdminAccess && unreadCount > 0 ? (
            <TouchableOpacity
              onPress={markAllAsRead}
              style={[styles.markAllReadButton, rtlRow(rtl)]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel={language === 'ckb' ? 'هەموو وەک خوێندراوەتەوە' : 'Mark all as read'}
            >
              <CheckCheck size={22} color={colors.foreground.DEFAULT} strokeWidth={2} />
            </TouchableOpacity>
          ) : undefined
        }
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: Math.max(40, insets.bottom + spacing.xl) },
        ]}
      >
        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <BellOff size={48} color={colors.foreground.muted} />
            <Text style={[styles.emptyText, rtl && styles.textRTL]}>{t('noNotificationsYet')}</Text>
            <Text style={[styles.emptySubtext, rtl && styles.textRTL]}>
              {t('noNotificationsDesc')}
            </Text>
          </View>
        ) : (
          groupNotificationsByDate(notifications).map((section) => (
            <View key={section.key} style={styles.section}>
              <Text style={[styles.sectionHeader, rtl && styles.textRTL]}>{section.label}</Text>
              {section.data.map((notification) => (
                (() => {
                  const tone = getNotificationTone(notification.type);
                  return (
                <Swipeable
                  key={notification.id}
                  renderRightActions={renderRightActions}
                  onSwipeableOpen={() => !notification.is_read && markAsRead(notification.id)}
                >
                  <TouchableOpacity
                    style={[
                      styles.notificationCard,
                      {
                        borderColor: tone.borderColor,
                        backgroundColor: notification.is_read
                          ? (isDark ? '#1E1E30' : '#F9FAFB')
                          : tone.unreadBackgroundColor,
                      },
                    ]}
                    onPress={() => handleNotificationPress(notification)}
                    activeOpacity={0.7}
                  >
                    {!notification.is_read && (
                      <View
                        style={[
                          styles.unreadAccentBar,
                          { backgroundColor: tone.accent, opacity: 0.8 },
                          rtl && styles.unreadAccentBarRTL,
                        ]}
                      />
                    )}
                    <View style={[styles.cardInner, rtl && styles.cardInnerRTL]}>
                      <View style={styles.notificationContent}>
                        <View style={[styles.titleRow, rtl && styles.titleRowRTL]}>
                          {!notification.is_read && <View style={[styles.unreadDot, { backgroundColor: tone.accent }]} />}
                          <Text
                            style={[
                              styles.notificationTitle,
                              !notification.is_read && styles.unreadTitle,
                              rtl && styles.textRTL,
                            ]}
                            numberOfLines={2}
                          >
                            {(translateNotification(
                              sanitizeNotificationText(notification.title, t('notificationTitleGeneric')),
                              sanitizeNotificationMessage(
                                sanitizeNotificationText(notification.message, t('notificationMessageGeneric'))
                              ),
                              (language || 'ckb') as 'ckb' | 'ar' | 'en'
                            ).title) || t('notificationTitleGeneric')}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.notificationMessage,
                            { color: tone.messageColor },
                            rtl && styles.textRTL,
                          ]}
                          numberOfLines={2}
                        >
                          {(() => {
                            const rawMsg = sanitizeNotificationMessage(
                              sanitizeNotificationText(notification.message, t('notificationMessageGeneric'))
                            );
                            const rawTitle = sanitizeNotificationText(notification.title, t('notificationTitleGeneric'));
                            const tr = translateNotification(rawTitle, rawMsg, (language || 'ckb') as 'ckb' | 'ar' | 'en');
                            return getNotificationMessageForDisplay(
                              rawMsg,
                              tr.message ?? '',
                              !!hasAdminAccess,
                              language === 'ar' ? 'ar' : 'ckb'
                            );
                          })()}
                        </Text>
                        <Text style={[styles.notificationDate, rtl && styles.textRTL]}>
                          {formatRelativeTime(new Date(notification.created_at))}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statusIconWrap,
                          { backgroundColor: `${tone.accent}14` },
                          rtl && styles.statusIconWrapRTL,
                        ]}
                      >
                        {tone.icon}
                      </View>
                    </View>
                  </TouchableOpacity>
                </Swipeable>
                  );
                })()
              ))}
            </View>
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
          if (hasAdminAccess) {
            navigation.navigate('OwnerDashboard' as never, { highlightCampaignId: campaignId } as never);
          } else {
            navigation.navigate('CampaignDetail' as never, { id: campaignId } as never);
          }
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
  markAllReadButton: {
    width: 40,
    height: 40,
    minWidth: 40,
    minHeight: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
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
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 13,
    fontFamily: fontFamilyMedium,
    color: colors.foreground.muted,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  notificationCard: {
    position: 'relative',
    backgroundColor: colors.card.background ?? (isDark ? '#27272A' : '#FFFFFF'),
    borderRadius: 14,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
    }),
  },
  textRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  unreadAccentBar: {
    position: 'absolute',
    left: 0,
    top: 12,
    bottom: 12,
    width: 2,
    backgroundColor: colors.primary.DEFAULT,
    opacity: 0.4,
    borderTopRightRadius: 1,
    borderBottomRightRadius: 1,
  },
  unreadAccentBarRTL: {
    left: undefined,
    right: 0,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    borderTopLeftRadius: 1,
    borderBottomLeftRadius: 1,
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  cardInnerRTL: {
    flexDirection: 'row-reverse',
  },
  notificationContent: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  titleRowRTL: {
    flexDirection: 'row-reverse',
  },
  notificationTitle: {
    fontSize: 16,
    fontFamily: fontFamilyMedium,
    color: colors.foreground.DEFAULT,
    flex: 1,
  },
  unreadTitle: {
    fontFamily: fontFamilySemiBold,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary.DEFAULT,
  },
  statusIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  statusIconWrapRTL: {
    marginLeft: 0,
    marginRight: 12,
  },
  markReadAction: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    backgroundColor: colors.success ?? '#22C55E',
    paddingHorizontal: 20,
    marginBottom: 12,
    borderRadius: 14,
  },
  markReadActionText: {
    color: '#fff',
    fontFamily: fontFamilyBold,
    fontWeight: '700',
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
    color: colors.foreground.muted,
    marginTop: 6,
  },
});

