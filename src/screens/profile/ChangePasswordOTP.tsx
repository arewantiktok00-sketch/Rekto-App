import { ScreenHeader } from '@/components/common/ScreenHeader';
import { Text } from '@/components/common/Text';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/integrations/supabase/client';
import { spacing } from '@/theme/spacing';
import { inputStyleRTL } from '@/utils/rtl';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

const COOLDOWN_SECONDS = 120;

export function ChangePasswordOTP() {
  const navigation = useNavigation();
  const route = useRoute();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const email = (route.params as any)?.email as string;
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [cooldown, setCooldown] = useState(COOLDOWN_SECONDS);
  const [resendLoading, setResendLoading] = useState(false);
  const cooldownRef = useRef<NodeJS.Timeout | null>(null);
  const otpRefs = useRef<(TextInput | null)[]>([]);

  const formatCooldown = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const startCooldown = () => {
    setCooldown(COOLDOWN_SECONDS);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          cooldownRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    startCooldown();
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); };
  }, []);

  const goToNewPassword = (otpCode: string) => {
    if (otpCode.length !== 6) return;
    navigation.navigate('ChangePasswordNewPassword' as never, { email, code: otpCode } as never);
  };

  const handleOtpChange = (index: number, value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length > 1) {
      const newOtp = [...otp];
      digits.split('').slice(0, 6).forEach((d, i) => {
        if (index + i < 6) newOtp[index + i] = d;
      });
      setOtp(newOtp);
      const lastIndex = Math.min(index + digits.length, 5);
      otpRefs.current[lastIndex]?.focus();
      if (newOtp.every((d) => d !== '')) goToNewPassword(newOtp.join(''));
    } else if (digits) {
      const newOtp = [...otp];
      newOtp[index] = digits;
      setOtp(newOtp);
      if (index < 5) otpRefs.current[index + 1]?.focus();
      if (newOtp.every((d) => d !== '')) goToNewPassword(newOtp.join(''));
    }
  };

  const handleOtpKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      const newOtp = [...otp];
      newOtp[index - 1] = '';
      setOtp(newOtp);
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setResendLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('auth-change-password', {
        body: { action: 'send_code', email: email?.trim()?.toLowerCase() },
      });
      if (error || data?.error) {
        // friendly message
        return;
      }
      startCooldown();
    } finally {
      setResendLoading(false);
    }
  };

  const styles = createStyles(colors);

  return (
    <View style={[styles.container, { backgroundColor: colors.background.DEFAULT }]}>
      <ScreenHeader
        title={t('enterCode') || 'Enter Code'}
        onBack={() => navigation.goBack()}
      />
      <View style={styles.content}>
        <Text style={styles.subtitle}>Enter the 6-digit code sent to {email || 'your email'}</Text>
        <View style={styles.otpRow}>
          {otp.map((digit, i) => (
            <TextInput
              key={i}
              ref={(r) => { otpRefs.current[i] = r; }}
              value={digit}
              onChangeText={(v) => handleOtpChange(i, v)}
              onKeyPress={({ nativeEvent }) => handleOtpKeyPress(i, nativeEvent.key)}
              keyboardType="number-pad"
              maxLength={1}
              textAlign="center"
              style={[styles.otpCell, digit ? styles.otpCellFilled : null, inputStyleRTL()]}
            />
          ))}
        </View>
        <View style={styles.resendSection}>
          <Text style={styles.resendLabel}>Didn't receive the code?</Text>
          <TouchableOpacity
            onPress={handleResend}
            disabled={cooldown > 0 || resendLoading}
            style={styles.resendButton}
          >
            <Text style={styles.resendButtonText}>
              {cooldown > 0 ? `Resend code in ${formatCooldown(cooldown)}` : 'Resend Code'}
            </Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
          <Text style={styles.backLinkText}>{t('back') || 'Back'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1 },
    content: { flex: 1, padding: spacing.screenPadding, paddingTop: spacing[4] },
    subtitle: {
      fontSize: 16,
      color: colors.foreground.muted,
      textAlign: 'center',
      marginBottom: spacing[6],
    },
    otpRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 8,
      marginBottom: spacing[6],
    },
    otpCell: {
      width: 48,
      height: 56,
      borderWidth: 2,
      borderRadius: 12,
      fontSize: 24,
      fontWeight: 'bold',
      textAlign: 'center',
      borderColor: '#2A2A3E',
      backgroundColor: '#1A1A2E',
      color: '#FFFFFF',
    },
    otpCellFilled: { borderColor: '#7C3AED' },
    resendSection: { alignItems: 'center', marginBottom: spacing[6] },
    resendLabel: { fontSize: 14, color: colors.foreground.muted, marginBottom: 8 },
    resendButton: { paddingVertical: 8, paddingHorizontal: 16 },
    resendButtonText: { fontSize: 15, color: '#7C3AED', fontWeight: '600' },
    backLink: { alignSelf: 'center' },
    backLinkText: { fontSize: 14, color: '#7C3AED', fontWeight: '500' },
  });
