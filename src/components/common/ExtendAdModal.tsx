import { AdaptiveSlider } from '@/components/common/AdaptiveSlider';
import { Text } from '@/components/common/Text';
import { ChevronBackIcon } from '@/components/icons/ChevronBackIcon';
import { useAuth } from '@/contexts/AuthContext';
import { useOwnerAuth } from '@/hooks/useOwnerAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase, supabaseRead } from '@/integrations/supabase/client';
import { usePricingConfig } from '@/hooks/usePricingConfig';
import { calculateTax, MIN_EXTENSION_BUDGET_USD } from '@/lib/pricing';
import { borderRadius, spacing } from '@/theme/spacing';
import { getFontFamilyByLanguage } from '@/utils/fonts';
import { inputStyleRTL } from '@/utils/rtl';
import { formatIntegerLatinDigitsOnly } from '@/utils/currency';
import { getErrorMessageForUser } from '@/utils/errorHandling';
import { toast } from '@/utils/toast';
import { Check, ChevronDown, ChevronUp, Copy, Wallet, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Clipboard, Modal, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ExtendAdModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  campaignTitle: string;
  dailyBudget: number;  // Campaign's current daily budget (fallback when totalBudget/durationDays not provided)
  totalBudget?: number;  // Original campaign total_budget for correct extension pricing
  durationDays?: number;  // Original campaign duration_days
  realEndDate?: string | null;  // Current real_end_date (YYYY-MM-DD) for new end date calculation
  extensionStatus?: 'awaiting_payment' | 'verifying_payment' | 'processing' | null;
  onSuccess: () => void;  // Callback after successful submission
}

const paymentMethods = [
  { id: 'fastpay', name: 'FastPay', account: '0750 488 1516' },
  { id: 'fib', name: 'FIB', account: '0750 488 1516' },
  { id: 'superqi', name: 'Qi Card', account: '4734053731' },
];

