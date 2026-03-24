import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { supabase } from '@/integrations/supabase/client';
import { AdminReviewer } from '@/types/pricing';
import { getOwnerColors } from '@/theme/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getTypographyStyles } from '@/theme/typography';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/common/Text';
import { UserCheck, Plus, Trash2, Check, X } from 'lucide-react-native';
import { toast } from '@/utils/toast';
import { spacing, borderRadius } from '@/theme/spacing';
import { inputStyleRTL } from '@/utils/rtl';

const INFO_BLUE = '#3B82F6';
const INFO_BG = 'rgba(59, 130, 246, 0.1)';

export function AdminReviewersScreen() {
  const insets = useSafeAreaInsets();
  const colors = getOwnerColors();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const typography = getTypographyStyles(language as 'ckb' | 'ar');
  const styles = createStyles(colors, insets, typography);

  const [reviewers, setReviewers] = useState<AdminReviewer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const fetchReviewers = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('owner-content', {
        body: { action: 'listAdminReviewers' },
      });

      if (error || data?.error) {
        toast.error(t('error'), t('couldNotLoadReviewers'));
        return;
      }
      setReviewers(data?.reviewers || []);
    } catch {
      toast.error(t('error'), t('couldNotLoadReviewers'));
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchReviewers();
  }, [fetchReviewers]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchReviewers();
  };

  const addReviewer = async () => {
    if (!newEmail.trim() || !newEmail.includes('@')) {
      toast.warning(t('invalidEmail'), t('pleaseEnterValidEmail'));
      return;
    }

    setIsAdding(true);
    try {
      const currentUserEmail = user?.email ?? '';
      const { data, error } = await supabase.functions.invoke('owner-content', {
        body: {
          action: 'addAdminReviewer',
          email: newEmail.trim().toLowerCase(),
          addedBy: currentUserEmail,
        },
      });

      if (error || data?.error) {
        toast.error(t('error'), t('failedToAddReviewer'));
        return;
      }
      toast.success(t('success'), t('reviewerAdded'));
      setNewEmail('');
      fetchReviewers();
    } catch {
      toast.error(t('error'), t('failedToAddReviewer'));
    } finally {
      setIsAdding(false);
    }
  };

  const removeReviewer = (reviewerId: string, email: string) => {
    Alert.alert(t('removeReviewer'), t('removeReviewerConfirm', { email }), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            const { data, error } = await supabase.functions.invoke('owner-content', {
              body: { action: 'removeAdminReviewer', reviewerId },
            });

            if (error || data?.error) {
              toast.error(t('error'), t('couldNotRemoveReviewer'));
              return;
            }
            toast.success(t('success'), t('reviewerRemoved'));
            fetchReviewers();
          } catch {
            toast.error(t('error'), t('couldNotRemoveReviewer'));
          }
        },
      },
    ]);
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const d = String(date.getDate()).padStart(2, '0');
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const y = date.getFullYear();
      return `${d}/${m}/${y}`;
    } catch {
      return '—';
    }
  };

  const renderReviewer = ({ item }: { item: AdminReviewer }) => (
    <View style={styles.reviewerCard}>
      <View style={styles.reviewerMain}>
        <Text style={styles.reviewerEmail}>{item.email}</Text>
        <Text style={styles.reviewerAddedBy}>{t('addedBy')} {item.added_by || '—'}</Text>
        <Text style={styles.reviewerDate}>{t('addedOn', { date: formatDate(item.created_at) })}</Text>
      </View>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => removeReviewer(item.id, item.email)}
      >
        <Trash2 size={18} color="#EF4444" />
      </TouchableOpacity>
    </View>
  );

  const listHeader = (
    <>
      <View style={styles.headerRow}>
        <View style={styles.headerIconWrap}>
          <UserCheck size={22} color={colors.primary.foreground} />
        </View>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>{t('adminReviewersTitle')}</Text>
          <Text style={styles.subtitle}>{t('limitedAccessRole')}</Text>
        </View>
      </View>

      <View style={styles.infoAlert}>
        <Text style={styles.infoAlertText}>
          {t('adminReviewersInfo')}
        </Text>
      </View>

      <View style={styles.addSection}>
        <TextInput
          style={[styles.input, inputStyleRTL()]}
          placeholder={t('adminEmailPlaceholder')}
          placeholderTextColor="#9CA3AF"
          value={newEmail}
          onChangeText={setNewEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TouchableOpacity
          style={[styles.addButton, isAdding && styles.addButtonDisabled]}
          onPress={addReviewer}
          disabled={isAdding || !newEmail.trim()}
        >
          {isAdding ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Plus size={18} color="#FFFFFF" />
              <Text style={styles.addButtonText}>{t('addReviewer')}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.listTitleRow}>
        <Text style={styles.listTitle}>{t('currentReviewers', { count: reviewers.length })}</Text>
        <View style={styles.reviewOnlyBadge}>
          <Text style={styles.reviewOnlyBadgeText}>{t('reviewAccessOnly')}</Text>
        </View>
      </View>
    </>
  );

  const permissionsCard = (
    <View style={styles.permissionsCard}>
      <Text style={styles.permissionsCardTitle}>{t('permissionsLabel')}</Text>
      <View style={styles.permissionRow}>
        <Check size={16} color="#22C55E" />
        <Text style={styles.permissionText}>{t('viewManageAdReviewQueue')}</Text>
      </View>
      <View style={styles.permissionRow}>
        <Check size={16} color="#22C55E" />
        <Text style={styles.permissionText}>{t('approveRejectAdContent')}</Text>
      </View>
      <View style={styles.permissionRow}>
        <Check size={16} color="#22C55E" />
        <Text style={styles.permissionText}>{t('verifyPaymentSubmissions')}</Text>
      </View>
      <View style={styles.permissionRow}>
        <X size={16} color="#EF4444" />
        <Text style={styles.permissionText}>{t('cannotAccessAppControl')}</Text>
      </View>
      <View style={styles.permissionRow}>
        <X size={16} color="#EF4444" />
        <Text style={styles.permissionText}>{t('cannotAddRemoveAdmins')}</Text>
      </View>
    </View>
  );

  if (isLoading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={reviewers}
        keyExtractor={(item) => item.id}
        renderItem={renderReviewer}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>{t('noReviewersYet')}</Text>
          </View>
        }
        ListFooterComponent={permissionsCard}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#7C3AED"
          />
        }
      />
    </View>
  );
}

