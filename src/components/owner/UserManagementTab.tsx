import { supabase } from '@/integrations/supabase/client';
import { sendPushToUsers } from '@/services/notificationPush';
import { borderRadius, spacing } from '@/theme/spacing';
import { inputStyleRTL } from '@/utils/rtl';
import { toast } from '@/utils/toast';
import { formatDateNumericDMY } from '@/utils/dateFormat';
import { Ban, Bell, Mail, Search, UserCheck, Users, UserX, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { CenterModal } from '@/components/common/CenterModal';

interface User {
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
  created_at: string;
  is_blocked?: boolean;
}

interface UserManagementTabProps {
  colors: any;
  t: (key: string) => string;
}

export const UserManagementTab: React.FC<UserManagementTabProps> = ({ colors, t }) => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationBody, setNotificationBody] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      // Use owner-content API to fetch users with stats
      const { data, error } = await supabase.functions.invoke('owner-content', {
        body: { action: 'list', type: 'users' },
      });

      if (error) throw error;

      const usersList = (data?.users || []).map((user: any) => ({
        user_id: user.user_id || user.id,
        full_name: user.full_name,
        email: user.email,
        phone_number: user.phone_number,
        created_at: user.created_at,
        is_blocked: user.is_blocked || user.blocked || false,
      }));

      setUsers(usersList);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      toast.error(t('error'), t('somethingWentWrong'));
    } finally {
      setLoading(false);
    }
  };

  const handleBlock = (user: User) => {
    const action = user.is_blocked ? 'unblock' : 'block';
    Alert.alert(
      `${action === 'block' ? 'Block' : 'Unblock'} User`,
      `Are you sure you want to ${action} ${user.full_name || user.email || 'this user'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action === 'block' ? 'Block' : 'Unblock',
          style: action === 'block' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              if (user.is_blocked) {
                // Unblock using owner-content API
                const { data, error } = await supabase.functions.invoke('owner-content', {
                  body: {
                    action: 'unblock',
                    type: 'users',
                    data: { user_id: user.user_id },
                  },
                });

                if (error) throw error;
                if (data?.error) throw new Error(data.error);

                toast.success(t('success'), t('operationCompleted'));
              } else {
                // Block using owner-content API
                const { data, error } = await supabase.functions.invoke('owner-content', {
                  body: {
                    action: 'block',
                    type: 'users',
                    data: { user_id: user.user_id, reason: null },
                  },
                });

                if (error) throw error;
                if (data?.error) throw new Error(data.error);

                toast.success(t('success'), t('operationCompleted'));
              }
              fetchUsers();
            } catch (err: any) {
              toast.error(t('error'), t('somethingWentWrong'));
            }
          },
        },
      ]
    );
  };

  const handleRemove = (user: User) => {
    Alert.alert(
      'Remove User',
      `Are you sure you want to permanently remove ${user.full_name || user.email || 'this user'}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete user profile and auth account
              // Note: This requires admin privileges
              const { error: profileError } = await supabase
                .from('profiles')
                .delete()
                .eq('user_id', user.user_id);

              if (profileError) throw profileError;

              // Delete auth user (requires admin function)
              const { error: authError } = await supabase.functions.invoke('admin-delete-user', {
                body: { userId: user.user_id },
              });

              if (authError) {
                console.warn('Failed to delete auth user:', authError);
                // Profile is deleted, but auth user might still exist
              }

              toast.success(t('success'), t('operationCompleted'));
              fetchUsers();
            } catch (err: any) {
              toast.error(t('error'), t('somethingWentWrong'));
            }
          },
        },
      ]
    );
  };

  const handleNotify = (user: User) => {
    setSelectedUser(user);
    setNotificationTitle('');
    setNotificationBody('');
    setShowNotifyModal(true);
  };

  const sendNotification = async () => {
    if (!selectedUser || !notificationTitle.trim() || !notificationBody.trim()) {
      toast.error(t('error'), t('somethingWentWrong'));
      return;
    }

    try {
      // Create notification via edge function (bypasses RLS, uses service role)
      const { error: notifyError } = await supabase.functions.invoke('owner-content', {
        body: {
          action: 'send_notification',
          type: 'users',
          data: {
            user_id: selectedUser.user_id,
            title: notificationTitle.trim(),
            message: notificationBody.trim(), // Use 'message' column
          },
        },
      });

      if (notifyError) throw notifyError;

      // Push up: same title/body so user gets it on device
      await sendPushToUsers([selectedUser.user_id], notificationTitle.trim(), notificationBody.trim(), {
        data: { type: 'owner_notification' },
        tag: 'owner-notification',
      });

      toast.success(t('success'), t('operationCompleted'));
      setShowNotifyModal(false);
      setSelectedUser(null);
    } catch (err: any) {
      toast.error(t('error'), t('somethingWentWrong'));
    }
  };

  const styles = createStyles(colors);

  const filteredUsers = users.filter((user) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return (
      user.email?.toLowerCase().includes(term) ||
      user.full_name?.toLowerCase().includes(term) ||
      user.phone_number?.toLowerCase().includes(term)
    );
  });

  const totalUsers = users.length;
  const blockedCount = users.filter((u) => u.is_blocked).length;
  const activeCount = totalUsers - blockedCount;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Users size={18} color={colors.primary.DEFAULT} />
            <Text style={styles.statNumber}>{totalUsers}</Text>
            <Text style={styles.statLabel}>Total Users</Text>
          </View>
          <View style={styles.statCard}>
            <UserX size={18} color="#EF4444" />
            <Text style={styles.statNumber}>{blockedCount}</Text>
            <Text style={styles.statLabel}>Blocked</Text>
          </View>
          <View style={styles.statCard}>
            <UserCheck size={18} color="#22C55E" />
            <Text style={styles.statNumber}>{activeCount}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
        </View>

        {/* Header + search */}
        <View style={styles.headerRow}>
          <Text style={styles.title}>{t('userManagement') || 'User Management'}</Text>
          <View style={styles.searchContainer}>
            <Search size={16} color={colors.foreground.muted} />
            <TextInput
              style={[styles.searchInput, inputStyleRTL()]}
              placeholder={t('searchUsers') || 'Search users...'}
              placeholderTextColor={colors.foreground.muted}
              value={search}
              onChangeText={setSearch}
            />
          </View>
        </View>

        {filteredUsers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Users size={48} color={colors.foreground.muted} />
            <Text style={styles.emptyText}>No users found</Text>
          </View>
        ) : (
          <View style={styles.cardsContainer}>
            {filteredUsers.map((user) => (
              <View key={user.user_id} style={styles.userCard}>
                {/* User Info Section */}
                <View style={styles.userCardHeader}>
                  <View style={styles.userAvatar}>
                    <Text style={styles.userAvatarText}>
                      {(user.full_name || user.email || 'U').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName} numberOfLines={1}>
                      {user.full_name || 'Unnamed User'}
                    </Text>
                    <View style={styles.userContactRow}>
                      <Mail size={12} color={colors.foreground.muted} />
                      <Text style={styles.userEmail} numberOfLines={1}>
                        {user.email || user.phone_number || t('noContact')}
                      </Text>
                    </View>
                    <Text style={styles.userJoined}>
                      {t('joined')} {formatDateNumericDMY(new Date(user.created_at))}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadgeCard,
                      user.is_blocked ? styles.statusBlockedCard : styles.statusActiveCard,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusTextCard,
                        user.is_blocked ? styles.statusTextBlockedCard : styles.statusTextActiveCard,
                      ]}
                    >
                      {user.is_blocked ? 'Blocked' : 'Active'}
                    </Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.cardActionButton}
                    onPress={() => handleNotify(user)}
                    activeOpacity={0.7}
                  >
                    <Bell size={16} color={colors.primary.DEFAULT} />
                    <Text style={styles.cardActionButtonText}>Notify</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.cardActionButton,
                      user.is_blocked ? styles.unblockButtonCard : styles.blockButtonCard,
                    ]}
                    onPress={() => handleBlock(user)}
                    activeOpacity={0.7}
                  >
                    <Ban
                      size={16}
                      color={user.is_blocked ? '#22C55E' : '#EF4444'}
                    />
                    <Text
                      style={[
                        styles.cardActionButtonText,
                        { color: user.is_blocked ? '#22C55E' : '#EF4444' },
                      ]}
                    >
                      {user.is_blocked ? 'Unblock' : 'Block'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Notify Modal — centered, keyboard-aware */}
      <CenterModal
        visible={showNotifyModal}
        onRequestClose={() => setShowNotifyModal(false)}
        keyboardAware
      >
        <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Send Notification</Text>
              <TouchableOpacity onPress={() => setShowNotifyModal(false)}>
                <X size={24} color={colors.foreground.DEFAULT} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Text style={styles.modalSubtitle}>
                To: {selectedUser?.full_name || selectedUser?.email || 'User'}
              </Text>

              <Text style={styles.inputLabel}>Title *</Text>
              <TextInput
                style={[styles.input, inputStyleRTL()]}
                value={notificationTitle}
                onChangeText={setNotificationTitle}
                placeholder="Notification title"
                placeholderTextColor={colors.foreground.muted}
              />

              <Text style={styles.inputLabel}>Message *</Text>
              <TextInput
                style={[styles.input, styles.textArea, inputStyleRTL()]}
                value={notificationBody}
                onChangeText={setNotificationBody}
                placeholder="Notification message"
                placeholderTextColor={colors.foreground.muted}
                multiline
                numberOfLines={6}
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowNotifyModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.sendButton]}
                onPress={sendNotification}
              >
                <Text style={styles.sendButtonText}>Send</Text>
              </TouchableOpacity>
            </View>
        </View>
      </CenterModal>
    </View>
  );
};

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.DEFAULT,
    },
    scrollView: {
      flex: 1,
    },
    contentContainer: {
      padding: spacing.sm,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    header: {
    marginBottom: spacing.lg,
  },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.foreground.DEFAULT,
      marginBottom: spacing.xs,
    },
    subtitle: {
      fontSize: 14,
      color: colors.foreground.muted,
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.xl * 2,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.foreground.DEFAULT,
      marginTop: spacing.md,
    },
    statsRow: {
      flexDirection: 'row',
      gap: spacing.md,
      marginBottom: spacing.md,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.card.background,
      borderRadius: borderRadius.card,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border.DEFAULT,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
    },
    statNumber: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.foreground.DEFAULT,
    },
    statLabel: {
      fontSize: 12,
      color: colors.foreground.muted,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card.background,
      borderRadius: borderRadius.input,
      borderWidth: 1,
      borderColor: colors.border.DEFAULT,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      minWidth: 150,
    },
    searchInput: {
      marginStart: spacing.xs,
      fontSize: 12,
      color: colors.foreground.DEFAULT,
      paddingVertical: 0,
      flex: 1,
    },
    cardsContainer: {
      gap: spacing.md,
      paddingBottom: spacing.md,
    },
    userCard: {
      backgroundColor: colors.card.background,
      borderRadius: borderRadius.card,
      borderWidth: 1,
      borderColor: colors.border.DEFAULT,
      padding: spacing.md,
      gap: spacing.md,
    },
    userCardHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
    },
    userAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.primary.DEFAULT + '20',
      alignItems: 'center',
      justifyContent: 'center',
    },
    userAvatarText: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.primary.DEFAULT,
    },
    userInfo: {
      flex: 1,
      gap: 4,
    },
    userName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.foreground.DEFAULT,
    },
    userContactRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    userEmail: {
      fontSize: 13,
      color: colors.foreground.muted,
      flex: 1,
    },
    userJoined: {
      fontSize: 11,
      color: colors.foreground.muted,
    },
    statusBadgeCard: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: 999,
      alignSelf: 'flex-start',
    },
    statusActiveCard: {
      backgroundColor: '#22C55E20',
    },
    statusBlockedCard: {
      backgroundColor: '#EF444420',
    },
    statusTextCard: {
      fontSize: 11,
      fontWeight: '600',
    },
    statusTextActiveCard: {
      color: '#16A34A',
    },
    statusTextBlockedCard: {
      color: '#B91C1C',
    },
    cardActions: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    cardActionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.sm,
      backgroundColor: colors.background.DEFAULT,
      borderWidth: 1,
      borderColor: colors.border.DEFAULT,
      minHeight: 40,
    },
    blockButtonCard: {
      borderColor: '#EF4444',
      backgroundColor: '#EF4444' + '10',
    },
    unblockButtonCard: {
      borderColor: '#22C55E',
      backgroundColor: '#22C55E' + '10',
    },
    cardActionButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.foreground.DEFAULT,
    },
    // Legacy card styles kept for backwards compatibility (no longer used)
    userHeader: {},
    userInfo: {},
    userNameRow: {},
    userName: {},
    blockedBadge: {},
    blockedText: {},
    emailContainer: {},
    userEmail: {},
    userPhone: {},
    userId: {},
    userActions: {},
    actionButton: {},
    notifyButton: {},
    blockButton: {},
    unblockButton: {},
    removeButton: {},
    actionButtonText: {},
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.overlay.dark,
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.card.background,
      borderTopLeftRadius: borderRadius.card,
      borderTopRightRadius: borderRadius.card,
      maxHeight: '90%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.DEFAULT,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.foreground.DEFAULT,
    },
    modalSubtitle: {
      fontSize: 14,
      color: colors.foreground.muted,
      marginBottom: spacing.md,
      paddingHorizontal: spacing.md,
    },
    modalScroll: {
      maxHeight: 400,
      padding: spacing.md,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.foreground.DEFAULT,
      marginBottom: spacing.xs,
      marginTop: spacing.sm,
    },
    input: {
      backgroundColor: colors.background.DEFAULT,
      borderRadius: borderRadius.sm,
      padding: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border.DEFAULT,
      color: colors.foreground.DEFAULT,
      fontSize: 14,
    },
    textArea: {
      minHeight: 120,
      textAlignVertical: 'top',
    },
    modalActions: {
      flexDirection: 'row',
      gap: spacing.sm,
      padding: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border.DEFAULT,
    },
    modalButton: {
      flex: 1,
      padding: spacing.md,
      borderRadius: borderRadius.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelButton: {
      backgroundColor: colors.background.DEFAULT,
      borderWidth: 1,
      borderColor: colors.border.DEFAULT,
    },
    cancelButtonText: {
      color: colors.foreground.DEFAULT,
      fontSize: 16,
      fontWeight: '600',
    },
    sendButton: {
      backgroundColor: colors.primary.DEFAULT,
    },
    sendButtonText: {
      color: colors.primary.foreground,
      fontSize: 16,
      fontWeight: '600',
    },
  });