export const ExtendAdModal: React.FC<ExtendAdModalProps> = ({
  open,
  onOpenChange,
  campaignId,
  campaignTitle,
  dailyBudget,
  totalBudget,
  durationDays,
  realEndDate,
  extensionStatus,
  onSuccess,
}) => {
  const isProcessing = extensionStatus === 'processing';
  const { user } = useAuth();
  const { hasAdminAccess } = useOwnerAuth();
  const { t, language } = useLanguage();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<'select' | 'payment'>('select');
  const [extensionDays, setExtensionDays] = useState(1);
  const [senderName, setSenderName] = useState('');
  const [amountIQD, setAmountIQD] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'bank' | 'wallet'>('bank');
  const [loading, setLoading] = useState(false);
  const [breakdownExpanded, setBreakdownExpanded] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const { convertToIQD, exchange_rate } = usePricingConfig();
  const iqdDisplay = (n: number) => formatIntegerLatinDigitsOnly(n);

  useEffect(() => {
    if (!open || !user) return;
    const fetchWallet = async () => {
      try {
        const { data } = await supabaseRead
          .from('profiles')
          .select('wallet_balance')
          .eq('user_id', user.id)
          .maybeSingle();
        setWalletBalance(Number(data?.wallet_balance ?? 0));
      } catch (e) {
        console.error('Failed to fetch wallet balance:', e);
      }
    };
    fetchWallet();
  }, [open, user]);

  // Reset step and payment method when modal opens
  useEffect(() => {
    if (!open) {
      setStep('select');
      setPaymentMethod('bank');
      setSelectedMethod(null);
    }
  }, [open]);

  // Extension pricing: costPerDay = max(daily_budget, 20), baseBudgetUSD = extensionDays * costPerDay, tax from table, totalUSD = base + tax
  const safeDailyBudget = Number.isFinite(Number(dailyBudget)) && Number(dailyBudget) > 0
    ? Number(dailyBudget)
    : MIN_EXTENSION_BUDGET_USD;
  const costPerDay = Math.max(safeDailyBudget, MIN_EXTENSION_BUDGET_USD);
  const baseBudgetUSD = extensionDays * costPerDay;
  const taxAmount = calculateTax(baseBudgetUSD);
  const totalUSD = baseBudgetUSD + taxAmount;
  const totalIQD = Math.floor(totalUSD * exchange_rate);
  const safeTotalBudget = totalBudget != null && Number(totalBudget) > 0 ? Number(totalBudget) : null;
  const newTotalBudget = safeTotalBudget != null ? safeTotalBudget + baseBudgetUSD : undefined;
  const newEndDate = realEndDate
    ? (() => {
        const d = new Date(realEndDate);
        d.setDate(d.getDate() + extensionDays);
        return d.toISOString().slice(0, 10);
      })()
    : undefined;
  const pricing = { budget: baseBudgetUSD, tax: taxAmount, totalUSD, totalIQD, newTotalBudget, newEndDate };

  // Auto-fill IQD amount when days change
  useEffect(() => {
    if (step === 'payment') {
      setAmountIQD(iqdDisplay(pricing.totalIQD));
    }
  }, [extensionDays, step, pricing.totalIQD]);

  const handleClose = useCallback(() => {
    setStep('select');
    setExtensionDays(1);
    setSenderName('');
    setAmountIQD('');
    setSelectedMethod(null);
    setPaymentMethod('bank');
    setBreakdownExpanded(false);
    setCopiedAccount(null);
    onOpenChange(false);
  }, [onOpenChange]);

  const handleContinue = () => {
    // Validation: extensionDays must be >= 1
    if (extensionDays < 1 || extensionDays > 7) {
      toast.error(t('error'), t('somethingWentWrong'));
      return;
    }
    setStep('payment');
  };

  const handleBack = () => {
    setStep('select');
  };

  const handleCopyAccount = (account: string, methodId: string) => {
    try {
      Clipboard.setString(account);
      setCopiedAccount(methodId);
      toast.success(t('success'), t('operationCompleted'));
      setTimeout(() => setCopiedAccount(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleSubmit = async () => {
    const isWallet = paymentMethod === 'wallet';

    if (!isWallet) {
      if (!selectedMethod) {
        toast.error(t('error'), t('somethingWentWrong'));
        return;
      }
      if (!senderName.trim() || senderName.trim().length < 2) {
        toast.error(t('error'), t('somethingWentWrong'));
        return;
      }
      const amountIQDClean = amountIQD.replace(/,/g, '').trim();
      const amountIqdNum = parseInt(amountIQDClean, 10);
      if (!amountIQDClean || Number.isNaN(amountIqdNum) || amountIqdNum !== pricing.totalIQD) {
        toast.error(t('error'), t('somethingWentWrong'));
        return;
      }
    } else {
      // Wallet must have enough for base + tax (totalUSD), but we only ever store/sync the BASE budget in USD.
      if (walletBalance < pricing.totalUSD) {
        toast.error(t('error'), t('somethingWentWrong'));
        return;
      }
    }

    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        action: 'extension-payment',
        campaignId,
        extensionDays,
        extensionAmount: pricing.budget,
        transactionId: isWallet ? 'wallet-payment' : senderName.trim(),
        paymentMethod: isWallet ? 'wallet' : selectedMethod,
        amountIQD: isWallet ? String(pricing.totalIQD) : amountIQD.replace(/,/g, ''),
      };
      if (pricing.newTotalBudget != null) body.newTotalBudget = pricing.newTotalBudget;
      if (pricing.newEndDate) body.newEndDate = pricing.newEndDate;
      if (!isWallet) {
        body.senderName = senderName.trim();
      }

      const { data, error } = await supabase.functions.invoke('admin-review', {
        body,
      });

      if (error) {
        const msg = getErrorMessageForUser(error, data ?? null, hasAdminAccess, language === 'ar' ? 'ar' : 'ckb');
        Alert.alert(hasAdminAccess ? 'Error' : (language === 'ckb' ? 'هەڵە' : 'خطأ'), msg);
        return;
      }
      if (data?.success === false) {
        const msg = getErrorMessageForUser(null, data, hasAdminAccess, language === 'ar' ? 'ar' : 'ckb');
        Alert.alert(hasAdminAccess ? 'Error' : (language === 'ckb' ? 'هەڵە' : 'خطأ'), msg);
        return;
      }

      const successMsg = language === 'ckb'
        ? 'داواکاری درێژکردنەوە بە سەرکەوتوویی نێردرا'
        : 'تم إرسال طلب التمديد بنجاح';
      Alert.alert(language === 'ckb' ? 'سەرکەوتوو' : 'تم', successMsg);
      handleClose();
      onSuccess();
    } catch (err: any) {
      const msg = getErrorMessageForUser(err, null, hasAdminAccess, language === 'ar' ? 'ar' : 'ckb');
      Alert.alert(hasAdminAccess ? 'Error' : (language === 'ckb' ? 'هەڵە' : 'خطأ'), msg);
    } finally {
      setLoading(false);
    }
  };

  const fontFamily = getFontFamilyByLanguage(language as 'ckb' | 'ar');
  const isRTL = language === 'ckb' || language === 'ar';
  const styles = createStyles(colors, fontFamily, isRTL, breakdownExpanded);

  const canSubmitBank =
    !!selectedMethod && senderName.trim().length >= 2 && !!amountIQD.replace(/,/g, '');
  const canSubmitWallet = walletBalance >= pricing.totalUSD;
  const canSubmit =
    !isProcessing &&
    !loading &&
    (paymentMethod === 'wallet' ? canSubmitWallet : canSubmitBank);

  return (
    <Modal
      visible={open}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {step === 'select'
              ? `📅 ${t('extendAdDuration') || 'Extend Ad Duration'}`
              : `💳 ${t('payAndExtend') || 'Pay & Extend'}`}
          </Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <X size={24} color={colors.foreground.DEFAULT} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + spacing.lg }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {step === 'select' ? (
            <>
              {/* Campaign Title */}
              <Text style={styles.campaignTitle}>
                {t('extendCampaignFor')?.replace('{title}', campaignTitle) || `Extend "${campaignTitle}" for more days`}
              </Text>

              {/* Day Slider */}
              <View style={styles.sliderContainer}>
                <Text style={styles.sliderLabel}>
                  {t('numberOfDays') || 'Number of Days'}
                </Text>
                <View style={styles.sliderValueContainer}>
                  <Text style={styles.sliderValue}>{extensionDays} {extensionDays === 1 ? t('day') || 'Day' : t('days') || 'Days'}</Text>
                </View>
                <View pointerEvents={isProcessing ? 'none' : 'auto'}>
                  <AdaptiveSlider
                    style={styles.slider}
                    minimumValue={1}
                    maximumValue={7}
                    step={1}
                    value={extensionDays}
                    onValueChange={setExtensionDays}
                    minimumTrackTintColor={colors.primary.DEFAULT}
                    maximumTrackTintColor={colors.border.DEFAULT}
                    thumbTintColor={colors.primary.DEFAULT}
                  />
                </View>
                <View style={styles.sliderLabels}>
                  <Text style={styles.sliderLabelText}>1 {t('day') || 'Day'}</Text>
                  <Text style={styles.sliderLabelText}>7 {t('days') || 'Days'}</Text>
                </View>
              </View>

              {/* Cost Summary Card */}
              <View style={styles.costCard}>
                <TouchableOpacity
                  style={styles.costCardHeader}
                  onPress={() => setBreakdownExpanded(!breakdownExpanded)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.costCardTitle}>{t('viewBreakdown') || 'View breakdown'}</Text>
                  {breakdownExpanded ? (
                    <ChevronUp size={20} color={colors.primary.DEFAULT} />
                  ) : (
                    <ChevronDown size={20} color={colors.primary.DEFAULT} />
                  )}
                </TouchableOpacity>
                
                {breakdownExpanded && (
                  <View style={styles.breakdownContent}>
                    <View style={styles.costRow}>
                      <Text style={styles.costLabel}>{t('base') || 'Base'}</Text>
                      <Text style={styles.costValue}>${costPerDay.toFixed(2)} × {extensionDays} {extensionDays === 1 ? (t('day') || 'day') : (t('days') || 'days')} = ${pricing.budget.toFixed(2)}</Text>
                    </View>
                    <View style={styles.costRow}>
                      <Text style={styles.costLabel}>{t('tax') || 'Tax'}</Text>
                      <Text style={styles.costValue}>${pricing.tax.toFixed(1)}</Text>
                    </View>
                    <View style={styles.divider} />
                  </View>
                )}
                
                <View style={styles.totalSection}>
                  <Text style={styles.totalLabel}>{t('total') || 'Total'}</Text>
                  <Text style={styles.totalIQD}>
                    {iqdDisplay(pricing.totalIQD)} IQD
                  </Text>
                  <Text style={styles.totalUSD}>(${pricing.totalUSD.toFixed(2)} USD)</Text>
                </View>
              </View>

              {/* Info Text */}
              <Text style={styles.infoText}>
                💳 {t('proceedToPaymentNext') || 'You will proceed to payment next'}
              </Text>

              {/* Continue Button */}
              <TouchableOpacity
                style={[styles.continueButton, isProcessing && styles.submitButtonDisabled]}
                onPress={handleContinue}
                disabled={isProcessing}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#7C3AED', '#6D28D9']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.continueButtonGradient}
                >
                  {isProcessing ? (
                    <ActivityIndicator color={colors.primary.foreground} />
                  ) : (
                    <Text style={styles.continueButtonText}>
                      {t('continueToPayment') || 'Continue to Payment'}
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

            </>
          ) : (
            <>
              {/* Summary Card */}
              <View style={styles.summaryCard}>
                <Text style={styles.summaryText}>
                  {t('extendingBy')?.replace('{days}', extensionDays.toString()) || `Extending by ${extensionDays} Days`}
                </Text>
                <Text style={styles.summaryIQD}>
                  IQD {iqdDisplay(pricing.totalIQD)} (دینار)
                </Text>
                <Text style={styles.summaryUSD}>
                  (${pricing.totalUSD.toFixed(1)} USD)
                </Text>
              </View>

              {/* Payment Method Selection */}
              <Text style={styles.sectionLabel}>{t('selectPaymentMethod') || 'Select Payment Method'}</Text>

              {/* Pay with Balance */}
              <TouchableOpacity
                style={[
                  styles.paymentMethodCard,
                  paymentMethod === 'wallet' && styles.paymentMethodCardSelected,
                  walletBalance < pricing.totalUSD && styles.paymentMethodCardDisabled,
                ]}
                onPress={() => {
                  if (walletBalance >= pricing.totalUSD) {
                    setPaymentMethod('wallet');
                    setSelectedMethod(null);
                  }
                }}
                activeOpacity={0.7}
                disabled={walletBalance < pricing.totalUSD}
              >
                <View style={styles.paymentMethodContent}>
                  <View style={styles.paymentMethodRadio}>
                    {paymentMethod === 'wallet' && (
                      <View style={styles.paymentMethodRadioSelected} />
                    )}
                  </View>
                  <View style={styles.paymentMethodInfo}>
                    <Text style={[
                      styles.paymentMethodName,
                      paymentMethod === 'wallet' && styles.paymentMethodNameSelected,
                    ]}>
                      {t('payWithBalance') || 'Pay with Balance'}
                    </Text>
                    <Text style={styles.paymentMethodAccount}>
                      {walletBalance >= pricing.totalUSD
                        ? `$${walletBalance.toFixed(2)} ${t('available') || 'available'}`
                        : `${t('needMore') || 'Need'} $${(pricing.totalUSD - walletBalance).toFixed(2)} ${t('more') || 'more'}`}
                    </Text>
                  </View>
                  <Wallet size={20} color={paymentMethod === 'wallet' ? colors.primary.DEFAULT : colors.foreground.muted} />
                </View>
              </TouchableOpacity>

              {paymentMethods.map((method) => (
                <TouchableOpacity
                  key={method.id}
                  style={[
                    styles.paymentMethodCard,
                    paymentMethod === 'bank' && selectedMethod === method.id && styles.paymentMethodCardSelected,
                  ]}
                  onPress={() => {
                    setPaymentMethod('bank');
                    setSelectedMethod(method.id);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.paymentMethodContent}>
                    <View style={styles.paymentMethodRadio}>
                      {paymentMethod === 'bank' && selectedMethod === method.id && (
                        <View style={styles.paymentMethodRadioSelected} />
                      )}
                    </View>
                    <View style={styles.paymentMethodInfo}>
                      <Text style={[
                        styles.paymentMethodName,
                        paymentMethod === 'bank' && selectedMethod === method.id && styles.paymentMethodNameSelected,
                      ]}>
                        {method.name}
                      </Text>
                      <Text style={styles.paymentMethodAccount}>
                        {t('account') || 'Account'}: {method.account}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.copyButton}
                      onPress={() => handleCopyAccount(method.account, method.id)}
                      activeOpacity={0.7}
                    >
                      {copiedAccount === method.id ? (
                        <Check size={18} color={colors.primary.DEFAULT} />
                      ) : (
                        <Copy size={18} color={colors.foreground.muted} />
                      )}
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}

              {/* Bank transfer fields - only when paying by bank */}
              {paymentMethod === 'bank' && (
                <>
              {/* Sender Name */}
              <Text style={styles.inputLabel}>
                {isRTL ? 'ناوی نێردەر' : ''} {t('senderName') || 'Sender Name'} {isRTL ? '' : '(ناوی نێردەر)'}
              </Text>
              <TextInput
                style={[styles.input, inputStyleRTL()]}
                value={senderName}
                onChangeText={setSenderName}
                placeholder={t('enterSenderName') || 'e.g., Ahmed Mohammed'}
                placeholderTextColor={colors.input.placeholder}
                textAlign={isRTL ? 'right' : 'left'}
              />

              {/* Amount IQD */}
              <Text style={styles.inputLabel}>
                {isRTL ? 'بڕی پارەی نێردراو بە دینار' : ''} {t('amountSentIqd') || 'Amount Sent in IQD'} {isRTL ? '' : '(بڕی پارەی نێردراو بە دینار)'}
              </Text>
              <TextInput
                style={[styles.input, inputStyleRTL()]}
                value={amountIQD}
                onChangeText={(text) => {
                  // Remove commas and non-numeric characters
                  const cleaned = text.replace(/[^0-9]/g, '');
                  // Add commas for thousands
                  const formatted = cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                  setAmountIQD(formatted);
                }}
                placeholder={iqdDisplay(pricing.totalIQD)}
                placeholderTextColor={colors.input.placeholder}
                keyboardType="numeric"
                textAlign={isRTL ? 'right' : 'left'}
              />
              <Text style={styles.hint}>
                ⚠️ {t('makePaymentFirst') || 'Please make the payment first'}
              </Text>
                </>
              )}

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.backButton, isProcessing && styles.submitButtonDisabled]}
                  onPress={handleBack}
                  disabled={isProcessing}
                  activeOpacity={0.8}
                >
                  <View style={styles.backButtonContent}>
                    <ChevronBackIcon size={20} color={colors.foreground.DEFAULT} isRTL={isRTL} />
                    <Text style={styles.backButtonText}>{t('back') || 'Back'}</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    (!canSubmit || isProcessing) && styles.submitButtonDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={!canSubmit || isProcessing}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#7C3AED', '#6D28D9']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.submitButtonGradient}
                  >
                    {loading || isProcessing ? (
                      <ActivityIndicator color={colors.primary.foreground} />
                    ) : (
                      <Text style={styles.submitButtonText}>
                        ✓ {t('payAndExtend') || 'Pay & Extend'}
                      </Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>

            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const createStyles = (colors: any, fontFamily: string, isRTL: boolean, breakdownExpanded: boolean) => {
  const rowDir = 'row';
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.DEFAULT,
  },
  header: {
    flexDirection: rowDir,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: colors.foreground.DEFAULT,
    flex: 1,
  },
  closeButton: {
    padding: spacing.xs,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.md,
  },
  campaignTitle: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: colors.foreground.muted,
    marginBottom: spacing.lg,
    textAlign: isRTL ? 'right' : 'left',
  },
  sliderContainer: {
    marginBottom: spacing.lg,
  },
  sliderLabel: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: colors.foreground.DEFAULT,
    marginBottom: spacing.sm,
  },
  sliderValueContainer: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sliderValue: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    color: colors.primary.DEFAULT,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: rowDir,
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  sliderLabelText: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: colors.foreground.muted,
  },
  costCard: {
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    borderRadius: borderRadius.card,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.2)',
  },
  costCardHeader: {
    flexDirection: rowDir,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: breakdownExpanded ? spacing.md : 0,
  },
  costCardTitle: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: colors.primary.DEFAULT,
  },
  breakdownContent: {
    marginBottom: spacing.md,
  },
  costRow: {
    flexDirection: rowDir,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  costLabel: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: colors.foreground.muted,
  },
  costValue: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: colors.foreground.DEFAULT,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.DEFAULT,
    marginVertical: spacing.sm,
  },
  totalSection: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.DEFAULT,
  },
  totalLabel: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: colors.foreground.DEFAULT,
    marginBottom: spacing.xs,
  },
  totalUSD: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: colors.foreground.muted,
    marginBottom: spacing.xs,
  },
  totalIQD: {
    fontSize: 24, // Bold, primary color - as per spec
    fontFamily: 'Poppins-Bold',
    color: colors.primary.DEFAULT,
  },
  infoText: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: colors.foreground.muted,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  continueButton: {
    borderRadius: borderRadius.button,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  continueButtonGradient: {
    paddingVertical: spacing.md + 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: colors.primary.foreground,
  },
  summaryCard: {
    backgroundColor: 'rgba(161, 161, 170, 0.1)',
    borderRadius: borderRadius.card,
    padding: spacing.md,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: colors.foreground.muted,
    marginBottom: spacing.xs,
  },
  summaryIQD: {
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
    color: colors.primary.DEFAULT,
    marginBottom: spacing.xs,
  },
  summaryUSD: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: colors.foreground.muted,
  },
  sectionLabel: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: colors.foreground.DEFAULT,
    marginBottom: spacing.sm,
  },
  paymentMethodCard: {
    backgroundColor: colors.input.background,
    borderWidth: 1,
    borderColor: colors.input.border,
    borderRadius: borderRadius.input,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  paymentMethodCardSelected: {
    borderColor: colors.primary.DEFAULT,
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    borderWidth: 2,
  },
  paymentMethodCardDisabled: {
    opacity: 0.6,
  },
  paymentMethodContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  paymentMethodRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border.DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentMethodRadioSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary.DEFAULT,
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodName: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: colors.foreground.DEFAULT,
    marginBottom: spacing.xs,
  },
  paymentMethodNameSelected: {
    color: colors.primary.DEFAULT,
  },
  paymentMethodAccount: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: colors.foreground.muted,
  },
  copyButton: {
    padding: spacing.xs,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: isRTL ? 'Rabar_021' : 'Poppins-SemiBold',
    color: colors.foreground.DEFAULT,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.input.background,
    borderWidth: 1,
    borderColor: colors.input.border,
    borderRadius: borderRadius.input,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    fontFamily: isRTL ? 'Rabar_021' : 'Poppins-Regular',
    color: colors.foreground.DEFAULT,
  },
  hint: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: colors.foreground.muted,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  backButton: {
    flex: 1,
    backgroundColor: colors.input.background,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: borderRadius.button,
    paddingVertical: spacing.md + 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonContent: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: 6,
  },
  backButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: colors.foreground.DEFAULT,
  },
  submitButton: {
    flex: 2,
    borderRadius: borderRadius.button,
    overflow: 'hidden',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonGradient: {
    paddingVertical: spacing.md + 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: colors.primary.foreground,
  },
  });
};

