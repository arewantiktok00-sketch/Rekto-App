import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabaseRead } from '@/integrations/supabase/client';
import { ArrowUpRight, FileText } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, borderRadius } from '@/theme/spacing';
import { getTypographyStyles } from '@/theme/typography';
import { format } from 'date-fns';
import { Text } from '@/components/common/Text';
import { isRTL, rtlText, rtlRow, rtlIcon, ltrNumber } from '@/utils/rtl';
import { ScreenHeader } from '@/components/common/ScreenHeader';

interface Transaction {
  id: string;
  type: 'payment' | 'topup' | 'refund';
  amount: number;
  status: string;
  description: string;
  created_at: string;
  campaign_id?: string;
}

export function TransactionHistory() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const rtl = isRTL(language);
  const { colors } = useTheme();
  const typography = getTypographyStyles(language as 'ckb' | 'ar');
  const styles = createStyles(colors, insets, typography, rtl);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<'all' | 'payment' | 'topup' | 'refund'>('all');

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user]);

  const fetchTransactions = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabaseRead
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      if (data) setTransactions(data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'topup':
        return colors.success;
      case 'refund':
        return colors.info;
      case 'payment':
        return colors.error;
      default:
        return colors.foreground.muted;
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'topup':
        return '+';
      case 'refund':
        return '↩';
      case 'payment':
        return '-';
      default:
        return '';
    }
  };

  const filteredTransactions =
    filter === 'all'
      ? transactions
      : transactions.filter((tx) => tx.type === filter);

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
        </View>
      )}
      <ScreenHeader
        title={t('transactionHistory') || 'Transaction History'}
        onBack={() => navigation.goBack()}
        style={{ paddingTop: insets.top + 8 }}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 16, width: '100%' }}>
        {/* Filters */}
        <View style={[styles.filterRow, rtlRow(rtl)]}>
          {[
            { key: 'all', label: t('all') || 'All' },
            { key: 'payment', label: t('adSpend') || 'Ad Spend' },
            { key: 'topup', label: t('topup') || 'Top-up' },
            { key: 'refund', label: t('refund') || 'Refund' },
          ].map((f) => {
            const isActive = filter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterPill, isActive && styles.filterPillActive]}
                onPress={() => setFilter(f.key as any)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.filterText,
                    isActive && styles.filterTextActive,
                    rtlText(rtl),
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {filteredTransactions.length === 0 ? (
          <View style={styles.emptyState}>
            <FileText size={64} color={colors.foreground.muted} />
            <Text style={[styles.emptyText, rtlText(rtl)]}>{t('noTransactions') || 'No Transactions'}</Text>
            <Text style={[styles.emptySubtext, rtlText(rtl)]}>
              {t('transactionHistoryEmpty') || 'Your transaction history will appear here'}
            </Text>
          </View>
        ) : (
          filteredTransactions.map((transaction) => {
            const color = getTransactionColor(transaction.type);
            const isPositive = transaction.type === 'topup' || transaction.type === 'refund';
            const sign = isPositive ? '+' : '-';
            const amountText = `${sign}$${Math.abs(transaction.amount).toFixed(2)}`;

            return (
              <TouchableOpacity
                key={transaction.id}
                style={[styles.transactionCard, rtlRow(rtl)]}
                activeOpacity={0.8}
                onPress={() => {
                  if (transaction.campaign_id) {
                    navigation.navigate('Invoice' as never, { id: transaction.campaign_id } as never);
                  }
                }}
              >
              <View style={[styles.transactionLeft, rtlRow(rtl)]}>
                  <View style={styles.transactionIconContainer}>
                    <ArrowUpRight size={18} color={colors.foreground.muted} />
                  </View>
                <View style={styles.transactionInfo}>
                  <Text style={[styles.transactionType, rtlText(rtl)]} numberOfLines={1}>
                      {t(transaction.type) ||
                        transaction.type.charAt(0).toUpperCase() +
                          transaction.type.slice(1)}
                  </Text>
                  <Text style={[styles.transactionDate, ltrNumber]}>
                      {format(new Date(transaction.created_at), 'MMM dd, yyyy')}
                  </Text>
                </View>
              </View>
              <View style={[styles.transactionRight, rtl && styles.transactionRightRTL]}>
                  <Text style={[styles.transactionAmount, ltrNumber, { color }]}>
                    {amountText}
                </Text>
                  <View
                    style={[
                  styles.statusBadge, 
                      transaction.status === 'completed' &&
                        styles.statusBadgeCompleted,
                      transaction.status === 'pending' &&
                        styles.statusBadgePending,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        transaction.status === 'completed' && styles.statusTextCompleted,
                        transaction.status === 'pending' && styles.statusTextPending,
                        rtlText(rtl),
                      ]}
                      numberOfLines={1}
                    >
                      {transaction.status}
                    </Text>
                </View>
              </View>
              </TouchableOpacity>
            );
          })
        )}
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any, insets: any, typography: any, rtl?: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.DEFAULT,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowReverse: {
    flexDirection: 'row',
  },
  textRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: spacing.sm,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  filterPill: {
    paddingStart: spacing.md,
    paddingEnd: spacing.md,
    paddingVertical: spacing.sm - 2,
    borderRadius: 999,
    backgroundColor: colors.background.secondary,
    marginEnd: spacing.sm,
  },
  filterPillActive: {
    backgroundColor: '#7C3AED',
  },
  filterText: {
    ...typography.caption,
    fontSize: 13,
    color: colors.foreground.muted,
    fontWeight: '500',
  },
  filterTextActive: {
    ...typography.caption,
    color: colors.primary.foreground,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    ...typography.h2,
    fontSize: 18,
    color: colors.foreground.DEFAULT,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    ...typography.bodySmall,
    fontSize: 14,
    color: colors.foreground.muted,
    textAlign: 'center',
  },
  transactionCard: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.card.background,
    padding: spacing.md + 4,
    borderRadius: borderRadius.card,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  transactionLeft: {
    flexDirection: 'row',
    flex: 1,
    gap: spacing.md,
  },
  transactionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
  },
  transactionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionIconText: {
    fontSize: 20,
    fontWeight: '700',
  },
  transactionInfo: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  transactionType: {
    ...typography.label,
    fontSize: 14,
    color: colors.foreground.DEFAULT,
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  transactionDescription: {
    ...typography.bodySmall,
    fontSize: 14,
    color: colors.foreground.muted,
    marginBottom: 4,
  },
  transactionDate: {
    ...typography.caption,
    fontSize: 11,
    color: colors.foreground.muted,
  },
  transactionRight: {
    alignItems: 'flex-end',
    marginStart: spacing.sm,
    flexShrink: 0,
  },
  transactionRightRTL: {
    alignItems: 'flex-start',
  },
  transactionAmount: {
    ...typography.body,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  statusBadge: {
    paddingStart: spacing.sm + 2,
    paddingEnd: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: borderRadius.badge || 12,
    backgroundColor: colors.background.secondary || colors.foreground.muted + '20',
  },
  statusBadgePending: {
    backgroundColor: '#F59E0B20',
  },
  statusTextPending: {
    color: '#F59E0B',
  },
  statusBadgeCompleted: {
    backgroundColor: colors.status.active.bg,
  },
  statusText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.foreground.muted,
    textTransform: 'capitalize',
  },
  statusTextCompleted: {
    color: colors.status.active.text,
  },
});
