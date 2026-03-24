import { ScreenHeader } from '@/components/common/ScreenHeader';
import { Text } from '@/components/common/Text';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { usePricingConfig } from '@/hooks/usePricingConfig';
import { supabaseRead } from '@/integrations/supabase/client';
import { borderRadius, spacing } from '@/theme/spacing';
import { updateWidgetBalance } from '@/utils/widgetBridge';
import { getTypographyStyles } from '@/theme/typography';
import { formatIQD } from '@/utils/currency';
import { isRTL, ltrNumber, rtlRow, rtlText } from '@/utils/rtl';
import { useNavigation } from '@react-navigation/native';
import { ArrowDown, Clock, Plus } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const walletT = {
  title: { ckb: 'جزدان و باڵانس', ar: 'المحفظة والرصيد' },
  currentBalance: { ckb: 'باڵانسی ئێستا', ar: 'الرصيد الحالي' },
  available: { ckb: 'بەردەست', ar: 'المتاح' },
  pending: { ckb: 'چاوەڕوان', ar: 'قيد الانتظار' },
  addFunds: { ckb: 'باڵانس زیاد بکە', ar: 'إضافة رصيد' },
  recentRequests: { ckb: 'داواکاریە نوێیەکان', ar: 'الطلبات الأخيرة' },
  approved: { ckb: 'پەسەندکرا', ar: 'تمت الموافقة' },
  rejected: { ckb: 'ڕەتکراوە', ar: 'مرفوض' },
  infoText: {
    ckb: 'باڵانسی جزدانت بۆ بەکارهێنانی ڕیکلام لە ڕێکتۆ بەکاردەهێنرێت. باڵانس زیاد بکە بۆ دەستپێکردن یان بەردەوامبوونی کامپەینەکانت.',
    ar: 'رصيد محفظتك يُستخدم لإعلانات ريكتو. أضف رصيداً للبدء أو متابعة حملاتك.',
  },
};

interface BalanceRequestRow {
  id: string;
  amount_iqd: string;
  payment_method: string;
  status: string;
  rejection_reason?: string | null;
  approved_amount_iqd?: string | null;
  created_at: string;
}

