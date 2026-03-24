import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, CheckCheck } from 'lucide-react-native';
import { getOwnerColors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { Text } from '@/components/common/Text';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabaseRead } from '@/integrations/supabase/client';
import { setNotificationsCache } from '@/services/globalCache';
import { toast } from '@/utils/toast';
import { format } from 'date-fns';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export function OwnerNotifications() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const colors = getOwnerColors();
  const styles = createStyles(colors);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabaseRead
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (!error && data) {
      setNotifications(data);
      setNotificationsCache(data);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

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
      const msg = language === 'ckb' ? 'هەموو ئاگادارییەکان وەک خوێندراوەتەوە' : language === 'ar' ? 'تم تعليم الكل كمقروء' : 'All marked as read';
      toast.success(msg);
    } catch (error) {
      console.warn('[OwnerNotifications] Failed to mark all as read:', error);
      toast.error(language === 'ckb' ? 'کێشە هەیە' : 'Something went wrong');
    }
  }, [user, language, notifications]);

  const title = unreadCount > 0 ? `${t('adminNotifications')} (${unreadCount})` : t('adminNotifications');

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={title}
        onBack={() => navigation.goBack()}
        style={{ paddingTop: insets.top + 16 }}
        rightElement={
          unreadCount > 0 ? (
            <TouchableOpacity
              onPress={markAllAsRead}
              style={styles.markAllReadButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel={language === 'ckb' ? 'هەموو وەک خوێندراوەتەوە' : 'Mark all as read'}
            >
              <CheckCheck size={22} color={colors.foreground.DEFAULT} strokeWidth={2} />
            </TouchableOpacity>
          ) : undefined
        }
      />
      <ScrollView style={styles.content} contentContainerStyle={[styles.contentContainer, { paddingBottom: Math.max(40, insets.bottom + spacing.xl) }]}>
        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Bell size={48} color={colors.foreground.muted} />
            <Text style={styles.emptyText}>{t('noNotificationsYetOwner')}</Text>
          </View>
        ) : (
          notifications.map((n) => (
            <View
              key={n.id}
              style={[styles.card, n.is_read ? styles.cardRead : styles.cardUnread]}
            >
              <Text style={styles.cardTitle} numberOfLines={2}>{n.title || t('notificationTitleGeneric')}</Text>
              <Text style={styles.cardMessage} numberOfLines={2}>{n.message || ''}</Text>
              <Text style={styles.cardDate}>{format(new Date(n.created_at), 'dd MMM yyyy, HH:mm')}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.DEFAULT,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.foreground.DEFAULT,
    marginTop: spacing.md,
  },
  card: {
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  cardRead: {
    backgroundColor: colors.card?.background ?? colors.background.DEFAULT,
    borderColor: colors.border?.DEFAULT ?? '#E4E4E7',
  },
  cardUnread: {
    backgroundColor: (colors.success ?? '#22C55E') + '14',
    borderColor: (colors.success ?? '#22C55E') + '33',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.foreground.DEFAULT,
    marginBottom: 4,
  },
  cardMessage: {
    fontSize: 14,
    color: colors.foreground?.muted ?? colors.foreground.DEFAULT,
    marginBottom: 4,
  },
  cardDate: {
    fontSize: 12,
    color: colors.foreground?.muted ?? colors.foreground.DEFAULT,
  },
});
