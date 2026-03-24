import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, TextInput, Alert, RefreshControl } from 'react-native';
import { ShieldCheck, Mail, Plus, Trash2, ShieldAlert } from 'lucide-react-native';
import { supabase } from '@/integrations/supabase/client';
import { spacing, borderRadius } from '@/theme/spacing';
import { toast } from '@/utils/toast';
import { inputStyleRTL } from '@/utils/rtl';
import { Text } from '@/components/common/Text';
import { useAuth } from '@/contexts/AuthContext';

interface AdminsTabProps {
  colors: any;
  t: (key: string) => string;
}

export const AdminsTab: React.FC<AdminsTabProps> = ({ colors, t }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [admins, setAdmins] = useState<any[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAdmins = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('owner-admins', {
        body: { action: 'list' },
      });

      if (error || data?.error) {
        toast.error(t('error'), t('couldNotLoadAdmins'));
        return;
      }

      setAdmins(data?.admins || []);
    } catch {
      toast.error(t('error'), t('couldNotLoadAdmins'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAdmins();
  };

  const handleAddAdmin = async () => {
    if (!newAdminEmail.trim() || !newAdminEmail.includes('@')) {
      toast.warning(t('invalidEmail'), t('pleaseEnterValidEmail'));
      return;
    }

    setIsAdding(true);
    try {
      const { data, error } = await supabase.functions.invoke('owner-admins', {
        body: { action: 'add', email: newAdminEmail.trim().toLowerCase() }
      });

      if (error || data?.error) {
        toast.error(t('error'), t('couldNotAddAdmin'));
        return;
      }

      toast.success(t('success'), t('adminAddedSuccessfully'));
      setNewAdminEmail('');
      fetchAdmins();
    } catch {
      toast.error(t('error'), t('couldNotAddAdmin'));
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveAdmin = async (adminId: string, email: string) => {
    const isSelf = email?.toLowerCase() === user?.email?.toLowerCase();

    if (isSelf) {
      toast.warning(t('notAllowed'), t('cannotRemoveYourself'));
      return;
    }

    if (admins.length <= 1) {
      toast.warning(t('notAllowed'), t('atLeastOneAdminMustRemain'));
      return;
    }

    Alert.alert(t('removeAdmin'), `${email}?`, [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('remove'),
        style: 'destructive',
        onPress: async () => {
          try {
            const { data, error } = await supabase.functions.invoke('owner-admins', {
              body: { action: 'remove', id: adminId }
            });

            if (error || data?.error) {
              const message =
                data?.error === 'cannot_remove_last_admin'
                  ? t('atLeastOneAdminMustRemain')
                  : t('couldNotRemoveAdmin');
              toast.error(t('error'), message);
              return;
            }

            toast.success(t('success'), t('adminRemovedSuccessfully'));
            fetchAdmins();
          } catch {
            toast.error(t('error'), t('couldNotRemoveAdmin'));
          }
        }
      }
    ]);
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
          <ShieldCheck size={22} color={colors.primary.foreground} />
        </View>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>Admin Accounts</Text>
          <Text style={styles.subtitle}>Manage who has full owner access</Text>
        </View>
      </View>

      {/* Add Admin Section */}
      <View style={styles.addSection}>
        <TextInput
          style={[styles.emailInput, inputStyleRTL()]}
          placeholder="admin@example.com"
          placeholderTextColor={colors.foreground.muted}
          value={newAdminEmail}
          onChangeText={setNewAdminEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
        <TouchableOpacity 
          style={[styles.addButton, isAdding && styles.addButtonDisabled]}
          onPress={handleAddAdmin}
          disabled={isAdding || !newAdminEmail.trim()}
        >
          {isAdding ? (
            <ActivityIndicator size="small" color={colors.primary.foreground} />
          ) : (
            <>
              <Plus size={20} color={colors.primary.foreground} />
              <Text style={styles.addButtonText}>Add Admin</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {admins.length === 0 ? (
        <View style={styles.emptyContainer}>
          <ShieldCheck size={48} color={colors.foreground.muted} />
          <Text style={styles.emptyText}>No admin accounts</Text>
          <Text style={styles.emptySubtext}>
            Add admin accounts to grant owner access
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.listHeaderRow}>
            <View style={styles.listHeaderLeft}>
              <Text style={styles.listTitle}>
                Admin Accounts ({admins.length})
              </Text>
              <View style={styles.protectedBadge}>
                <ShieldAlert size={12} color="#FACC15" />
                <Text style={styles.protectedBadgeText}>Protected</Text>
              </View>
            </View>
          </View>

          <View style={styles.adminsList}>
            {admins.map((admin) => {
              const isSelf = admin.email?.toLowerCase() === user?.email?.toLowerCase();
              const createdAt = admin.created_at ? new Date(admin.created_at) : null;
              const formattedDate = createdAt
                ? `${String(createdAt.getDate()).padStart(2, '0')}/${String(createdAt.getMonth() + 1).padStart(2, '0')}/${createdAt.getFullYear()}`
                : t('na');

              return (
                <View key={admin.id} style={styles.adminCard}>
                  <View style={styles.adminHeader}>
                    <View style={styles.adminAvatar}>
                      <Text style={styles.adminAvatarText}>
                        {(admin.email || 'A').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.adminInfo}>
                      <View style={styles.emailContainer}>
                        <Mail size={14} color={colors.foreground.muted} />
                        <Text style={styles.adminEmail}>{admin.email}</Text>
                        {isSelf && (
                          <View style={styles.selfBadge}>
                            <Text style={styles.selfBadgeText}>You</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.adminId}>Added on {formattedDate}</Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.deleteButton,
                        isSelf && styles.deleteButtonDisabled,
                      ]}
                      disabled={isSelf}
                      onPress={() => handleRemoveAdmin(admin.id, admin.email)}
                    >
                      <Trash2 size={16} color={isSelf ? '#4B5563' : '#EF4444'} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        </>
      )}

      <View style={styles.securityCard}>
        <Text style={styles.securityTitle}>Security notes</Text>
        <View style={styles.securityItemRow}>
          <View style={styles.securityBullet} />
          <Text style={styles.securityText}>
            Admins have full access to the admin dashboard.
          </Text>
        </View>
        <View style={styles.securityItemRow}>
          <View style={styles.securityBullet} />
          <Text style={styles.securityText}>
            You cannot remove yourself — ask another admin.
          </Text>
        </View>
        <View style={styles.securityItemRow}>
          <View style={styles.securityBullet} />
          <Text style={styles.securityText}>
            At least one admin must exist at all times.
          </Text>
        </View>
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
      backgroundColor: '#1A1A2E',
      borderWidth: 1,
      borderColor: '#2A2A3E',
    },
    headerTextWrap: {
      flex: 1,
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
    addSection: {
      marginBottom: spacing.lg,
      gap: spacing.sm,
    },
    emailInput: {
      backgroundColor: colors.input.background,
      borderWidth: 1,
      borderColor: colors.border.DEFAULT,
      borderRadius: borderRadius.input,
      padding: spacing.md,
      fontSize: 16,
      color: colors.foreground.DEFAULT,
      marginBottom: spacing.sm,
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      backgroundColor: colors.primary.DEFAULT,
      padding: spacing.md,
      borderRadius: borderRadius.card,
    },
    addButtonDisabled: {
      opacity: 0.6,
    },
    addButtonText: {
      color: colors.primary.foreground,
      fontSize: 16,
      fontWeight: '600',
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
      marginBottom: spacing.xs,
    },
    emptySubtext: {
      fontSize: 14,
      color: colors.foreground.muted,
      textAlign: 'center',
      paddingHorizontal: spacing.lg,
    },
    adminsList: {
      gap: spacing.md,
    },
    listHeaderRow: {
      marginTop: spacing.md,
      marginBottom: spacing.xs,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    listHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    listTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.foreground.DEFAULT,
    },
    protectedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 999,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      backgroundColor: 'rgba(234,179,8,0.08)',
      borderWidth: 1,
      borderColor: 'rgba(234,179,8,0.35)',
      gap: 4,
    },
    protectedBadgeText: {
      fontSize: 11,
      fontWeight: '500',
      color: '#FACC15',
    },
    adminCard: {
      backgroundColor: colors.card.background,
      borderRadius: borderRadius.card,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border.DEFAULT,
    },
    adminHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    adminAvatar: {
      width: 40,
      height: 40,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#111827',
      borderWidth: 1,
      borderColor: '#1F2937',
    },
    adminAvatarText: {
      fontSize: 18,
      fontWeight: '600',
      color: '#F9FAFB',
    },
    adminInfo: {
      flex: 1,
    },
    emailContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginBottom: 4,
      flexWrap: 'wrap',
    },
    adminEmail: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.foreground.DEFAULT,
    },
    adminId: {
      fontSize: 12,
      color: colors.foreground.muted,
    },
    selfBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
      backgroundColor: 'rgba(124,58,237,0.15)',
      borderWidth: 1,
      borderColor: 'rgba(124,58,237,0.6)',
    },
    selfBadgeText: {
      fontSize: 11,
      fontWeight: '500',
      color: colors.primary.DEFAULT,
    },
    deleteButton: {
      padding: spacing.xs,
      borderRadius: borderRadius.full,
      backgroundColor: 'rgba(239,68,68,0.08)',
      borderWidth: 1,
      borderColor: 'rgba(239,68,68,0.35)',
    },
    deleteButtonDisabled: {
      backgroundColor: 'rgba(55,65,81,0.4)',
      borderColor: 'rgba(55,65,81,0.9)',
    },
    securityCard: {
      marginTop: spacing.lg,
      padding: spacing.md,
      borderRadius: borderRadius.card,
      backgroundColor: '#111827',
      borderWidth: 1,
      borderColor: '#1F2937',
      gap: spacing.sm,
    },
    securityTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: '#E5E7EB',
    },
    securityItemRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
    },
    securityBullet: {
      width: 4,
      height: 4,
      borderRadius: 999,
      marginTop: 7,
      backgroundColor: '#6B7280',
    },
    securityText: {
      flex: 1,
      fontSize: 13,
      color: '#9CA3AF',
    },
  });