export function WalletBalance() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { convertToIQD } = usePricingConfig();
  const rtl = isRTL(language);
  const { colors } = useTheme();
  const typography = getTypographyStyles(language as 'ckb' | 'ar');
  const styles = createStyles(colors, insets, typography, rtl);
  const initialLoadDone = useRef(false);
  const [balance, setBalance] = useState(0);
  const [pendingBalance, setPendingBalance] = useState(0);
  const [requests, setRequests] = useState<BalanceRequestRow[]>([]);

  const w = (key: keyof typeof walletT) => walletT[key]?.[language === 'ar' ? 'ar' : 'ckb'] ?? key;

  useEffect(() => {
    if (!user) return;

    const profileChannel = supabaseRead
      .channel(`wallet-profile-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchBalance();
        }
      )
      .subscribe();

    const transactionsChannel = supabaseRead
      .channel(`wallet-transactions-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchBalance();
        }
      )
      .subscribe();

    const requestsChannel = supabaseRead
      .channel(`balance-requests-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'balance_requests',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      supabaseRead.removeChannel(profileChannel);
      supabaseRead.removeChannel(transactionsChannel);
      supabaseRead.removeChannel(requestsChannel);
    };
  }, [user]);

  const fetchBalance = async () => {
    if (!user) return;
    try {
      const { data } = await supabaseRead
        .from('profiles')
        .select('wallet_balance')
        .eq('user_id', user.id)
        .maybeSingle();
      const availUsd = data?.wallet_balance ?? 0;
      setBalance(availUsd);
      const { data: pendingReqs } = await supabaseRead
        .from('balance_requests')
        .select('amount_iqd')
        .eq('user_id', user.id)
        .eq('status', 'pending');
      let pendIqd = 0;
      if (pendingReqs?.length) {
        pendIqd = pendingReqs.reduce((sum, r) => sum + Number(r.amount_iqd?.replace(/,/g, '') || 0), 0);
        setPendingBalance(pendIqd);
      } else setPendingBalance(0);
      updateWidgetBalance(convertToIQD(availUsd), pendIqd);
    } catch (e) { console.error('Error fetching balance:', e); }
    initialLoadDone.current = true;
  };

  const fetchRequests = async () => {
    if (!user) return;
    try {
      const { data } = await supabaseRead
        .from('balance_requests')
        .select('id, amount_iqd, payment_method, status, rejection_reason, approved_amount_iqd, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (data) setRequests(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchBalance();
    fetchRequests();
  }, [user]);

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={w('title')}
        onBack={() => navigation.goBack()}
        style={{ paddingTop: insets.top + 8 }}
      />
      <View style={styles.contentArea}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 16, width: '100%' }}>
        {/* Current Balance Card - purple gradient */}
        <LinearGradient
          colors={['#7C3AED', '#6D28D9']}
          style={styles.balanceCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={[styles.balanceLabel, rtlText(rtl)]}>{w('currentBalance')}</Text>
          <Text style={[styles.balanceAmount, ltrNumber]}>{formatIQD(convertToIQD(balance))}</Text>
        </LinearGradient>

        {/* Available / Pending - two cards side by side (USD in state, display IQD) */}
        <View style={[styles.statsRow, rtlRow(rtl)]}>
          <View style={styles.statBox}>
            <ArrowDown size={20} color="#22C55E" style={{ marginBottom: 4 }} />
            <Text style={[styles.statLabel, rtlText(rtl)]}>{w('available')}</Text>
            <Text style={[styles.statValue, ltrNumber]}>{formatIQD(convertToIQD(balance))}</Text>
          </View>
          <View style={styles.statBox}>
            <Clock size={20} color="#F59E0B" style={{ marginBottom: 4 }} />
            <Text style={[styles.statLabel, rtlText(rtl)]}>{w('pending')}</Text>
            <Text style={[styles.statValue, ltrNumber]}>{formatIQD(pendingBalance)}</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={[styles.infoText, rtlText(rtl)]}>{w('infoText')}</Text>
        </View>

        <TouchableOpacity
          style={styles.addFundsButtonWrap}
          onPress={() => navigation.navigate('AddBalance' as never)}
        >
          <LinearGradient
            colors={['#7C3AED', '#6D28D9']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.addFundsButton, rtlRow(rtl)]}
          >
            <Plus size={20} color="#fff" />
            <Text style={[styles.addFundsButtonText, rtlText(rtl)]}>+ {w('addFunds')}</Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={[styles.sectionLabel, rtlText(rtl)]}>{w('recentRequests')}</Text>
        {requests.length > 0 ? requests.slice(0, 5).map((req) => {
              const isPending = req.status === 'pending';
              const isApproved = req.status === 'approved';
              const badgeColor = isPending ? '#F59E0B' : isApproved ? '#22C55E' : '#EF4444';
              const statusLabel = isPending ? w('pending') : isApproved ? w('approved') : w('rejected');
              const addedIqd = req.approved_amount_iqd ? Number(String(req.approved_amount_iqd).replace(/,/g, '')) : 0;
              return (
                <View key={req.id} style={[styles.requestCard, rtlRow(rtl)]}>
                  <View style={styles.requestRow}>
                    <Text style={[styles.requestAmount, rtlText(rtl)]}>{formatIQD(Number(String(req.amount_iqd).replace(/,/g, '')))} — {new Date(req.created_at).toLocaleDateString(language === 'ar' ? 'ar-IQ' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
                    <View style={[styles.badge, { backgroundColor: badgeColor + '22' }]}>
                      <Text style={[styles.badgeText, { color: badgeColor }, rtlText(rtl)]}>{statusLabel}</Text>
                    </View>
                  </View>
                  {req.rejection_reason ? (
                    <Text style={[styles.rejectionText, rtlText(rtl)]}>{req.rejection_reason}</Text>
                  ) : null}
                  {isApproved && addedIqd > 0 ? (
                    <Text style={[styles.creditedText, rtlText(rtl)]}>+{formatIQD(addedIqd)} زیادکرا</Text>
                  ) : null}
                </View>
              );
            }) : (
          <Text style={[styles.emptyRequests, rtlText(rtl)]}>هیچ داواکاریەک نییە</Text>
        )}
        </View>
      </ScrollView>
      </View>
    </View>
  );
}

const createStyles = (colors: any, insets: any, typography: any, rtl?: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.DEFAULT,
  },
  contentArea: {
    flex: 1,
    minHeight: 0,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingStart: spacing.lg,
    paddingEnd: spacing.lg,
    paddingTop: spacing.sm,
    width: '100%',
    maxWidth: '100%',
  },
  balanceCard: {
    borderRadius: borderRadius.card + 4,
    paddingStart: spacing.lg,
    paddingEnd: spacing.lg,
    paddingVertical: spacing.xl,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    minHeight: 140,
    justifyContent: 'center',
  },
  balanceLabel: {
    fontFamily: 'Rabar_021',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: spacing.sm,
  },
  balanceAmount: {
    fontFamily: 'Poppins-Bold',
    fontSize: 40,
    color: '#FFFFFF',
    marginBottom: spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.card.background,
    padding: spacing.md + 4,
    borderRadius: borderRadius.card,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  statLabel: {
    fontFamily: 'Rabar_021',
    fontSize: 12,
    color: colors.foreground.muted,
    marginBottom: spacing.xs,
  },
  statValue: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 20,
    color: colors.foreground.DEFAULT,
  },
  infoCard: {
    backgroundColor: (colors.primary?.DEFAULT ?? '#7C3AED') + '18',
    borderRadius: borderRadius.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: (colors.primary?.DEFAULT ?? '#7C3AED') + '30',
    marginBottom: spacing.lg,
  },
  infoText: {
    fontFamily: 'Rabar_021',
    fontSize: 13,
    color: colors.foreground.muted,
  },
  addFundsButtonWrap: {
    width: '100%',
    marginBottom: spacing.lg,
    borderRadius: borderRadius.button,
    overflow: 'hidden',
  },
  addFundsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
    height: 56,
  },
  addFundsButtonText: {
    fontFamily: 'Rabar_021',
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  comingSoonBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  comingSoonCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.card.background,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  comingSoonHeader: {
    backgroundColor: colors.error,
    paddingVertical: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  comingSoonIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  comingSoonTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary.foreground,
  },
  comingSoonBody: {
    paddingStart: spacing.lg,
    paddingEnd: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  comingSoonText: {
    fontSize: 14,
    color: colors.foreground.DEFAULT,
    textAlign: 'center',
    lineHeight: 20,
  },
  comingSoonButton: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    backgroundColor: colors.error,
    alignItems: 'center',
  },
  comingSoonButtonText: {
    color: colors.primary.foreground,
    fontWeight: '700',
    fontSize: 14,
  },
  sectionLabel: {
    fontFamily: 'Rabar_021',
    fontSize: 12,
    color: colors.foreground.muted,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyRequests: {
    fontFamily: 'Rabar_021',
    fontSize: 14,
    color: colors.foreground.muted,
    textAlign: 'right',
    marginTop: spacing.sm,
  },
  requestCard: {
    backgroundColor: colors.card.background,
    borderRadius: borderRadius.card,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  requestRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  requestAmount: { fontFamily: 'Rabar_021', fontWeight: '600', fontSize: 15, color: colors.foreground.DEFAULT },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontFamily: 'Rabar_021', fontSize: 12, fontWeight: '600' },
  rejectionText: { fontFamily: 'Rabar_021', fontSize: 12, color: colors.error, marginTop: 4 },
  creditedText: { fontFamily: 'Poppins-Medium', fontSize: 12, color: '#22C55E', marginTop: 4 },
});
