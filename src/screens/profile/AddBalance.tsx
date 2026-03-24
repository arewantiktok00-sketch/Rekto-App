import { ScreenHeader } from '@/components/common/ScreenHeader';
import { Text } from '@/components/common/Text';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRemoteConfig } from '@/contexts/RemoteConfigContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/integrations/supabase/client';
import { formatIQD } from '@/utils/currency';
import { borderRadius, spacing } from '@/theme/spacing';
import { getTypographyStyles } from '@/theme/typography';
import { isRTL, rtlRow, rtlText } from '@/utils/rtl';
import { useNavigation } from '@react-navigation/native';
import { AlertTriangle, Banknote, CreditCard, Smartphone, ArrowLeft } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Clipboard,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { useOwnerAuth } from '@/hooks/useOwnerAuth';
import { getErrorMessageForUser } from '@/utils/errorHandling';
import { toast } from '@/utils/toast';

const walletTranslations: Record<string, { ckb: string; ar: string }> = {
  addFunds: { ckb: 'زیادکردنی باڵانس', ar: 'إضافة رصيد' },
  selectPaymentMethod: { ckb: 'شێوازی پارەدان هەڵبژێرە', ar: 'اختر طريقة الدفع' },
  amountIqd: { ckb: 'بڕ (IQD)', ar: 'المبلغ (IQD)' },
  senderName: { ckb: 'ناوی ناردنەوە', ar: 'اسم المرسل' },
  submitRequest: { ckb: 'ناردنی داواکاری باڵانس', ar: 'إرسال طلب الرصيد' },
  recentRequests: { ckb: 'داواکاریە نوێیەکان', ar: 'الطلبات الأخيرة' },
  pending: { ckb: 'چاوەڕوان', ar: 'قيد الانتظار' },
  approved: { ckb: 'پەسەندکرا', ar: 'تمت الموافقة' },
  rejected: { ckb: 'ڕەتکرایەوە', ar: 'مرفوض' },
  afterSendPayment: { ckb: 'دوای ناردنی پارە، داواکاری بنێرە. تیمەکەمان لە ماوەی ٢٤ کاتژمێردا پشتڕاست دەکاتەوە.', ar: 'بعد إرسال الدفع، أرسل الطلب. فريقنا سيتحقق خلال 24 ساعة.' },
};

interface BalanceRequest {
  id: string;
  amount_iqd: string;
  sender_name: string;
  payment_method: string;
  status: string;
  rejection_reason?: string | null;
  approved_amount_iqd?: string | null;
  created_at: string;
}

const PAYMENT_METHODS = [
  { id: 'fib', labelCkb: 'FIB (بانکی یەکەمی عێراقی)', labelAr: 'FIB (البنك العراقي الأول)', icon: Banknote, accountNumber: '0750 488 1516' },
  { id: 'fastpay', labelCkb: 'فاستپەی', labelAr: 'فاست باي', icon: Smartphone, accountNumber: '0750 488 1516' },
  { id: 'qi', labelCkb: 'کارتی کی', labelAr: 'بطاقة كي', icon: CreditCard, accountNumber: '4734053731' },
];

const WARNING_HINT_CKB = 'تکایە سەرەتا پارەکە بنێرە، پاشان ئەم فۆرمە پڕبکەوە';
const COPIED_TOAST_CKB = 'کۆپی کرا';

