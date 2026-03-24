import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabaseRead } from '@/integrations/supabase/client';
import { FileText } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, borderRadius } from '@/theme/spacing';
import { Text } from '@/components/common/Text';
import { getDisplayBudget } from '@/utils/campaignBudget';
import { formatUSDLatinDigitsOnly } from '@/utils/currency';
import { formatDateNumericDMY } from '@/utils/dateFormat';
import { ScreenHeader } from '@/components/common/ScreenHeader';

export function InvoiceHistory(props: { embedded?: boolean } = { embedded: false }) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t, language, isRTL } = useLanguage();
  const { colors } = useTheme();
  const styles = createStyles(colors, insets, isRTL);
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchInvoices();
    }
  }, [user]);

  const fetchInvoices = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabaseRead
        .from('campaigns')
        .select('id, title, total_budget, target_spend, real_budget, created_at, status')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setInvoices(data);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const embedded = Boolean((props as any)?.embedded);

  return (
    <View style={styles.container}>
      {!embedded && (
        <ScreenHeader
          title={t('invoices')}
          onBack={() => navigation.goBack()}
          style={{ paddingTop: insets.top + 8 }}
        />
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: embedded ? 0 : 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 16, width: '100%' }}>
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
          </View>
        )}
        {invoices.length === 0 ? (
          <View style={styles.emptyState}>
            <FileText size={48} color={colors.foreground.muted} />
            <Text style={[styles.emptyText, isRTL && styles.textRTL]}>
              {language === 'ar' ? 'لا توجد فواتير بعد' : 'هیچ پسوولەیەک نییە'}
            </Text>
          </View>
        ) : (
          invoices.map((invoice) => (
            <TouchableOpacity
              key={invoice.id}
              style={styles.invoiceCard}
              onPress={() => navigation.navigate('Invoice', { id: invoice.id })}
            >
              <View style={styles.invoiceLeft}>
                <FileText size={24} color={colors.primary.DEFAULT} />
                <View style={styles.invoiceInfo}>
                  <Text style={[styles.invoiceTitle, isRTL && styles.textRTL]} numberOfLines={1} ellipsizeMode="tail">{invoice.title}</Text>
                  <Text style={[styles.invoiceDate, isRTL && styles.textRTL]}>
                    {formatDateNumericDMY(new Date(invoice.created_at))}
                  </Text>
                </View>
              </View>
              <Text style={[styles.invoiceAmount, isRTL && styles.textRTL]}>
                {formatUSDLatinDigitsOnly(getDisplayBudget(invoice))}
              </Text>
            </TouchableOpacity>
          ))
        )}
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any, insets: { top: number; bottom: number }, isRTL?: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.DEFAULT,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    paddingStart: spacing.md,
    paddingEnd: spacing.md,
    backgroundColor: colors.card.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
  },
  headerRTL: {
    flexDirection: 'row',
  },
  headerLeftSlot: {
    minWidth: 100,
    maxWidth: 100,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerRightSlot: {
    minWidth: 100,
    maxWidth: 100,
  },
  textRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  backButtonWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    minWidth: 40,
    minHeight: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  backButtonLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.foreground.DEFAULT,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: colors.foreground.DEFAULT,
    textAlign: 'center',
    marginHorizontal: spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingStart: spacing.lg,
    paddingEnd: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: Math.max(insets.bottom, 20) + spacing.xl * 2,
    minHeight: '100%',
    width: '100%',
    maxWidth: '100%',
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: 18,
    color: colors.foreground.muted,
    marginTop: spacing.md,
  },
  invoiceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card.background,
    padding: spacing.md,
    borderRadius: borderRadius.card,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.card.border,
    width: '100%',
    maxWidth: '100%',
  },
  invoiceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    gap: spacing.md,
  },
  invoiceInfo: {
    flex: 1,
    minWidth: 0,
  },
  invoiceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.foreground.DEFAULT,
    marginBottom: 4,
  },
  invoiceDate: {
    fontSize: 12,
    color: colors.foreground.muted,
  },
  invoiceAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary.DEFAULT,
    flexShrink: 0,
  },
});
