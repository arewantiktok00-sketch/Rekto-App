import { Text } from '@/components/common/Text';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase, supabaseRead } from '@/integrations/supabase/client';
import { calculateTotalWithTax, MIN_EXTENSION_BUDGET_USD } from '@/lib/pricing';
import { borderRadius, spacing } from '@/theme/spacing';
import { getFontFamilyByLanguage } from '@/utils/fonts';
import { inputStyleRTL } from '@/utils/rtl';
import { toast } from '@/utils/toast';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView, BottomSheetView } from '@gorhom/bottom-sheet';
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, ChevronDown, ChevronUp, Copy, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Clipboard, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DEFAULT_EXCHANGE_RATE = 1450;

interface ExtendAdModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  campaignTitle: string;
  dailyBudget: number;  // Campaign's current daily budget
  onSuccess: () => void;  // Callback after successful submission
}

const paymentMethods = [
  { id: 'fastpay', name: 'FastPay', account: '7504881516' },
  { id: 'fib', name: 'FIB', account: '7504881516' },
  { id: 'superqi', name: 'SuperQi / Qi Card', account: '4734053731' },
];

export const ExtendAdModal: React.FC<ExtendAdModalProps> = ({
  open,
  onOpenChange,
  campaignId,
  campaignTitle,
  dailyBudget,
  onSuccess,
}) => {
  const { t, language } = useLanguage();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [step, setStep] = useState<'select' | 'payment'>('select');
  const [extensionDays, setExtensionDays] = useState(1);
  const [senderName, setSenderName] = useState('');
  const [amountIQD, setAmountIQD] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [breakdownExpanded, setBreakdownExpanded] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(DEFAULT_EXCHANGE_RATE);
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);

  // Fetch exchange rate from app_settings
  useEffect(() => {
    const fetchExchangeRate = async () => {
      try {
        const { data } = await supabaseRead
          .from('app_settings')
          .select('value')
          .eq('key', 'exchange_rate')
          .maybeSingle();
        
        if (data?.value) {
          setExchangeRate(Number(data.value) || DEFAULT_EXCHANGE_RATE);
        }
      } catch (error) {
        console.error('Failed to fetch exchange rate:', error);
      }
    };
    fetchExchangeRate();
  }, []);

  // Open/close bottom sheet based on open prop
  useEffect(() => {
    if (open) {
      bottomSheetRef.current?.snapToIndex(0);
    } else {
      bottomSheetRef.current?.close();
    }
  }, [open]);

  const snapPoints = React.useMemo(() => ['90%'], []);

  // Calculate pricing using centralized pricing functions
  // Minimum $20/day for extensions (even if campaign is $10/day)
  const extensionAmountUSD = extensionDays * Math.max(dailyBudget, MIN_EXTENSION_BUDGET_USD);
  const pricing = calculateTotalWithTax(extensionAmountUSD, exchangeRate);
  
  // IMPORTANT: API receives BASE budget (without tax)
  // Tax is platform revenue, not ad spend
  const baseBudgetUSD = extensionDays * Math.max(dailyBudget, MIN_EXTENSION_BUDGET_USD);

  // Auto-fill IQD amount when days change
  useEffect(() => {
    if (step === 'payment') {
      setAmountIQD(pricing.totalIQD.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','));
    }
  }, [extensionDays, step, pricing.totalIQD]);

  const handleClose = useCallback(() => {
    // Reset all state on close
    setStep('select');
    setExtensionDays(1);
    setSenderName('');
    setAmountIQD('');
    setSelectedMethod(null);
    setBreakdownExpanded(false);
    setCopiedAccount(null);
    onOpenChange(false);
  }, [onOpenChange]);

  const handleContinue = () => {
    // Validation: extensionDays must be >= 1
    if (extensionDays < 1 || extensionDays > 7) {
      toast.error('Error', 'Something went wrong');
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
      toast.success('Success', 'Operation completed');
      setTimeout(() => setCopiedAccount(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleSubmit = async () => {
    // Validation Step 2: selectedMethod required, senderName >= 2 chars, amountIQD not empty
    if (!selectedMethod) {
      toast.error('Error', 'Something went wrong');
      return;
    }

    if (!senderName.trim() || senderName.trim().length < 2) {
      toast.error('Error', 'Something went wrong');
      return;
    }

    const amountIQDClean = amountIQD.replace(/,/g, '');
    if (!amountIQDClean || parseFloat(amountIQDClean) !== pricing.totalIQD) {
      toast.error('Error', 'Something went wrong');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-review', {
        body: {
          action: 'extension-payment',
          campaignId,
          extensionDays,
          extensionAmount: baseBudgetUSD, // ✅ BASE ONLY - no tax (tax is platform revenue, not ad spend)
          transactionId: senderName.trim(),
          paymentMethod: selectedMethod, // 'fastpay' | 'fib' | 'superqi'
          amountIQD: amountIQDClean,
        },
      });

      if (error) {
        console.error('[admin-review] extension-payment SDK error:', error);
        Alert.alert('Error', 'Network error. Please check your connection and try again.');
        return;
      }
      if (!data?.success) {
        const errorMsg = data?.error || 'Failed to submit extension request';
        console.error('[admin-review] extension-payment business error:', errorMsg);
        Alert.alert('Action Failed', errorMsg);
        return;
      }

      toast.success('Success', data?.message || 'Operation completed');
      handleClose();
      onSuccess();
    } catch (err: any) {
      console.error('[admin-review] extension-payment unexpected error:', err);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fontFamily = getFontFamilyByLanguage(language as 'ckb' | 'ar');
  const isRTL = language === 'ckb' || language === 'ar';
  const styles = createStyles(colors, fontFamily, isRTL, breakdownExpanded);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    []
  );

  const canSubmit =
    !loading &&
    !!selectedMethod &&
    senderName.trim().length >= 2 &&
    !!amountIQD.replace(/,/g, '');


  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={open ? 0 : -1}
      snapPoints={snapPoints}
      enablePanDownToClose
      keyboardBehavior="extend"
      keyboardBlurBehavior="restore"
      topInset={insets.top}
      bottomInset={0}
      onClose={handleClose}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.bottomSheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <BottomSheetView style={styles.container}>
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

        <BottomSheetScrollView
          style={styles.content}
          contentContainerStyle={[
            styles.contentContainer,
            { paddingBottom: insets.bottom + spacing.lg }
          ]}
          showsVerticalScrollIndicator={false}
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
                <Slider
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
                      <Text style={styles.costLabel}>{t('costPerDay') || 'Cost per day'}</Text>
                      <Text style={styles.costValue}>${Math.max(dailyBudget, MIN_EXTENSION_BUDGET_USD).toFixed(2)}/{t('perDay') || 'day'}</Text>
                    </View>
                    <View style={styles.costRow}>
                      <Text style={styles.costLabel}>{t('duration') || 'Duration'}</Text>
                      <Text style={styles.costValue}>{extensionDays} {extensionDays === 1 ? t('day') || 'day' : t('days') || 'days'}</Text>
                    </View>
                    <View style={styles.costRow}>
                      <Text style={styles.costLabel}>{t('subtotal') || 'Subtotal'}</Text>
                      <Text style={styles.costValue}>${pricing.budget.toFixed(2)}</Text>
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
                  <Text style={styles.totalUSD}>(${pricing.totalUSD.toFixed(1)} USD)</Text>
                  <Text style={styles.totalIQD}>
                    {pricing.totalIQD.toLocaleString()} IQD (دینار)
                  </Text>
                </View>
              </View>

              {/* Info Text */}
              <Text style={styles.infoText}>
                💳 {t('proceedToPaymentNext') || 'You will proceed to payment next'}
              </Text>

              {/* Continue Button */}
              <TouchableOpacity
                style={styles.continueButton}
                onPress={handleContinue}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#7C3AED', '#6D28D9']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.continueButtonGradient}
                >
                  <Text style={styles.continueButtonText}>
                    {t('continueToPayment') || 'Continue to Payment'}
                  </Text>
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
                  {pricing.totalIQD.toLocaleString()} IQD (دینار)
                </Text>
                <Text style={styles.summaryUSD}>
                  (${pricing.totalUSD.toFixed(1)} USD)
                </Text>
              </View>

              {/* Payment Method Selection */}
              <Text style={styles.sectionLabel}>{t('selectPaymentMethod') || 'Select Payment Method'}</Text>
              {paymentMethods.map((method) => (
                <TouchableOpacity
                  key={method.id}
                  style={[
                    styles.paymentMethodCard,
                    selectedMethod === method.id && styles.paymentMethodCardSelected,
                  ]}
                  onPress={() => setSelectedMethod(method.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.paymentMethodContent}>
                    <View style={styles.paymentMethodRadio}>
                      {selectedMethod === method.id && (
                        <View style={styles.paymentMethodRadioSelected} />
                      )}
                    </View>
                    <View style={styles.paymentMethodInfo}>
                      <Text style={[
                        styles.paymentMethodName,
                        selectedMethod === method.id && styles.paymentMethodNameSelected,
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
                placeholder={pricing.totalIQD.toLocaleString()}
                placeholderTextColor={colors.input.placeholder}
                keyboardType="numeric"
                textAlign={isRTL ? 'right' : 'left'}
              />
              <Text style={styles.hint}>
                ⚠️ {t('makePaymentFirst') || 'Please make the payment first'}
              </Text>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={handleBack}
                  activeOpacity={0.8}
                >
                  <Text style={styles.backButtonText}>{t('back') || 'Back'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    !canSubmit && styles.submitButtonDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={!canSubmit}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#7C3AED', '#6D28D9']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.submitButtonGradient}
                  >
                    {loading ? (
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
        </BottomSheetScrollView>
      </BottomSheetView>
    </BottomSheet>
  );
};

const createStyles = (colors: any, fontFamily: string, isRTL: boolean, breakdownExpanded: boolean) => {
  const rowDir = 'row';
  return StyleSheet.create({
  bottomSheetBackground: {
    backgroundColor: colors.background.DEFAULT,
  },
  handleIndicator: {
    backgroundColor: colors.border.DEFAULT,
  },
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
    // Ring effect around selected
    borderWidth: 2,
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