export function AddBalance() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { language } = useLanguage();
  const { isPaymentsHidden } = useRemoteConfig();
  const { hasAdminAccess } = useOwnerAuth();
  const { colors } = useTheme();
  const rtl = isRTL(language);
  const typography = getTypographyStyles(language as 'ckb' | 'ar');
  const styles = createStyles(colors, insets, typography, rtl);

  const w = (key: string) => walletTranslations[key]?.[language === 'ar' ? 'ar' : 'ckb'] ?? key;

  const [step, setStep] = useState<'method' | 'details'>('method');
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [amountIqd, setAmountIqd] = useState('');
  const [senderName, setSenderName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [requests, setRequests] = useState<BalanceRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

  const fetchRequests = async () => {
    if (!user) return;
    setLoadingRequests(true);
    try {
      const { data, error } = await supabase
        .from('balance_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (!error && data) setRequests(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [user]);

  useEffect(() => {
    if (isPaymentsHidden) {
      navigation.goBack();
    }
  }, [isPaymentsHidden, navigation]);

  if (isPaymentsHidden) {
    return null;
  }

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`balance-requests-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'balance_requests', filter: `user_id=eq.${user.id}` },
        () => fetchRequests()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleSelectMethod = (methodId: string) => {
    setSelectedMethod(methodId);
    setStep('details');
  };

  const copyToClipboard = (text: string) => {
    Clipboard.setString(text);
    toast.success(language === 'ckb' ? COPIED_TOAST_CKB : 'تم النسخ', language === 'ckb' ? COPIED_TOAST_CKB : 'تم النسخ');
  };

  const handleBack = () => {
    if (step === 'details') {
      setStep('method');
      setSelectedMethod(null);
      setAmountIqd('');
      setSenderName('');
    } else {
      navigation.goBack();
    }
  };

  const handleSubmit = async () => {
    const amount = amountIqd.replace(/,/g, '').trim();
    const name = senderName.trim();
    if (!user) return;
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.warning(w('amountIqd'), language === 'ar' ? 'أدخل مبلغًا صالحًا' : 'بڕی پارەی دروست بنووسە');
      return;
    }
    if (!name || name.length < 2) {
      toast.warning(w('senderName'), language === 'ar' ? 'أدخل اسم المرسل' : 'ناوی نێرەر بنووسە');
      return;
    }
    if (!selectedMethod) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('balance-request', {
        body: {
          action: 'submit',
          user_id: user.id,
          amount_iqd: amount,
          sender_name: name,
          payment_method: selectedMethod,
        },
      });
      if (error) {
        const msg = getErrorMessageForUser(error, data ?? null, hasAdminAccess, language === 'ar' ? 'ar' : 'ckb');
        toast.error(hasAdminAccess ? (language === 'ckb' ? 'هەڵە' : 'خطأ') : (language === 'ckb' ? 'هەڵە' : 'خطأ'), msg);
        return;
      }
      if (data?.success === false) {
        const msg = getErrorMessageForUser(null, data, hasAdminAccess, language === 'ar' ? 'ar' : 'ckb');
        toast.error(hasAdminAccess ? 'Error' : (language === 'ckb' ? 'هەڵە' : 'خطأ'), msg);
        return;
      }
      toast.success(language === 'ckb' ? 'سەرکەوتوو' : 'تم', language === 'ckb' ? 'داواکاریەکەت نێردرا! بەزووترین بەسەردەچرێت.' : 'تم إرسال الطلب. سنراجع قريباً.');
      setAmountIqd('');
      setSenderName('');
      setStep('method');
      setSelectedMethod(null);
      fetchRequests();
      navigation.navigate('ProfileStack', { screen: 'WalletBalance' });
    } catch (e: any) {
      console.error(e);
      const msg = getErrorMessageForUser(e, null, hasAdminAccess, language === 'ar' ? 'ar' : 'ckb');
      toast.error(hasAdminAccess ? 'Error' : (language === 'ckb' ? 'هەڵە' : 'خطأ'), msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={w('addFunds')}
        onBack={handleBack}
        style={{ paddingTop: insets.top + 8 }}
        leftIcon={step === 'details' ? ArrowLeft : undefined}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 16 }}>
          {step === 'method' && (
            <>
              <View style={styles.warningBox}>
                <AlertTriangle size={20} color="#B45309" style={styles.warningIcon} />
                <Text style={[styles.warningText, rtlText(rtl)]}>{language === 'ar' ? 'يرجى الدفع أولاً، ثم تعبئة هذا النموذج' : WARNING_HINT_CKB}</Text>
              </View>
              <Text style={[styles.sectionTitle, rtlText(rtl)]}>{w('selectPaymentMethod')}</Text>
              {PAYMENT_METHODS.map((m) => {
                const Icon = m.icon;
                const label = language === 'ar' ? m.labelAr : m.labelCkb;
                const accountNumber = m.accountNumber;
                return (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.methodCard, rtlRow(rtl)]}
                    onPress={() => handleSelectMethod(m.id)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.methodCardContent}>
                      <Text style={[styles.methodLabel, rtlText(rtl)]}>{label}</Text>
                      <View style={[styles.accountRow, rtlRow(rtl)]}>
                        <Text style={styles.accountNumber} numberOfLines={1}>{accountNumber}</Text>
                        <TouchableOpacity
                          style={styles.copyBtn}
                          onPress={(e) => {
                            e?.stopPropagation?.();
                            copyToClipboard(accountNumber);
                          }}
                          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        >
                          <Text style={styles.copyBtnLabel}>📋</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={styles.methodIconWrap}>
                      <Icon size={24} color={colors.primary.DEFAULT} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </>
          )}

          {step === 'details' && selectedMethod && (
            <>
              <Text style={[styles.hint, rtlText(rtl)]}>{w('afterSendPayment')}</Text>
              <Text style={[styles.label, rtlText(rtl)]}>{w('amountIqd')}</Text>
              <TextInput
                style={[styles.input, rtlText(rtl)]}
                value={amountIqd}
                onChangeText={(t) => setAmountIqd(t.replace(/[^0-9,]/g, ''))}
                placeholder="0"
                placeholderTextColor={colors.foreground.muted}
                keyboardType="numeric"
              />
              <Text style={[styles.label, rtlText(rtl)]}>{w('senderName')}</Text>
              <TextInput
                style={[styles.input, rtlText(rtl)]}
                value={senderName}
                onChangeText={setSenderName}
                placeholder={language === 'ar' ? 'اسم المرسل' : 'ناوی نێرەر'}
                placeholderTextColor={colors.foreground.muted}
              />
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleSubmit}
                disabled={submitting}
              >
                <LinearGradient
                  colors={['#7C3AED', '#9333EA']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.submitBtnGradient}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitBtnText}>{w('submitRequest')}</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}

          <Text style={[styles.sectionTitle, rtlText(rtl), { marginTop: 24 }]}>{w('recentRequests')}</Text>
          {loadingRequests ? (
            <ActivityIndicator size="small" color={colors.primary.DEFAULT} style={{ marginVertical: 16 }} />
          ) : requests.length === 0 ? (
            <Text style={[styles.emptyText, rtlText(rtl)]}>{language === 'ar' ? 'لا توجد طلبات' : 'هیچ داواکارییەک نییە'}</Text>
          ) : (
            requests.slice(0, 10).map((req) => {
              const isPending = req.status === 'pending';
              const isApproved = req.status === 'approved';
              const badgeColor = isPending ? '#F59E0B' : isApproved ? '#22C55E' : '#EF4444';
              const statusLabel = isPending ? w('pending') : isApproved ? w('approved') : w('rejected');
              const addedIqd = req.approved_amount_iqd ? Number(String(req.approved_amount_iqd).replace(/,/g, '')) : 0;
              return (
                <View key={req.id} style={[styles.requestCard, rtlRow(rtl)]}>
                  <View style={styles.requestRow}>
                    <Text style={[styles.requestAmount, rtlText(rtl)]}>{formatIQD(Number(String(req.amount_iqd).replace(/,/g, '')))}</Text>
                    <View style={[styles.badge, { backgroundColor: badgeColor + '22' }]}>
                      <Text style={[styles.badgeText, { color: badgeColor }, rtlText(rtl)]}>{statusLabel}</Text>
                    </View>
                  </View>
                  <Text style={[styles.requestMeta, rtlText(rtl)]}>
                    {req.payment_method} • {req.sender_name} • {new Date(req.created_at).toLocaleDateString(language === 'ar' ? 'ar-IQ' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                  {isApproved && addedIqd > 0 && (
                    <Text style={[styles.requestCredited, rtlText(rtl)]}>+{formatIQD(addedIqd)} زیادکرا</Text>
                  )}
                  {req.rejection_reason && (
                    <Text style={[styles.rejectionReason, rtlText(rtl)]}>{req.rejection_reason}</Text>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any, insets: any, typography: any, rtl?: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background.DEFAULT },
    sectionTitle: { ...typography.h3, marginBottom: 12, color: colors.foreground.DEFAULT },
    warningBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255, 251, 235, 0.8)',
      borderWidth: 1,
      borderColor: 'rgba(245, 158, 11, 0.3)',
      borderRadius: borderRadius.card,
      padding: spacing.md,
      marginBottom: spacing.lg,
    },
    warningIcon: { marginLeft: 8, marginRight: 8 },
    warningText: {
      flex: 1,
      fontFamily: 'Rabar_021',
      fontSize: 14,
      color: colors.foreground.DEFAULT,
      textAlign: 'right',
      writingDirection: 'rtl',
    },
    methodCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card.background,
      borderRadius: borderRadius.card,
      padding: spacing.md,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border.DEFAULT,
    },
    methodCardContent: { flex: 1, minWidth: 0 },
    methodIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary.DEFAULT + '18',
      alignItems: 'center',
      justifyContent: 'center',
      marginStart: spacing.md,
    },
    methodLabel: {
      fontFamily: 'Rabar_021',
      fontSize: 16,
      color: colors.foreground.DEFAULT,
      textAlign: 'right',
      writingDirection: 'rtl',
      marginBottom: 4,
    },
    accountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    accountNumber: {
      fontFamily: 'Poppins-Medium',
      fontSize: 14,
      color: colors.foreground.muted,
      writingDirection: 'ltr',
      flex: 1,
    },
    copyBtn: {
      padding: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    copyBtnLabel: {
      fontSize: 18,
    },
    hint: { ...typography.caption, color: colors.foreground.muted, marginBottom: 16 },
    label: { ...typography.label, marginBottom: 6, color: colors.foreground.DEFAULT },
    input: {
      backgroundColor: colors.background.secondary ?? colors.card.background,
      borderRadius: borderRadius.input,
      padding: spacing.md,
      color: colors.foreground.DEFAULT,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border.DEFAULT,
    },
    submitBtn: { marginTop: 8, marginBottom: 24, borderRadius: 999, overflow: 'hidden' },
    submitBtnGradient: { paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
    submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
    emptyText: { ...typography.body, color: colors.foreground.muted, marginVertical: 16 },
    requestCard: {
      backgroundColor: colors.card.background,
      borderRadius: borderRadius.card,
      padding: spacing.md,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border.DEFAULT,
    },
    requestRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
    requestAmount: { ...typography.h3, color: colors.foreground.DEFAULT },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    badgeText: { fontSize: 12, fontWeight: '600' },
    requestMeta: { ...typography.caption, color: colors.foreground.muted },
    requestCredited: { ...typography.caption, color: '#22C55E', marginTop: 4 },
    rejectionReason: { ...typography.caption, color: colors.error, marginTop: 4 },
    requestDate: { ...typography.caption, color: colors.foreground.muted, marginTop: 4 },
  });
