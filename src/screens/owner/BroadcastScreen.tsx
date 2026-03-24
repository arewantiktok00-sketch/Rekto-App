import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Megaphone, Send, Bell, Users, CheckCircle, History } from 'lucide-react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { getOwnerColors } from '@/theme/colors';
import { getTypographyStyles } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';
import { inputStyleRTL } from '@/utils/rtl';
import type { BroadcastHistory, BroadcastStats, BroadcastSendResult } from '@/types/broadcast';
import { toast } from '@/utils/toast';

export function BroadcastScreen() {
  const insets = useSafeAreaInsets();
  const { t, language } = useLanguage();
  const colors = getOwnerColors();
  const typography = getTypographyStyles(language as 'ckb' | 'ar');
  const styles = createStyles(colors, insets, typography);

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [userCount, setUserCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(true);
  const [history, setHistory] = useState<BroadcastHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchHistory();
  }, []);

  const fetchStats = async () => {
    setLoadingCount(true);
    try {
      const { data, error } = await supabase.functions.invoke('owner-content', {
        body: { type: 'broadcast', action: 'stats' },
      });
      if (error) throw error;
      setUserCount(data.userCount || 0);
    } catch (err) {
      console.error('[Broadcast] Failed to fetch stats:', err);
      setUserCount(0);
      Alert.alert(t('error') || 'Error', t('failedToLoadStats') || 'Failed to load user count');
    } finally {
      setLoadingCount(false);
    }
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase.functions.invoke('owner-content', {
        body: { type: 'broadcast', action: 'history' },
      });
      if (error) throw error;
      setHistory(data.broadcasts || []);
    } catch (err) {
      console.error('[Broadcast] Failed to fetch history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      Alert.alert(t('error') || 'Error', t('titleAndMessageRequired') || 'Title and message are required');
      return;
    }

    if (title.length > 100) {
      Alert.alert(t('error') || 'Error', t('titleTooLong') || 'Title must be under 100 characters');
      return;
    }

    if (message.length > 500) {
      Alert.alert(t('error') || 'Error', t('messageTooLong') || 'Message must be under 500 characters');
      return;
    }

    if (userCount === 0) {
      Alert.alert(t('error') || 'Error', t('noUsersWithPush') || 'No users have push notifications enabled');
      return;
    }

    // Confirmation dialog
    Alert.alert(
      t('sendBroadcast') || 'Send Broadcast?',
      t('sendBroadcastConfirm')?.replace('{count}', String(userCount)) || `This will send a push notification to ${userCount} users. This action cannot be undone.`,
      [
        { text: t('cancel') || 'Cancel', style: 'cancel' },
        {
          text: t('send') || 'Send',
          style: 'default',
          onPress: async () => {
            setSending(true);
            try {
              const { data, error } = await supabase.functions.invoke('owner-content', {
                body: {
                  type: 'broadcast',
                  action: 'send',
                  data: { title: title.trim(), message: message.trim() },
                },
              });
              if (error) throw error;
              const result: BroadcastSendResult = data;

              if (result.success) {
                Alert.alert(
                  t('success') || 'Success',
                  t('broadcastSent')?.replace('{sent}', String(result.sent)) || `Notification sent to ${result.sent} users!`
                );
                setTitle('');
                setMessage('');
                fetchHistory();
                fetchStats();
              } else {
                Alert.alert(t('error') || 'Error', result.error || t('failedToSend') || 'Failed to send broadcast');
              }
            } catch (err: any) {
              console.error('[Broadcast] Send error:', err);
              toast.error(t('error'), t('somethingWentWrong'));
            } finally {
              setSending(false);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const d = String(date.getDate()).padStart(2, '0');
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const y = date.getFullYear();
      const h = String(date.getHours()).padStart(2, '0');
      const min = String(date.getMinutes()).padStart(2, '0');
      return `${d}/${m}/${y} ${h}:${min}`;
    } catch {
      return dateString;
    }
  };

  const isSendDisabled = !title.trim() || !message.trim() || sending || userCount === 0;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Form Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Megaphone size={20} color={colors.primary.DEFAULT} />
            <Text style={styles.cardTitle}>{t('broadcastPushNotification') || 'Broadcast Push Notification'}</Text>
          </View>
          <Text style={styles.cardDescription}>
            {t('broadcastDescription') || 'Send a push notification to all users with notifications enabled'}
          </Text>

          {/* Title Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {t('title') || 'Title'} ({title.length}/100)
            </Text>
            <TextInput
              style={[styles.input, inputStyleRTL()]}
              placeholder={t('enterNotificationTitle') || 'Enter notification title...'}
              placeholderTextColor={colors.input.placeholder}
              value={title}
              onChangeText={setTitle}
              maxLength={100}
              editable={!sending}
            />
          </View>

          {/* Message Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {t('message') || 'Message'} ({message.length}/500)
            </Text>
            <TextInput
              style={[styles.input, styles.textarea, inputStyleRTL()]}
              placeholder={t('enterNotificationMessage') || 'Enter notification message...'}
              placeholderTextColor={colors.input.placeholder}
              value={message}
              onChangeText={setMessage}
              maxLength={500}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!sending}
            />
          </View>

          {/* Preview */}
          {(title || message) && (
            <View style={styles.preview}>
              <Text style={styles.previewLabel}>{t('preview') || 'Preview'}</Text>
              <View style={styles.previewCard}>
                <View style={styles.previewIcon}>
                  <Bell size={20} color={colors.primary.DEFAULT} />
                </View>
                <View style={styles.previewContent}>
                  <Text style={styles.previewApp}>Rekto App</Text>
                  <Text style={styles.previewTitle}>{title || t('notificationTitle') || 'Notification Title'}</Text>
                  <Text style={styles.previewMessage} numberOfLines={2}>
                    {message || t('notificationMessagePreview') || 'Notification message preview...'}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* User Count */}
          <View style={styles.userCount}>
            <Users size={16} color={colors.foreground.muted} />
            {loadingCount ? (
              <ActivityIndicator size="small" color={colors.primary.DEFAULT} />
            ) : (
              <Text style={styles.userCountText}>
                <Text style={styles.userCountNumber}>{userCount}</Text> {t('usersWithPushEnabled') || 'users with push notifications enabled'}
              </Text>
            )}
          </View>

          {/* Send Button */}
          <TouchableOpacity
            style={[styles.sendButton, isSendDisabled && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={isSendDisabled}
            activeOpacity={0.7}
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.primary.foreground} />
            ) : (
              <Send size={18} color={colors.primary.foreground} />
            )}
            <Text style={styles.sendButtonText}>
              {sending ? (t('sending') || 'Sending...') : (t('sendToAllUsers') || 'Send to All Users')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* History Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <History size={20} color={colors.primary.DEFAULT} />
            <Text style={styles.cardTitle}>{t('broadcastHistory') || 'Broadcast History'}</Text>
          </View>

          {loadingHistory ? (
            <View style={styles.loader}>
              <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
            </View>
          ) : history.length === 0 ? (
            <Text style={styles.emptyText}>{t('noBroadcastsYet') || 'No broadcasts sent yet'}</Text>
          ) : (
            history.map((item, index) => (
              <View key={item.id} style={[styles.historyItem, index > 0 && styles.historyItemBorder]}>
                <Text style={styles.historyDate}>{formatDate(item.created_at)}</Text>
                <Text style={styles.historyTitle}>{item.title}</Text>
                <Text style={styles.historyMessage} numberOfLines={2}>
                  {item.message}
                </Text>
                <View style={styles.historyStats}>
                  <CheckCircle size={14} color={colors.success} />
                  <Text style={styles.historyStatsText}>
                    {item.success_count}/{item.recipient_count} {t('sent') || 'sent'}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any, insets: any, typography: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.DEFAULT,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },
  card: {
    backgroundColor: colors.card.background,
    borderRadius: borderRadius.card,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.card.border || colors.border.DEFAULT,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  cardTitle: {
    ...typography.h3,
    color: colors.foreground.DEFAULT,
  },
  cardDescription: {
    ...typography.bodySmall,
    color: colors.foreground.muted,
    marginBottom: spacing.md,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.bodySmall,
    color: colors.foreground.DEFAULT,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.input.background,
    borderRadius: borderRadius.input,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
    color: colors.foreground.DEFAULT,
    borderWidth: 1,
    borderColor: colors.input.border,
  },
  textarea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  preview: {
    marginBottom: spacing.md,
  },
  previewLabel: {
    ...typography.caption,
    color: colors.foreground.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  previewCard: {
    flexDirection: 'row',
    backgroundColor: colors.overlay.light,
    borderRadius: borderRadius.input,
    padding: spacing.md,
    gap: spacing.md,
  },
  previewIcon: {
    padding: spacing.sm,
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    borderRadius: borderRadius.input,
    alignSelf: 'flex-start',
  },
  previewContent: {
    flex: 1,
  },
  previewApp: {
    ...typography.caption,
    color: colors.foreground.muted,
    marginBottom: 2,
  },
  previewTitle: {
    ...typography.bodySmall,
    color: colors.foreground.DEFAULT,
    fontWeight: '600',
    marginBottom: 2,
  },
  previewMessage: {
    ...typography.bodySmall,
    color: colors.foreground.muted,
  },
  userCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  userCountText: {
    ...typography.bodySmall,
    color: colors.foreground.muted,
  },
  userCountNumber: {
    color: colors.foreground.DEFAULT,
    fontWeight: '600',
  },
  sendButton: {
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: borderRadius.input,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    ...typography.body,
    color: colors.primary.foreground,
    fontWeight: '600',
  },
  loader: {
    paddingVertical: spacing.xl,
  },
  emptyText: {
    ...typography.body,
    color: colors.foreground.muted,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  historyItem: {
    paddingVertical: spacing.sm,
  },
  historyItemBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border.DEFAULT,
    marginTop: spacing.sm,
  },
  historyDate: {
    ...typography.caption,
    color: colors.foreground.subtle || colors.foreground.muted,
    marginBottom: spacing.xs,
  },
  historyTitle: {
    ...typography.bodySmall,
    color: colors.foreground.DEFAULT,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  historyMessage: {
    ...typography.caption,
    color: colors.foreground.muted,
    marginBottom: spacing.xs,
  },
  historyStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  historyStatsText: {
    ...typography.caption,
    color: colors.foreground.muted,
  },
});
