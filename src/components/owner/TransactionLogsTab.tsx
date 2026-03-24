import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { DollarSign, Search, ArrowUpRight, ArrowDownRight, FileText, User, Wallet, Plus, Minus } from 'lucide-react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePricingConfig } from '@/hooks/usePricingConfig';
import { getOwnerColors } from '@/theme/colors';
import { spacing, borderRadius } from '@/theme/spacing';
import { Text } from '@/components/common/Text';
import { supabase } from '@/integrations/supabase/client';
import { formatIQDEnglish, formatNumberEnglish } from '@/utils/currency';
import { calculateTax } from '@/lib/pricing';
import { formatDateTimeNumeric } from '@/utils/dateFormat';
import { toast } from '@/utils/toast';

type FilterType = 'all' | 'spend' | 'refund' | 'deposit' | 'admin';

interface TransactionLog {
  id: string;
  user_id: string;
  campaign_id: string | null;
  amount: number;
  type: string;
  status: string | null;
  payment_method: string | null;
  description: string | null;
  created_at: string;
  user_name: string | null;
  user_email: string | null;
  user_phone: string | null;
  wallet_balance: number;
  campaign_title: string | null;
  campaign_video_url: string | null;
}

interface TransactionLogsResponse {
  success: boolean;
  transactions: TransactionLog[];
  has_more: boolean;
}

