import { supabase } from '@/integrations/supabase/client';
import { borderRadius, spacing } from '@/theme/spacing';
import { toast } from '@/utils/toast';
import { Picker } from '@react-native-picker/picker';
import LinearGradient from 'react-native-linear-gradient';
import { Mail, Save, Shield } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const DAILY_PAUSE_LIMIT_MIN = 1;
const DAILY_PAUSE_LIMIT_MAX = 10;

interface PermissionUser {
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
  created_at: string;
  can_extend_ads?: boolean;
  can_pause_ads?: boolean;
  daily_pause_limit?: number;
}

interface UserPermissionsTabProps {
  colors: any;
  t: (key: string) => string;
}

export const UserPermissionsTab: React.FC<UserPermissionsTabProps> = ({ colors, t }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<PermissionUser[]>([]);
  const [originalUsers, setOriginalUsers] = useState<PermissionUser[]>([]);

  const fetchUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('owner-content', {
        body: { action: 'list', type: 'users' },
      });

      if (error || data?.error) {
        toast.error(t('error'), t('somethingWentWrong'));
        return;
      }

      const list = (data?.users || []).map((u: any) => ({
        user_id: u.user_id || u.id,
        full_name: u.full_name,
        email: u.email,
        phone_number: u.phone_number,
        created_at: u.created_at,
        can_extend_ads: Boolean(u.can_extend_ads),
        can_pause_ads: Boolean(u.can_pause_ads),
        daily_pause_limit: typeof u.daily_pause_limit === 'number' ? Math.max(DAILY_PAUSE_LIMIT_MIN, Math.min(DAILY_PAUSE_LIMIT_MAX, u.daily_pause_limit)) : 1,
      }));
      setUsers(list);
      setOriginalUsers(list);
    } catch {
      toast.error(t('error'), t('somethingWentWrong'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  const setLocalPermission = (
    userId: string,
    field: 'can_extend_ads' | 'can_pause_ads',
    value: boolean
  ) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.user_id === userId ? { ...u, [field]: value } : u
      )
    );
  };

  const setLocalDailyPauseLimit = (userId: string, value: number) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.user_id === userId ? { ...u, daily_pause_limit: value } : u
      )
    );
  };

  const hasChanges = users.some(
    (u) => {
      const orig = originalUsers.find((o) => o.user_id === u.user_id);
      if (!orig) return false;
      return (
        orig.can_extend_ads !== u.can_extend_ads ||
        orig.can_pause_ads !== u.can_pause_ads ||
        (orig.daily_pause_limit ?? 1) !== (u.daily_pause_limit ?? 1)
      );
    }
  );

  const savePermissionsForUser = async (u: PermissionUser): Promise<{ ok: boolean; message?: string }> => {
    const payload = {
      type: 'users' as const,
      action: 'update_permissions' as const,
      data: {
        user_id: u.user_id,
        can_pause_ads: Boolean(u.can_pause_ads),
        can_extend_ads: Boolean(u.can_extend_ads),
        daily_pause_limit: Math.min(DAILY_PAUSE_LIMIT_MAX, Math.max(DAILY_PAUSE_LIMIT_MIN, Number(u.daily_pause_limit) || 1)),
      },
    };
    if (__DEV__) {
      console.log('SAVE PAYLOAD:', JSON.stringify(payload, null, 2));
      console.log('DEBUG user_id:', u.user_id, 'type:', typeof u.user_id);
      console.log('DEBUG can_pause_ads:', u.can_pause_ads, 'type:', typeof u.can_pause_ads);
      console.log('DEBUG daily_pause_limit:', u.daily_pause_limit, 'type:', typeof u.daily_pause_limit);
    }
    const { data, error } = await supabase.functions.invoke('owner-content', { body: payload });
    if (error) {
      if (__DEV__) console.error('Network/invoke error:', error);
      return { ok: false, message: error.message || 'Network error' };
    }
    if (data?.error) {
      if (__DEV__) console.error('Backend error:', data.error);
      return { ok: false, message: typeof data.error === 'string' ? data.error : JSON.stringify(data.error) };
    }
    return { ok: true };
  };

  const handleSave = async () => {
    if (!hasChanges || saving) return;
    const toUpdate = users.filter((u) => {
      const orig = originalUsers.find((o) => o.user_id === u.user_id);
      if (!orig) return false;
      return (
        orig.can_extend_ads !== u.can_extend_ads ||
        orig.can_pause_ads !== u.can_pause_ads ||
        (orig.daily_pause_limit ?? 1) !== (u.daily_pause_limit ?? 1)
      );
    });
    if (toUpdate.length === 0) return;

    setSaving(true);
    try {
      for (const u of toUpdate) {
        const result = await savePermissionsForUser(u);
        if (!result.ok) {
          const who = u.full_name || u.email || u.user_id;
          toast.error(t('error'), t('somethingWentWrong'));
          setSaving(false);
          return;
        }
      }
      toast.success(t('saved'), t('operationCompleted'));
      setOriginalUsers(users);
    } catch (err: any) {
      if (__DEV__) console.error('Save error:', err);
      toast.error(t('error'), t('somethingWentWrong'));
    } finally {
      setSaving(false);
    }
  };

  const styles = createStyles(colors);

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary.DEFAULT}
        />
      }
    >
      <View style={styles.header}>
        <View style={styles.headerIconWrap}>
          <Shield size={22} color={colors.primary.foreground} />
        </View>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>{t('userPermissions') || 'User Permissions'}</Text>
          <Text style={styles.subtitle}>Extend Ads & Pause Ads per user</Text>
        </View>
      </View>

      {users.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No users found</Text>
        </View>
      ) : (
        <View style={styles.cardsContainer}>
          {users.map((user) => {
            const canExtend = user.can_extend_ads ?? false;
            const canPause = user.can_pause_ads ?? false;

            return (
              <View key={user.user_id} style={styles.userCard}>
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
                        {user.email || user.phone_number || 'No contact'}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.togglesCard}>
                  <View style={styles.toggleRow}>
                    <Text style={styles.toggleLabel}>Extend Ads</Text>
                    <Switch
                      value={canExtend}
                      onValueChange={(v) =>
                        setLocalPermission(user.user_id, 'can_extend_ads', v)
                      }
                      disabled={saving}
                      trackColor={{ false: '#374151', true: colors.primary.DEFAULT }}
                      thumbColor="#FFFFFF"
                    />
                  </View>
                  <View style={styles.toggleRow}>
                    <Text style={styles.toggleLabel}>Pause Ads</Text>
                    <Switch
                      value={canPause}
                      onValueChange={(v) =>
                        setLocalPermission(user.user_id, 'can_pause_ads', v)
                      }
                      disabled={saving}
                      trackColor={{ false: '#D1D5DB', true: colors.primary.DEFAULT }}
                      thumbColor="#FFFFFF"
                    />
                  </View>
                  {canPause && (
                    <View style={styles.pauseLimitRow}>
                      <Text style={styles.toggleLabel}>Daily pause limit</Text>
                      <View style={styles.pickerWrap}>
                        <Picker
                          selectedValue={user.daily_pause_limit ?? 1}
                          onValueChange={(v) => setLocalDailyPauseLimit(user.user_id, Number(v))}
                          enabled={!saving}
                          style={styles.picker}
                          itemStyle={Platform.OS === 'ios' ? styles.pickerItem : undefined}
                          {...(Platform.OS === 'android' ? { mode: 'dropdown' as const } : {})}
                        >
                          {Array.from({ length: DAILY_PAUSE_LIMIT_MAX - DAILY_PAUSE_LIMIT_MIN + 1 }, (_, i) => i + DAILY_PAUSE_LIMIT_MIN).map((n) => (
                            <Picker.Item key={n} label={String(n)} value={n} />
                          ))}
                        </Picker>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}

      <View style={styles.stickySaveWrap}>
        <TouchableOpacity
          style={[styles.saveButtonWrap, !hasChanges && styles.saveButtonWrapDisabled]}
          onPress={handleSave}
          disabled={!hasChanges || saving}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={colors.gradients?.primaryButton?.colors ?? ['#7C3AED', '#5B21B6']}
            start={colors.gradients?.primaryButton?.start ?? { x: 0, y: 0 }}
            end={colors.gradients?.primaryButton?.end ?? { x: 1, y: 0 }}
            style={styles.saveButton}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Save size={18} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>{t('save') || 'Save changes'}</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.DEFAULT,
    },
    contentContainer: {
      padding: spacing.md,
      paddingBottom: 100,
    },
    stickySaveWrap: {
      position: 'absolute',
      start: 0,
      end: 0,
      bottom: 0,
      padding: spacing.md,
      paddingBottom: spacing.lg + (Platform.OS === 'ios' ? 24 : 0),
      backgroundColor: colors.background.DEFAULT,
      borderTopWidth: 1,
      borderTopColor: colors.border?.DEFAULT ?? '#E5E7EB',
    },
    saveButtonWrap: {
      borderRadius: 16,
      overflow: 'hidden',
    },
    saveButtonWrapDisabled: {
      opacity: 0.6,
    },
    saveButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      paddingVertical: 14,
      paddingHorizontal: spacing.lg,
      borderRadius: 16,
    },
    saveButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginBottom: spacing.lg,
    },
    headerIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card?.background ?? '#F9FAFB',
      borderWidth: 1,
      borderColor: colors.border?.DEFAULT ?? '#E5E7EB',
    },
    headerTextWrap: { flex: 1 },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.foreground?.DEFAULT ?? '#111827',
    },
    subtitle: {
      fontSize: 14,
      color: colors.foreground?.muted ?? '#6B7280',
      marginTop: 2,
    },
    emptyContainer: {
      alignItems: 'center',
      paddingVertical: spacing.xl * 2,
    },
    emptyText: {
      fontSize: 16,
      color: colors.foreground?.muted ?? '#6B7280',
    },
    cardsContainer: {
      gap: spacing.md,
    },
    userCard: {
      backgroundColor: colors.card?.background ?? '#F9FAFB',
      borderRadius: borderRadius.card,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border?.DEFAULT ?? '#E5E7EB',
    },
    userCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginBottom: spacing.md,
    },
    userAvatar: {
      width: 44,
      height: 44,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#374151',
      borderWidth: 1,
      borderColor: '#E5E7EB',
    },
    userAvatarText: {
      fontSize: 18,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    userInfo: { flex: 1 },
    userName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.foreground?.DEFAULT ?? '#111827',
    },
    userContactRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 4,
    },
    userEmail: {
      fontSize: 13,
      color: colors.foreground?.muted ?? '#6B7280',
    },
    togglesCard: {
      backgroundColor: colors.card?.background ?? '#F9FAFB',
      borderRadius: 12,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border?.DEFAULT ?? '#E5E7EB',
      marginTop: 4,
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 8,
    },
    pauseLimitRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 8,
      paddingTop: 4,
      borderTopWidth: 1,
      borderTopColor: colors.border?.DEFAULT ?? '#E5E7EB',
    },
    pickerWrap: {
      minWidth: 72,
      borderWidth: 1,
      borderColor: colors.border?.DEFAULT ?? '#D1D5DB',
      borderRadius: 8,
      backgroundColor: '#FFFFFF',
    },
    picker: {
      height: Platform.OS === 'ios' ? 120 : 48,
      width: Platform.OS === 'android' ? 72 : undefined,
    },
    pickerItem: {
      fontSize: 16,
      color: '#111827',
    },
    toggleLabel: {
      fontSize: 15,
      color: colors.foreground?.DEFAULT ?? '#111827',
      fontWeight: '500',
    },
  });