const createStyles = (colors: any, insets: any, typography: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#0F0F1A',
    },
    loadingContainer: {
      flex: 1,
      backgroundColor: '#0F0F1A',
      justifyContent: 'center',
      alignItems: 'center',
    },
    listContent: {
      padding: spacing.md,
      paddingTop: insets.top + spacing.md,
    },
    headerRow: {
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
    headerTextWrap: { flex: 1 },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    subtitle: {
      fontSize: 14,
      color: '#9CA3AF',
      marginTop: 2,
    },
    infoAlert: {
      backgroundColor: INFO_BG,
      borderRadius: borderRadius.card,
      padding: spacing.md,
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: 'rgba(59, 130, 246, 0.35)',
    },
    infoAlertText: {
      fontSize: 14,
      color: INFO_BLUE,
      lineHeight: 22,
    },
    addSection: {
      marginBottom: spacing.lg,
      gap: spacing.sm,
    },
    input: {
      backgroundColor: '#1A1A2E',
      borderRadius: 16,
      paddingHorizontal: spacing.md,
      paddingVertical: 14,
      fontSize: 16,
      color: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#2A2A3E',
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      backgroundColor: '#7C3AED',
      paddingVertical: 14,
      borderRadius: 16,
    },
    addButtonDisabled: { opacity: 0.6 },
    addButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    listTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    listTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    reviewOnlyBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: 'rgba(124, 58, 237, 0.15)',
      borderWidth: 1,
      borderColor: 'rgba(124, 58, 237, 0.4)',
    },
    reviewOnlyBadgeText: {
      fontSize: 11,
      fontWeight: '500',
      color: '#A78BFA',
    },
    reviewerCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: '#1A1A2E',
      borderRadius: borderRadius.card,
      padding: spacing.md,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: '#2A2A3E',
    },
    reviewerMain: { flex: 1 },
    reviewerEmail: {
      fontSize: 16,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    reviewerAddedBy: {
      fontSize: 13,
      color: '#9CA3AF',
      marginTop: 4,
    },
    reviewerDate: {
      fontSize: 12,
      color: '#6B7280',
      marginTop: 2,
    },
    removeButton: {
      padding: spacing.sm,
      borderRadius: 8,
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      borderWidth: 1,
      borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    emptyWrap: {
      paddingVertical: spacing.xl,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 15,
      color: '#9CA3AF',
    },
    permissionsCard: {
      marginTop: spacing.lg,
      padding: spacing.md,
      borderRadius: borderRadius.card,
      backgroundColor: '#1A1A2E',
      borderWidth: 1,
      borderColor: '#2A2A3E',
      gap: spacing.sm,
    },
    permissionsCardTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: '#E5E7EB',
      marginBottom: 4,
    },
    permissionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    permissionText: {
      flex: 1,
      fontSize: 13,
      color: '#9CA3AF',
    },
  });