export const TransactionLogsTab: React.FC = () => {
  const { t, language, isRTL } = useLanguage();
  const { exchange_rate } = usePricingConfig();
  const colors = getOwnerColors();
  const styles = useMemo(() => createStyles(colors, isRTL), [colors, isRTL]);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [logs, setLogs] = useState<TransactionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  const [modalUser, setModalUser] = useState<TransactionLog | null>(null);
  const [modalMode, setModalMode] = useState<'credit' | 'debit'>('credit');
  const [modalAmountIqd, setModalAmountIqd] = useState('');
  const [modalNote, setModalNote] = useState('');
  const [modalSubmitting, setModalSubmitting] = useState(false);

  const translateFilterLabel = (ft: FilterType) => {
    switch (ft) {
      case 'all':
        return language === 'ar' ? 'الكل' : 'هەموو';
      case 'spend':
        return language === 'ar' ? 'خَرج الإعلانات' : 'خەرجکردنی ڕیکلام';
      case 'refund':
        return language === 'ar' ? 'گەڕاندنەوە' : 'گەڕاندنەوە';
      case 'deposit':
        return language === 'ar' ? 'پڕکردنەوە' : 'پڕکردنەوە';
      case 'admin':
        return language === 'ar' ? 'عمەلیات ئەدمین' : 'کردارەکانی ئەدمین';
      default:
        return ft;
    }
  };

  const typeMeta = (type: string) => {
    const base = type.toLowerCase();
    if (base === 'spend' || base === 'campaign_payment' || base === 'payment') {
      return {
        label: language === 'ar' ? 'خەرجکردن' : 'خەرجکردن',
        bg: '#FEE2E2',
        fg: '#B91C1C',
      };
    }
    if (base === 'refund') {
      return {
        label: language === 'ar' ? 'گەڕاندنەوە' : 'گەڕاندنەوە',
        bg: '#DCFCE7',
        fg: '#15803D',
      };
    }
    if (base === 'deposit' || base === 'topup') {
      return {
        label: language === 'ar' ? 'پڕکردنەوە' : 'پڕکردنەوە',
        bg: '#ECFEFF',
        fg: '#047857',
      };
    }
    if (base === 'admin_debit') {
      return {
        label: language === 'ar' ? 'کەمکردنەوەی ئەدمین' : 'کەمکردنەوەی ئەدمین',
        bg: '#FFEDD5',
        fg: '#C05621',
      };
    }
    if (base === 'admin_credit') {
      return {
        label: language === 'ar' ? 'زیادکردنی ئەدمین' : 'زیادکردنی ئەدمین',
        bg: '#DBEAFE',
        fg: '#1D4ED8',
      };
    }
    return {
      label: base,
      bg: '#E5E7EB',
      fg: '#374151',
    };
  };

  const paymentMethodLabel = (method: string | null) => {
    const m = (method || '').toLowerCase();
    if (!m) return language === 'ar' ? 'نەزانراو' : 'نەزانراو';
    if (m.includes('wallet')) return language === 'ar' ? 'جزدان' : 'جزدان';
    if (m.includes('fastpay')) return language === 'ar' ? 'فاست پاي' : 'فاستپەی';
    if (m.includes('fib')) return 'FIB';
    if (m.includes('qi')) return language === 'ar' ? 'کارت کی' : 'کارت کی';
    if (m.includes('admin_credit')) return language === 'ar' ? 'زیادکردنی ئەدمین' : 'زیادکردنی ئەدمین';
    if (m.includes('admin_debit')) return language === 'ar' ? 'کەمکردنەوەی ئەدمین' : 'کەمکردنەوەی ئەدمین';
    return m;
  };

  const fetchLogs = useCallback(
    async (opts?: { append?: boolean; newOffset?: number }) => {
      const useAppend = !!opts?.append;
      const nextOffset = opts?.newOffset ?? (useAppend ? offset : 0);
      if (useAppend) setLoadingMore(true);
      else {
        setLoading(true);
        setOffset(nextOffset);
      }
      try {
        const { data, error } = await supabase.functions.invoke<TransactionLogsResponse>('balance-request', {
          body: {
            action: 'transaction-logs',
            search: search.trim() || undefined,
            type_filter: filter,
            offset: nextOffset,
            limit: 50,
          },
        });
        if (error) {
          console.error('[TransactionLogs] invoke error', error);
          toast.error(language === 'ar' ? 'هەڵە' : 'هەڵە', language === 'ar' ? 'نەتوانرا مێژووی مامەڵەکان بخوێنرێتەوە' : 'نەتوانرا مێژووی مامەڵەکان بخوێنرێتەوە');
          return;
        }
        if (!data?.success) {
          toast.error(language === 'ar' ? 'هەڵە' : 'هەڵە', data && 'error' in data ? (data as any).error : language === 'ar' ? 'نەتوانرا مێژوو بخوێنرێتەوە' : 'نەتوانرا مێژوو بخوێنرێتەوە');
          return;
        }
        const rows = data.transactions || [];
        setHasMore(!!data.has_more);
        if (useAppend) {
          setLogs((prev) => [...prev, ...rows]);
          setOffset(nextOffset);
        } else {
          setLogs(rows);
          setOffset(nextOffset);
        }
      } catch (e: any) {
        console.error('[TransactionLogs] fetch failed', e);
        toast.error(language === 'ar' ? 'هەڵە' : 'هەڵە', language === 'ar' ? 'نەتوانرا مێژوو بخوێنرێتەوە' : 'نەتوانرا مێژووی مامەڵەکان بخوێنرێتەوە');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [filter, language, offset, search, exchange_rate],
  );

  useEffect(() => {
    fetchLogs({ append: false, newOffset: 0 });
  }, [filter]);

  const onSubmitSearch = () => {
    Keyboard.dismiss();
    fetchLogs({ append: false, newOffset: 0 });
  };

  const openCreditModal = (tx: TransactionLog) => {
    setModalUser(tx);
    setModalMode('credit');
    setModalAmountIqd('');
    setModalNote('');
  };

  const openDebitModal = (tx: TransactionLog) => {
    setModalUser(tx);
    setModalMode('debit');
    setModalAmountIqd('');
    setModalNote('');
  };

  const closeModal = () => {
    setModalUser(null);
    setModalMode('credit');
    setModalAmountIqd('');
    setModalNote('');
    setModalSubmitting(false);
  };

  const handleChangeIqd = (value: string) => {
    const cleaned = value.replace(/[^0-9]/g, '');
    setModalAmountIqd(cleaned);
  };

  const handleSubmitModal = async () => {
    if (!modalUser) return;
    const userId = modalUser.user_id;
    setModalSubmitting(true);
    try {
      if (modalMode === 'credit') {
        const cleaned = modalAmountIqd.replace(/[^0-9]/g, '');
        if (!cleaned) {
          toast.warning(language === 'ar' ? 'المبلغ مطلوب' : 'بڕی پارە پێویستە');
          setModalSubmitting(false);
          return;
        }
        const { data, error } = await supabase.functions.invoke('balance-request', {
          body: {
            action: 'direct-credit',
            user_id: userId,
            amount_iqd: cleaned,
            note: modalNote || undefined,
          },
        });
        if (error || (data as any)?.success === false) {
          console.error('[TransactionLogs] direct-credit error', error || (data as any)?.error);
          toast.error(language === 'ar' ? 'هەڵە' : 'هەڵە', language === 'ar' ? 'نەتوانرا باڵانس زیادبکرێت' : 'نەتوانرا باڵانس زیاد بکرێتەوە');
          setModalSubmitting(false);
          return;
        }
        toast.success(language === 'ar' ? 'زیادکرا' : 'زیادکرا', language === 'ar' ? 'تمت إضافة الرصيد' : 'باڵانس زیادکرا');
      } else {
        const cleaned = modalAmountIqd.replace(/[^0-9]/g, '');
        if (!cleaned) {
          toast.warning(language === 'ar' ? 'المبلغ مطلوب' : 'بڕی پارە پێویستە');
          setModalSubmitting(false);
          return;
        }
        const { data, error } = await supabase.functions.invoke('balance-request', {
          body: {
            action: 'direct-debit',
            user_id: userId,
            amount_iqd: cleaned,
            note: modalNote || undefined,
          },
        });
        if (error || (data as any)?.success === false) {
          console.error('[TransactionLogs] direct-debit error', error || (data as any)?.error);
          toast.error(language === 'ar' ? 'هەڵە' : 'هەڵە', language === 'ar' ? 'نەتوانرا باڵانس کەمبکرێت' : 'نەتوانرا باڵانس کەم بکرێتەوە');
          setModalSubmitting(false);
          return;
        }
        toast.success(language === 'ar' ? 'کەمکرا' : 'کەمکرا', language === 'ar' ? 'تم خصم الرصيد' : 'باڵانس کەمکرایەوە');
      }
      closeModal();
      fetchLogs({ append: false, newOffset: 0 });
    } catch (e: any) {
      console.error('[TransactionLogs] submit modal error', e);
      toast.error(language === 'ar' ? 'هەڵە' : 'هەڵە', language === 'ar' ? 'هەڵەیەک ڕوویدا' : 'هەڵەیەک ڕوویدا');
      setModalSubmitting(false);
    }
  };

  const renderItem = ({ item }: { item: TransactionLog }) => {
    const isPositive = item.amount > 0;
    const absUsd = Math.abs(item.amount);
    const baseType = (item.type || '').toLowerCase();
    const isRefund = baseType === 'refund';
    const hasTax =
      baseType === 'spend' ||
      baseType === 'payment' ||
      baseType === 'campaign_payment' ||
      baseType === 'campaign_spend';

    let totalIqd = 0;
    let budgetIqd = 0;
    let taxIqd = 0;

    if (hasTax) {
      const taxUsd = calculateTax(absUsd);
      budgetIqd = Math.floor(absUsd * exchange_rate);
      taxIqd = Math.floor(taxUsd * exchange_rate);
      totalIqd = budgetIqd + taxIqd;
    } else {
      // For refunds and non-tax types, DB amount already represents full value
      totalIqd = Math.floor(absUsd * exchange_rate);
    }

    const signPrefix = isPositive ? '+' : '-';
    const mainAmountText = `${signPrefix}${formatNumberEnglish(totalIqd)} IQD`;
    const meta = typeMeta(item.type);

    const primaryContact = item.user_email || item.user_phone || '';

    return (
      <View style={styles.card}>
        {/* Header: User info + type badge */}
        <View style={styles.cardHeader}>
          <View style={styles.userInfo}>
            <View style={styles.avatarCircle}>
              <User size={16} color={colors.primary.DEFAULT} />
            </View>
            <View style={styles.userText}>
              <Text style={styles.userName} numberOfLines={1}>
                {item.user_name || (language === 'ar' ? 'بەکارهێنەر' : 'بەکارهێنەر')}
              </Text>
              {primaryContact ? (
                <Text style={styles.userContact} numberOfLines={1}>
                  {primaryContact}
                </Text>
              ) : null}
            </View>
          </View>
          <View style={[styles.typeBadge, { backgroundColor: meta.bg, borderColor: meta.fg }]}>
            <Text style={[styles.typeBadgeText, { color: meta.fg }]} numberOfLines={1}>
              {meta.label}
            </Text>
          </View>
        </View>

        {/* Campaign info */}
        {item.campaign_id && (
          <View style={styles.campaignRow}>
            <View style={styles.campaignLeft}>
              <FileText size={14} color={colors.foreground.muted} />
              <Text style={styles.campaignTitle} numberOfLines={1}>
                {item.campaign_title || (language === 'ar' ? 'کامپەین' : 'کامپەین')}
              </Text>
            </View>
            {item.campaign_video_url ? (
              <ArrowUpRight size={14} color={colors.primary.DEFAULT} />
            ) : null}
          </View>
        )}

        {/* Amount + balance */}
        <View style={styles.amountRow}>
          <View style={styles.amountLeft}>
            <View style={styles.amountIconCircle}>
              {isPositive ? (
                <ArrowUpRight size={14} color="#16A34A" />
              ) : (
                <ArrowDownRight size={14} color="#DC2626" />
              )}
            </View>
            <View>
              <Text style={[styles.amountText, { color: isPositive ? '#16A34A' : '#DC2626' }]}>
                {mainAmountText}
              </Text>
              {hasTax && (
                <Text style={styles.taxBreakdownText}>
                  {`Budget ${formatNumberEnglish(budgetIqd)} IQD + Tax ${formatNumberEnglish(
                    taxIqd,
                  )} IQD`}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.balanceRow}>
            <Wallet size={14} color={colors.foreground.muted} />
            <Text style={styles.balanceText}>
              {language === 'ar' ? 'باڵانس (USD)' : 'باڵانس (USD)'}: {item.wallet_balance}
            </Text>
          </View>
        </View>

        {/* Description, method, date */}
        <View style={styles.metaRow}>
          {!!item.description && (
            <Text style={styles.descriptionText} numberOfLines={2}>
              {item.description}
            </Text>
          )}
          <View style={styles.metaBadgesRow}>
            <View style={styles.metaBadge}>
              <Text style={styles.metaBadgeText}>
                {paymentMethodLabel(item.payment_method)}
              </Text>
            </View>
            <View style={styles.metaBadge}>
              <Text style={styles.metaBadgeText}>
                {formatDateTimeNumeric(new Date(item.created_at))}
              </Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => openCreditModal(item)}
            activeOpacity={0.85}
          >
            <Plus size={14} color="#16A34A" />
            <Text style={[styles.actionButtonText, { color: '#16A34A' }]}>
              {language === 'ar' ? 'زیادکردنی باڵانس' : 'زیادکردنی باڵانس'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => openDebitModal(item)}
            activeOpacity={0.85}
          >
            <Minus size={14} color="#DC2626" />
            <Text style={[styles.actionButtonText, { color: '#DC2626' }]}>
              {language === 'ar' ? 'کەمکردنەوە' : 'کەمکردنەوە'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search + filters */}
      <View style={styles.searchRow}>
        <View style={styles.searchInputWrap}>
          <Search size={16} color={colors.foreground.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder={language === 'ar' ? 'گەڕان بە ناو، ئیمەیل، ژمارە...' : 'گەڕان بە ناو، ئیمەیل، ژمارە...'}
            placeholderTextColor={colors.foreground.muted}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={onSubmitSearch}
            returnKeyType="search"
          />
        </View>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={() => fetchLogs({ append: false, newOffset: 0 })}
          activeOpacity={0.8}
        >
          <Text style={styles.refreshButtonText}>{language === 'ar' ? 'نوێکردنەوە' : 'نوێکردنەوە'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
        {(['all', 'spend', 'refund', 'deposit', 'admin'] as FilterType[]).map((ft) => {
          const active = filter === ft;
          return (
            <TouchableOpacity
              key={ft}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setFilter(ft)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.filterChipText,
                  active && styles.filterChipTextActive,
                ]}
              >
                {translateFilterLabel(ft)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
        </View>
      ) : logs.length === 0 ? (
        <View style={styles.emptyState}>
          <DollarSign size={40} color={colors.foreground.muted} />
          <Text style={styles.emptyTitle}>
            {language === 'ar' ? 'هیچ مامەڵەیەک نییە' : 'هیچ مامەڵەیەک نییە'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListFooterComponent={
            hasMore ? (
              <TouchableOpacity
                style={styles.loadMoreButton}
                onPress={() => fetchLogs({ append: true, newOffset: offset + 50 })}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <ActivityIndicator size="small" color={colors.primary.DEFAULT} />
                ) : (
                  <Text style={styles.loadMoreText}>
                    {language === 'ar' ? 'زیاتر ببینە' : 'زیاتر ببینە'}
                  </Text>
                )}
              </TouchableOpacity>
            ) : null
          }
        />
      )}

      {/* Simple inline modal replacement (bottom sheet style) */}
      {modalUser && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {modalMode === 'credit'
                ? language === 'ar'
                  ? 'زیادکردنی باڵانس'
                  : 'زیادکردنی باڵانس'
                : language === 'ar'
                ? 'کەمکردنەوەی باڵانس'
                : 'کەمکردنەوەی باڵانس'}
            </Text>
            <Text style={styles.modalSubtitle}>
              {modalUser.user_name || modalUser.user_email || modalUser.user_phone || ''}
            </Text>
            <Text style={styles.modalSubtitle}>
              {language === 'ar' ? 'باڵانسی ئێستا (USD)' : 'باڵانسی ئێستا (USD)'}: {modalUser.wallet_balance}
            </Text>

            <Text style={styles.modalLabel}>{language === 'ar' ? 'بڕی IQD' : 'بڕ (IQD)'}</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="number-pad"
              value={modalAmountIqd}
              onChangeText={handleChangeIqd}
            />

            <Text style={styles.modalLabel}>{language === 'ar' ? 'تێبینی (هەڵبژاردەیی)' : 'تێبینی (هەڵبژاردەیی)'}</Text>
            <TextInput
              style={[styles.modalInput, styles.modalInputNote]}
              multiline
              value={modalNote}
              onChangeText={setModalNote}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={closeModal}
                disabled={modalSubmitting}
              >
                <Text style={styles.modalCancelText}>
                  {language === 'ar' ? 'داخستن' : 'داخستن'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalPrimaryButton,
                  modalMode === 'debit' && { backgroundColor: '#DC2626' },
                ]}
                onPress={handleSubmitModal}
                disabled={modalSubmitting}
              >
                {modalSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalPrimaryText}>
                    {modalMode === 'credit'
                      ? language === 'ar'
                        ? 'زیادکردن'
                        : 'زیادکردن'
                      : language === 'ar'
                      ? 'کەمکردنەوە'
                      : 'کەمکردنەوە'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const createStyles = (colors: any, isRTL?: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#FFFFFF',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
      gap: spacing.sm,
    },
    searchInputWrap: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#F9FAFB',
      borderRadius: 999,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      gap: spacing.xs,
    },
    searchInput: {
      flex: 1,
      paddingVertical: 6,
      fontSize: 14,
      color: colors.foreground.DEFAULT,
      textAlign: isRTL ? 'right' : 'left',
    },
    refreshButton: {
      borderRadius: 999,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderWidth: 1,
      borderColor: colors.primary.DEFAULT,
      backgroundColor: '#FFFFFF',
    },
    refreshButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.primary.DEFAULT,
    },
    filterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
      gap: spacing.sm,
    },
    filterChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs + 2,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      backgroundColor: '#FFFFFF',
    },
    filterChipActive: {
      backgroundColor: colors.primary.DEFAULT,
      borderColor: colors.primary.DEFAULT,
    },
    filterChipText: {
      fontSize: 13,
      color: colors.foreground.muted,
    },
    filterChipTextActive: {
      color: colors.primary.foreground,
      fontWeight: '600',
    },
    listContent: {
      padding: spacing.md,
      paddingBottom: spacing.xl * 2,
      gap: spacing.md,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xl,
    },
    emptyTitle: {
      marginTop: spacing.md,
      fontSize: 16,
      color: colors.foreground.muted,
    },
    card: {
      borderRadius: borderRadius.card,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      backgroundColor: '#FFFFFF',
      padding: spacing.md,
      gap: spacing.sm,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.md,
    },
    userInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      flex: 1,
      minWidth: 0,
    },
    avatarCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: '#EEF2FF',
      justifyContent: 'center',
      alignItems: 'center',
    },
    userText: {
      flex: 1,
      minWidth: 0,
    },
    userName: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.foreground.DEFAULT,
    },
    userContact: {
      marginTop: 2,
      fontSize: 12,
      color: colors.foreground.muted,
    },
    typeBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: 999,
      borderWidth: 1,
      minWidth: 80,
      alignItems: 'center',
      justifyContent: 'center',
    },
    typeBadgeText: {
      fontSize: 11,
      fontWeight: '600',
    },
    campaignRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    campaignLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      flex: 1,
      minWidth: 0,
    },
    campaignTitle: {
      fontSize: 13,
      color: colors.foreground.DEFAULT,
    },
    amountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    amountLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      flex: 1,
      minWidth: 0,
    },
    amountIconCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: '#F9FAFB',
      justifyContent: 'center',
      alignItems: 'center',
    },
    amountText: {
      fontSize: 14,
      fontWeight: '600',
    },
    taxBreakdownText: {
      marginTop: 2,
      fontSize: 11,
      color: colors.foreground.muted,
    },
    balanceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    balanceText: {
      fontSize: 12,
      color: colors.foreground.muted,
    },
    metaRow: {
      gap: spacing.xs,
    },
    descriptionText: {
      fontSize: 12,
      color: colors.foreground.muted,
    },
    metaBadgesRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
      marginTop: 2,
    },
    metaBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: 999,
      backgroundColor: '#F3F4F6',
    },
    metaBadgeText: {
      fontSize: 11,
      color: colors.foreground.muted,
    },
    actionsRow: {
      marginTop: spacing.sm,
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: '#E5E7EB',
      paddingTop: spacing.sm,
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.button,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      backgroundColor: '#FFFFFF',
    },
    actionButtonText: {
      fontSize: 13,
      fontWeight: '600',
    },
    loadMoreButton: {
      marginTop: spacing.md,
      borderRadius: borderRadius.button,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      borderWidth: 1,
      borderColor: colors.primary.DEFAULT,
      alignSelf: 'center',
    },
    loadMoreText: {
      fontSize: 14,
      color: colors.primary.DEFAULT,
      fontWeight: '600',
    },
    modalOverlay: {
      position: 'absolute',
      start: 0,
      top: 0,
      end: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.lg,
    },
    modalCard: {
      width: '100%',
      borderRadius: 24,
      padding: spacing.lg,
      backgroundColor: '#FFFFFF',
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.foreground.DEFAULT,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    modalSubtitle: {
      fontSize: 13,
      color: colors.foreground.muted,
      textAlign: 'center',
      marginBottom: spacing.xs,
    },
    modalLabel: {
      marginTop: spacing.md,
      fontSize: 13,
      color: colors.foreground.DEFAULT,
    },
    modalInput: {
      marginTop: spacing.xs,
      borderRadius: borderRadius.input,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      fontSize: 14,
      color: colors.foreground.DEFAULT,
      backgroundColor: '#F9FAFB',
    },
    modalInputNote: {
      minHeight: 72,
      textAlignVertical: 'top',
    },
    modalHint: {
      marginTop: spacing.xs,
      fontSize: 12,
      color: colors.foreground.muted,
    },
    modalActions: {
      marginTop: spacing.lg,
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    modalCancelButton: {
      flex: 1,
      borderRadius: borderRadius.button,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      paddingVertical: spacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FFFFFF',
    },
    modalCancelText: {
      fontSize: 14,
      color: colors.foreground.DEFAULT,
    },
    modalPrimaryButton: {
      flex: 1,
      borderRadius: borderRadius.button,
      paddingVertical: spacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary.DEFAULT,
    },
    modalPrimaryText: {
      fontSize: 14,
      color: colors.primary.foreground,
      fontWeight: '600',
    },
  });

