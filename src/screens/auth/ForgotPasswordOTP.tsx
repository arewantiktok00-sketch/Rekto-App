import { Text } from '@/components/common/Text';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/integrations/supabase/client';
import { spacing } from '@/theme/spacing';
import { iconTransformRTL } from '@/utils/rtl';
import { toast } from '@/utils/toast';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, KeyRound } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const COOLDOWN_SECONDS = 120;

export function ForgotPasswordOTP() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { colors } = useTheme();
  const styles = createStyles(colors, insets);
  const email = (route.params as any)?.email as string;

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [cooldown, setCooldown] = useState(COOLDOWN_SECONDS);
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
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const goToNewPassword = (otpCode: string) => {
    if (otpCode.length !== 6) return;
    navigation.navigate('Auth', {
      screen: 'ForgotPasswordNewPassword',
      params: { email: email?.trim()?.toLowerCase(), code: otpCode },
    });
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
    try {
      const { data, error } = await supabase.functions.invoke('auth-forgot-password', {
        body: { email: email?.trim()?.toLowerCase() },
      });
      if (error) {
        toast.warning(t('pleaseTryAgain'), t('couldNotSendCode'));
        return;
      }
      if (data?.error) {
        const msg = (data.error as string).toLowerCase();
        if (msg.includes('wait') || msg.includes('recent')) {
          toast.warning(t('pleaseWait'), t('pleaseWait2Minutes'));
          startCooldown();
        } else {
          toast.error(t('error'), t('somethingWentWrong'));
        }
        return;
      }
      toast.success(t('codeSent'), t('checkYourEmailForCode'));
      startCooldown();
    } catch {
      toast.error(t('error'), t('couldNotSendCode'));
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={colors.foreground.muted} style={iconTransformRTL()} />
        </TouchableOpacity>

        <View style={styles.iconCircle}>
          <KeyRound size={28} color="#7C3AED" />
        </View>
        <Text style={styles.title}>Enter Code</Text>
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
              style={[
                styles.otpCell,
                digit ? styles.otpCellFilled : undefined,
              ]}
            />
          ))}
        </View>

        <View style={styles.resendSection}>
          <Text style={styles.resendLabel}>Didn't receive the code?</Text>
          <TouchableOpacity
            onPress={handleResend}
            disabled={cooldown > 0}
            style={[styles.resendButton, cooldown > 0 && styles.resendButtonDisabled]}
          >
            <Text style={styles.resendButtonText}>
              {cooldown > 0 ? `Resend code in ${formatCooldown(cooldown)}` : 'Resend Code'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => navigation.navigate('Auth', { screen: 'Login' })}
        >
          <Text style={styles.linkText}>Remember your password? Login</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: any, insets: { top: number; bottom: number }) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background.DEFAULT },
    content: {
      flex: 1,
      paddingHorizontal: spacing.screenPadding,
      paddingTop: insets.top + spacing[6],
      paddingBottom: insets.bottom + spacing[4],
    },
    backButton: {
      position: 'absolute',
      start: spacing[4],
      top: insets.top + spacing[2],
      zIndex: 10,
    },
    iconCircle: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: 'rgba(124, 58, 237, 0.15)',
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
      marginTop: spacing[12],
      marginBottom: spacing[4],
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.foreground.DEFAULT,
      textAlign: 'center',
      marginBottom: spacing[2],
    },
    subtitle: {
      fontSize: 16,
      color: colors.foreground.muted,
      textAlign: 'center',
      marginBottom: spacing[8],
    },
    otpRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 8,
      marginBottom: spacing[8],
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
    otpCellFilled: {
      borderColor: '#7C3AED',
    },
    resendSection: {
      alignItems: 'center',
      marginBottom: spacing[6],
    },
    resendLabel: {
      fontSize: 14,
      color: colors.foreground.muted,
      marginBottom: 8,
    },
    resendButton: {
      paddingVertical: 8,
      paddingHorizontal: 16,
    },
    resendButtonDisabled: {
      opacity: 0.6,
    },
    resendButtonText: {
      fontSize: 15,
      color: '#7C3AED',
      fontWeight: '600',
    },
    linkButton: {
      alignSelf: 'center',
    },
    linkText: {
      fontSize: 14,
      color: colors.primary.DEFAULT,
      fontWeight: '500',
    },
  });
