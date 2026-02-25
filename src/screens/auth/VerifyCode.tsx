import { Text } from '@/components/common/Text';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/integrations/supabase/client';
import { borderRadius, spacing } from '@/theme/spacing';
import { normalizePhoneToE164 } from '@/utils/phone';
import { inputStyleRTL } from '@/utils/rtl';
import { toast } from '@/utils/toast';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

export function VerifyCode() {
  const navigation = useNavigation();
  const route = useRoute();
  const { t } = useLanguage();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(120);
  const codeInputs = React.useRef<TextInput[]>([]);
  const cooldownRef = useRef<NodeJS.Timeout | null>(null);

  const startCooldown = (seconds: number) => {
    setCooldownSeconds(seconds);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldownSeconds((prev) => {
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
    startCooldown(120);
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); };
  }, []);

  const formatCooldown = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  };

  // Get params from route
  const email = (route.params as any)?.email;
  const phoneNumber = (route.params as any)?.phoneNumber;
  const method = (route.params as any)?.method || (email ? 'email' : 'phone'); // 'email' or 'phone'
  const purpose = (route.params as any)?.purpose || 'signup'; // 'signup' or 'reset'
  const password = (route.params as any)?.password; // For phone signup
  const fullName = (route.params as any)?.fullName; // For phone signup

  const handleCodeChange = (value: string, index: number) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length > 1) {
      const newCode = [...code];
      digits.split('').slice(0, 6).forEach((d, i) => {
        if (index + i < 6) newCode[index + i] = d;
      });
      setCode(newCode);
      const lastIndex = Math.min(index + digits.length, 5);
      codeInputs.current[lastIndex]?.focus();
      if (newCode.every(digit => digit !== '') && newCode.join('').length === 6) {
        handleVerify(newCode.join(''));
      }
      return;
    }
    if (!digits) return;

    const newCode = [...code];
    newCode[index] = digits;
    setCode(newCode);

    if (index < 5) codeInputs.current[index + 1]?.focus();

    if (newCode.every(digit => digit !== '') && newCode.join('').length === 6) {
      handleVerify(newCode.join(''));
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !code[index] && index > 0) {
      codeInputs.current[index - 1]?.focus();
    }
  };

  const clearCode = () => {
    setCode(['', '', '', '', '', '']);
    codeInputs.current[0]?.focus();
  };

  const handleVerify = async (verificationCode: string) => {
    if (verificationCode.length !== 6) {
      toast.warning('Invalid code', 'Please enter the 6-digit code');
      return;
    }

    setLoading(true);
    try {
      if (method === 'email') {
        // Email verification
        const { data, error } = await supabase.functions.invoke('auth-verify-code', {
          body: { 
            email: email,
            code: verificationCode,
          },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        toast.success('Verified', 'Email verified successfully');

        navigation.navigate('Auth', { screen: 'Login' });
      } else {
        // Phone verification
        const normalizedPhone = normalizePhoneToE164(phoneNumber);
        
        const { data, error } = await supabase.functions.invoke('auth-phone-verify-otp', {
          body: { 
            phoneNumber: normalizedPhone,
            code: verificationCode,
            otp: verificationCode,
          },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        // If this is for signup, proceed to create account
        if (purpose === 'signup' && password && fullName) {
          const { data: signupData, error: signupError } = await supabase.functions.invoke('auth-phone-signup', {
            body: {
              phoneNumber: normalizedPhone,
              phone: normalizedPhone,
              password: password,
              fullName: fullName,
              full_name: fullName,
            },
          });

          if (signupError) throw signupError;
          if (signupData?.error) throw new Error(signupData.error);

          // Success - session is returned for auto-login
          if (signupData?.session && signupData?.user) {
            await supabase.auth.setSession({
              access_token: signupData.session.access_token,
              refresh_token: signupData.session.refresh_token,
            });

            toast.success('Signup successful', 'Your account is ready');
          }
        } else if (purpose === 'login') {
          toast.success('Verified', 'Code verified successfully');
          navigation.navigate('Auth', {
            screen: 'PhoneLogin',
            params: { phoneNumber: normalizedPhone },
          });
        } else {
          // Just verification (for password reset flow)
          toast.success('Verified', 'You can reset your password');

          // Navigate to reset password screen
          navigation.navigate('Auth', { 
            screen: 'ResetPassword',
            params: {
              phoneNumber: normalizedPhone,
              method: 'phone'
            }
          });
        }
      }
    } catch (error: any) {
      const attemptsRemaining =
        error?.context?.attemptsRemaining ??
        error?.attemptsRemaining ??
        null;
      toast.error(
        'Verification Failed',
        attemptsRemaining !== null
          ? `${error.message || 'Invalid code. Please try again.'} Attempts left: ${attemptsRemaining}`
          : error.message || 'Invalid code. Please try again.'
      );
      clearCode();
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>
          {method === 'email' ? 'Verify Your Email' : 'Verify Your Phone'}
        </Text>
        <Text style={styles.subtitle}>
          {method === 'email' 
            ? `Enter the 6-digit code sent to ${email || 'your email'}`
            : `Enter the 6-digit code sent to ${phoneNumber || 'your phone'}`
          }
        </Text>

        <View style={styles.codeContainer}>
          {code.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => {
                if (ref) codeInputs.current[index] = ref;
              }}
              style={[styles.codeInput, inputStyleRTL()]}
              value={digit}
              onChangeText={(value) => handleCodeChange(value, index)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.buttonContainer, loading && styles.buttonDisabled]}
          onPress={() => handleVerify(code.join(''))}
          disabled={loading || code.some(d => !d)}
        >
          <LinearGradient
            colors={['#7C3AED', '#9333EA']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.button}
          >
            <Text style={styles.buttonText}>
              {loading ? t('loading') : 'Verify'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.resendButton, cooldownSeconds > 0 && styles.resendButtonDisabled]}
          onPress={async () => {
            if (cooldownSeconds > 0) return;
            try {
              if (method === 'email' && email) {
                const response = await supabase.functions.invoke('auth-resend-code', {
                  body: { email },
                });
                if (response.error) {
                  toast.warning('Please wait', 'Please wait a moment before requesting a new code.');
                  return;
                }
                const data = response.data;
                if (data?.error) {
                  const msg = (data.error as string).toLowerCase();
                  if (msg.includes('wait') || msg.includes('recent') || msg.includes('cooldown')) {
                    toast.warning('Please wait', 'Please wait 2 minutes before requesting a new code.');
                  } else {
                    toast.error('Error', data.error as string);
                  }
                  return;
                }
                toast.success('Code sent', 'Verification code sent! Check your email.');
                startCooldown(120);
              } else if (method === 'phone' && phoneNumber) {
                const normalizedPhone = normalizePhoneToE164(phoneNumber);
                const response = await supabase.functions.invoke('auth-phone-send-otp', {
                  body: { phoneNumber: normalizedPhone, purpose: purpose || 'signup' },
                });
                if (response.error) {
                  toast.warning('Please wait', 'Please wait a moment before requesting a new code.');
                  return;
                }
                const data = response.data;
                if (data?.error) {
                  const msg = (data.error as string).toLowerCase();
                  if (msg.includes('wait') || msg.includes('recent') || msg.includes('cooldown')) {
                    toast.warning('Please wait', 'Please wait 2 minutes before requesting a new code.');
                  } else {
                    toast.error('Error', data.error as string);
                  }
                  return;
                }
                if (data?.hasValidToken && data?.cooldown) {
                  toast.warning('Please wait', `Please wait ${Math.ceil((data.cooldown || 120) / 60)} minutes before requesting a new code.`);
                  startCooldown(data.cooldown || 120);
                } else {
                  toast.success('Code sent', `Code sent via ${data?.method || 'WhatsApp'}`);
                  startCooldown(120);
                }
              }
            } catch {
              toast.error('Error', 'Could not send code. Please check your connection and try again.');
            }
          }}
          disabled={cooldownSeconds > 0}
        >
          <Text style={styles.resendText}>
            {cooldownSeconds > 0 ? `Resend Code (${formatCooldown(cooldownSeconds)})` : 'Resend Code'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.DEFAULT,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.foreground.DEFAULT,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.foreground.muted,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
    gap: spacing.sm,
    direction: 'ltr',
  },
  codeInput: {
    flex: 1,
    height: 60,
    borderWidth: 2,
    borderColor: colors.input.border,
    borderRadius: borderRadius.input,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    color: colors.foreground.DEFAULT,
    backgroundColor: colors.input.background,
    writingDirection: 'ltr',
  },
  buttonContainer: {
    width: '100%',
    marginBottom: spacing.md,
  },
  button: {
    height: 56,
    borderRadius: borderRadius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.primary.foreground,
    fontSize: 17,
    fontWeight: '600',
  },
  resendButton: {
    alignItems: 'center',
  },
  resendButtonDisabled: {
    opacity: 0.6,
  },
  resendText: {
    color: colors.primary.DEFAULT,
    fontSize: 14,
    fontWeight: '500',
  },
});

