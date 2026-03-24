import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useOwnerAuth } from '@/hooks/useOwnerAuth';
import { supabase } from '@/integrations/supabase/client';
import { getErrorMessageForUser } from '@/utils/errorHandling';
import { sendPushToOwners } from '@/services/notificationPush';
import { borderRadius, spacing } from '@/theme/spacing';
import { inputStyleRTL } from '@/utils/rtl';
import { toast } from '@/utils/toast';
import { useNavigation } from '@react-navigation/native';
import { AlertCircle, Check, Copy, CreditCard, HelpCircle } from 'lucide-react-native';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Clipboard,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

interface TransactionIdInputProps {
  campaignId: string;
  onSuccess: () => void;
}

const paymentMethods = [
  { id: 'fastpay', name: 'FastPay', account: '7504881516', labelKu: 'فاستپەی' },
  { id: 'fib', name: 'FIB', account: '7504881516', labelKu: 'FIB' },
  { id: 'superqi', name: 'SuperQi / Qi Card', account: '4734053731', labelKu: 'سوپەرکی / کارتی کی' },
];

export const TransactionIdInput: React.FC<TransactionIdInputProps> = ({
  campaignId,
  onSuccess,
}) => {
  const navigation = useNavigation();
  const { t, language, isRTL } = useLanguage();
  const { colors } = useTheme();
  const { hasAdminAccess } = useOwnerAuth();
  const styles = createStyles(colors, isRTL);

  const [submitting, setSubmitting] = useState(false);
  const [senderName, setSenderName] = useState('');
  const [amountIQD, setAmountIQD] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

  const copyToClipboard = (text: string, name: string) => {
    try {
      Clipboard.setString(text);
      toast.info(t('copied'), `${name} ${t('accountNumberCopied')}`);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast.error(t('error'), t('copyFailed'));
    }
  };

  const handleSubmit = async () => {
    const trimmedName = senderName.trim();
    const trimmedAmount = amountIQD.trim().replace(/,/g, '');

    if (!selectedMethod) {
      toast.warning(t('required'), t('selectPaymentMethod'));
      return;
    }

    if (!trimmedName || trimmedName.length < 2) {
      toast.warning(t('required'), t('enterSenderName'));
      return;
    }

    if (!trimmedAmount || isNaN(Number(trimmedAmount)) || Number(trimmedAmount) <= 0) {
      toast.warning(t('required'), t('enterValidAmount'));
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-review', {
        body: {
          action: 'upload-receipt',
          campaignId,
          transactionId: trimmedName,
          senderName: trimmedName,
          amountIQD: trimmedAmount,
          paymentMethod: selectedMethod,
        },
      });

      if (error) {
        console.error('[admin-review] upload-receipt SDK error:', error);
        const msg = getErrorMessageForUser(error, data ?? null, hasAdminAccess, language === 'ar' ? 'ar' : 'ckb');
        Alert.alert(hasAdminAccess ? 'Error' : t('error'), msg);
        return;
      }
      if (!data?.success) {
        const msg = getErrorMessageForUser(null, data as { success?: boolean; error?: string } ?? null, hasAdminAccess, language === 'ar' ? 'ar' : 'ckb');
        console.error('[admin-review] upload-receipt business error:', data?.error);
        Alert.alert(hasAdminAccess ? t('actionFailed') : (language === 'ckb' ? 'هەڵە' : 'خطأ'), msg);
        return;
      }

      toast.success(t('submitted'), data?.message || t('paymentSubmitted'));

      await sendPushToOwners(campaignId, t('pushUserPaidTitle'), t('pushUserPaidBody'));

      setSenderName('');
      setAmountIQD('');
      setSelectedMethod(null);
      onSuccess();
    } catch (err: any) {
      console.error('[admin-review] upload-receipt unexpected error:', err);
      const msg = getErrorMessageForUser(err, null, hasAdminAccess, language === 'ar' ? 'ar' : 'ckb');
      Alert.alert(hasAdminAccess ? 'Error' : t('error'), msg);
    } finally {
      setSubmitting(false);
    }
  };

  const isValid = selectedMethod && senderName.trim().length >= 2 && amountIQD.trim().length > 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <CreditCard size={20} color={colors.primary.DEFAULT} />
        <Text style={styles.headerTitle}>
          {isRTL ? 'پارە بدە' : t('payNow') || 'Pay Now'}
        </Text>
      </View>

      {/* Description */}
      <Text style={styles.description}>
        {isRTL
          ? 'شێوازی پارەدان هەڵبژێرە، پارە بنێرە، پاشان زانیاریەکان بنووسە.'
          : 'Select a payment method, send the payment, then enter your details below.'}
      </Text>
      <Text style={styles.p2pNote}>
        {isRTL
          ? 'پارەدان تەنها P2P ـە بۆ ئێستا.'
          : 'Payment is P2P only for now.'}
      </Text>
      <TouchableOpacity
        style={styles.tutorialButton}
        onPress={() => navigation.navigate('Main' as never, { screen: 'Tutorial' } as never)}
        activeOpacity={0.8}
      >
        <Text style={styles.tutorialButtonText}>
          {isRTL ? 'گرتە بکە بۆ فێرکاری' : 'Click here for Tutorial'}
        </Text>
      </TouchableOpacity>

      {/* Payment Methods */}
      <View style={styles.methodsContainer}>
        {paymentMethods.map((method) => (
          <TouchableOpacity
            key={method.id}
            style={[
              styles.methodCard,
              selectedMethod === method.id && styles.methodCardSelected,
            ]}
            onPress={() => setSelectedMethod(method.id)}
            activeOpacity={0.7}
          >
            <View style={styles.methodLeft}>
              <View style={styles.radioButton}>
                {selectedMethod === method.id && (
                  <View style={styles.radioButtonInner} />
                )}
              </View>
              <View style={styles.methodInfo}>
                <Text style={styles.methodName}>
                  {isRTL ? method.labelKu : method.name}
                </Text>
                <Text style={styles.methodAccount}>
                  {isRTL ? 'هەژمار:' : 'Account:'} {method.account}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.copyButton}
              onPress={(e) => {
                e.stopPropagation();
                copyToClipboard(method.account, method.name);
              }}
            >
              <Copy size={16} color={colors.primary.DEFAULT} />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </View>

      {/* Sender Name Input */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          {isRTL ? 'ناوی نێردەر' : 'Sender Name'} <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={[styles.input, inputStyleRTL()]}
          value={senderName}
          onChangeText={setSenderName}
          placeholder={isRTL ? 'بۆ نموونە: ئەحمەد محەمەد' : 'e.g., Ahmed Mohammed'}
          placeholderTextColor={colors.input.placeholder}
          editable={!submitting}
        />
        <Text style={styles.hint}>
          {isRTL
            ? 'تکایە ناوی تەواوت بنووسە وەک لە ئەپلی بانکدا دەرکەوێت بۆ ئەوەی بتوانین پارەکەت پشتڕاست بکەینەوە.'
            : 'Please enter your full name as it appears in your bank app so we can verify your payment.'}
        </Text>
      </View>

      {/* Amount Input */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          {isRTL ? 'بڕی پارەی نێردراو بە دینار' : 'Amount Sent in IQD'} <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={[styles.input, styles.amountInput, inputStyleRTL()]}
          value={amountIQD}
          onChangeText={(text) => {
            // Allow only numbers and commas
            const cleaned = text.replace(/[^0-9,]/g, '');
            setAmountIQD(cleaned);
          }}
          placeholder={isRTL ? 'بۆ نموونە: ١٨,٠٠٠' : 'e.g., 18,000'}
          placeholderTextColor={colors.input.placeholder}
          keyboardType="numeric"
          textAlign={isRTL ? 'right' : 'left'}
          editable={!submitting}
        />
        <View style={styles.warningBox}>
          <AlertCircle size={16} color={colors.warning} />
          <Text style={styles.warningText}>
            {isRTL
              ? 'تکایە یەکەم پارە بدە، پاشان بڕی پارەی نێردراو تۆمار بکە.'
              : '⚠️ Please make the payment first, and then record the amount of money you have sent.'}
          </Text>
        </View>
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitButton, (!isValid || submitting) && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={!isValid || submitting}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[colors.primary.DEFAULT, colors.primary.dark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.submitButtonGradient}
        >
          {submitting ? (
            <ActivityIndicator color={colors.primary.foreground} />
          ) : (
            <>
              <Check size={20} color={colors.primary.foreground} />
              <Text style={styles.submitButtonText}>
                {isRTL ? 'ناردنی پارە' : t('submitPayment') || 'Submit Payment'}
              </Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>

      {/* How to Pay Button */}
      <TouchableOpacity
        style={styles.helpButton}
        onPress={() => {
          // Navigate to tutorial - you may need to adjust navigation
          Alert.alert(t('howToPay'), t('visitTutorialForInfo'), [{ text: t('ok') }]);
        }}
      >
        <HelpCircle size={16} color={colors.primary.DEFAULT} />
        <Text style={styles.helpButtonText}>{t('howToPay')}</Text>
      </TouchableOpacity>
    </View>
  );
};

const createStyles = (colors: any, isRTL: boolean) => {
  const rowDir = 'row';
  return StyleSheet.create({
  container: {
    backgroundColor: colors.card.background,
    borderRadius: borderRadius.card,
    padding: spacing.md,
    margin: spacing.md,
    borderWidth: 2,
    borderColor: 'rgba(124, 58, 237, 0.3)',
    shadowColor: colors.border.DEFAULT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: rowDir,
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.foreground.DEFAULT,
    fontFamily: 'Rabar_021',
  },
  description: {
    fontSize: 14,
    color: colors.foreground.muted,
    marginBottom: spacing.md,
    textAlign: isRTL ? 'right' : 'left',
  },
  p2pNote: {
    fontSize: 12,
    color: colors.foreground.muted,
    textAlign: isRTL ? 'right' : 'left',
    marginBottom: spacing.sm,
  },
  tutorialButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#E5E7EB',
    marginBottom: spacing.md,
  },
  tutorialButtonText: {
    fontSize: 12,
    color: '#111827',
    fontWeight: '600',
  },
  methodsContainer: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  methodCard: {
    flexDirection: rowDir,
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.background.secondary,
  },
  methodCardSelected: {
    borderColor: colors.primary.DEFAULT,
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
  },
  methodLeft: {
    flexDirection: rowDir,
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border.DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary.DEFAULT,
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.foreground.DEFAULT,
    marginBottom: 2,
  },
  methodAccount: {
    fontSize: 12,
    color: colors.foreground.muted,
    fontFamily: 'monospace',
  },
  copyButton: {
    padding: spacing.xs,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.foreground.DEFAULT,
    marginBottom: spacing.xs,
    textAlign: isRTL ? 'right' : 'left',
  },
  required: {
    color: colors.error,
  },
  input: {
    backgroundColor: colors.input.background,
    borderWidth: 1,
    borderColor: colors.input.border,
    borderRadius: borderRadius.input,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: colors.foreground.DEFAULT,
    minHeight: 52,
  },
  amountInput: {
    fontSize: 18,
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    color: colors.foreground.muted,
    marginTop: spacing.xs,
    textAlign: isRTL ? 'right' : 'left',
  },
  warningBox: {
    flexDirection: rowDir,
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: colors.warning,
    textAlign: isRTL ? 'right' : 'left',
  },
  submitButton: {
    width: '100%',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.button,
    overflow: 'hidden',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonGradient: {
    flexDirection: rowDir,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
    height: 56,
  },
  submitButtonText: {
    color: colors.primary.foreground,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Rabar_021',
  },
  helpButton: {
    flexDirection: rowDir,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  helpButtonText: {
    fontSize: 14,
    color: colors.primary.DEFAULT,
    fontWeight: '500',
  },
  });
};

