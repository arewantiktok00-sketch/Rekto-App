import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabaseRead } from '@/integrations/supabase/client';
import { Plus, ArrowDown, AlertTriangle } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing, borderRadius } from '@/theme/spacing';
import { getTypographyStyles } from '@/theme/typography';
import { Text } from '@/components/common/Text';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { isRTL, rtlText, rtlRow, rtlIcon, ltrNumber } from '@/utils/rtl';

export function WalletBalance() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const rtl = isRTL(language);
  const { colors } = useTheme();
  const typography = getTypographyStyles(language as 'ckb' | 'ar');
  const styles = createStyles(colors, insets, typography, rtl);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [pendingBalance, setPendingBalance] = useState(0);
  const comingSoonShown = useRef(false);
  const [showComingSoon, setShowComingSoon] = useState(false);

  useEffect(() => {
    if (comingSoonShown.current) return;
    comingSoonShown.current = true;
    setShowComingSoon(true);
  }, [t, navigation]);

  useEffect(() => {
    if (!user || comingSoonShown.current) return;

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

    return () => {
      supabaseRead.removeChannel(profileChannel);
      supabaseRead.removeChannel(transactionsChannel);
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

      if (data) {
        setBalance(data.wallet_balance || 0);
      }

      // Calculate pending balance from pending transactions
      const { data: transactions } = await supabaseRead
        .from('transactions')
        .select('amount, type, status')
        .eq('user_id', user.id)
        .eq('status', 'pending');

      if (transactions) {
        const pending = transactions.reduce((sum, t) => {
          if (t.type === 'payment') return sum - t.amount;
          if (t.type === 'topup') return sum + t.amount;
          return sum;
        }, 0);
        setPendingBalance(pending);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Modal
        visible={showComingSoon}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowComingSoon(false);
          navigation.goBack();
        }}
      >
        <View style={styles.comingSoonBackdrop}>
          <View style={styles.comingSoonCard}>
            <View style={styles.comingSoonHeader}>
              <View style={styles.comingSoonIconWrap}>
                <AlertTriangle size={26} color="#FFFFFF" />
              </View>
              <Text style={[styles.comingSoonTitle, rtlText(rtl)]}>{t('comingSoon') || 'Coming Soon'}</Text>
            </View>
            <View style={styles.comingSoonBody}>
              <Text style={[styles.comingSoonText, rtlText(rtl)]}>
                {t('walletComingSoon') || 'Wallet balance is not supported yet.'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.comingSoonButton}
              onPress={() => {
                setShowComingSoon(false);
                navigation.goBack();
              }}
            >
              <Text style={[styles.comingSoonButtonText, rtlText(rtl)]}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
        </View>
      )}
      <ScreenHeader
        title={t('walletAndBalance') || 'Wallet & Balance'}
        onBack={() => navigation.goBack()}
        style={{ paddingTop: insets.top + 8 }}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 16, width: '100%' }}>
        {/* Current Balance Card */}
        <LinearGradient
          colors={colors.gradients.primary}
          style={styles.balanceCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={[styles.balanceLabel, rtlText(rtl)]}>
            {t('currentBalance') || 'Current Balance'}
          </Text>
          <Text style={[styles.balanceAmount, ltrNumber]}>${balance.toFixed(2)}</Text>
          <Text style={[styles.balanceIQD, ltrNumber]}>≈ IQD {(balance * 1800).toLocaleString()}</Text>
        </LinearGradient>

        {/* Available / Pending */}
        <View style={[styles.statsRow, rtlRow(rtl)]}>
          <View style={styles.statBox}>
            <Text style={[styles.statLabel, rtlText(rtl)]}>{t('available') || 'Available'}</Text>
            <Text style={[styles.statValue, ltrNumber]}>${balance.toFixed(2)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statLabel, rtlText(rtl)]}>{t('pendingBalance') || 'Pending'}</Text>
            <Text style={[styles.statValue, ltrNumber]}>${Math.abs(pendingBalance).toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={[styles.infoText, rtlText(rtl)]}>
            {t('walletInfo') ||
              'Your wallet balance is used to run ads on Rekto. Add funds to start or continue your campaigns.'}
          </Text>
        </View>

        <View style={[styles.actions, rtlRow(rtl)]}>
          <TouchableOpacity
            style={styles.actionButtonContainer}
            onPress={() => {
              // Navigate to add funds
            }}
          >
            <LinearGradient
              colors={['#7C3AED', '#9333EA']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.actionButton, rtlRow(rtl)]}
            >
              <Plus size={20} color="#fff" style={rtlIcon(rtl)} />
              <Text style={[styles.actionButtonText, rtlText(rtl)]}>{t('addFunds')}</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonSecondary, rtlRow(rtl)]}
            onPress={() => {
              // Navigate to withdraw
            }}
          >
            <ArrowDown size={20} color={colors.primary.DEFAULT} style={rtlIcon(rtl)} />
            <Text style={[styles.actionButtonText, styles.actionButtonTextSecondary, rtlText(rtl)]}>
              {t('withdraw')}
            </Text>
          </TouchableOpacity>
        </View>
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
    ...typography.caption,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: spacing.sm,
  },
  balanceAmount: {
    ...typography.h1,
    fontSize: 40,
    color: colors.primary.foreground,
    marginBottom: spacing.xs,
  },
  balanceIQD: {
    ...typography.body,
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
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
    ...typography.caption,
    fontSize: 12,
    color: colors.foreground.muted,
    marginBottom: spacing.xs,
  },
  statValue: {
    ...typography.h2,
    fontSize: 20,
    color: colors.foreground.DEFAULT,
  },
  infoCard: {
    backgroundColor: colors.card.background,
    borderRadius: borderRadius.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    marginBottom: spacing.lg,
  },
  infoText: {
    ...typography.bodySmall,
    fontSize: 13,
    color: colors.foreground.muted,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.button,
    gap: spacing.sm,
    height: 56,
  },
  actionButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.primary.DEFAULT,
  },
  actionButtonText: {
    ...typography.body,
    color: colors.primary.foreground,
    fontSize: 17,
    fontWeight: '600',
  },
  actionButtonTextSecondary: {
    ...typography.body,
    color: colors.primary.DEFAULT,
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
});
