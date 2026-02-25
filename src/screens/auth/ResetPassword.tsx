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
import React, { useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

export function ResetPassword() {
  const navigation = useNavigation();
  const route = useRoute();
  const { t } = useLanguage();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  
  // Get params from route
  const email = (route.params as any)?.email;
  const phoneNumber = (route.params as any)?.phoneNumber;
  const method = (route.params as any)?.method || (email ? 'email' : 'phone'); // 'email' or 'phone'
  
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const codeInputs = useRef<TextInput[]>([]);

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) value = value[0];
    
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    
    // Auto-focus next input
    if (value && index < 5) {
      codeInputs.current[index + 1]?.focus();
    }
    
    // Auto-submit when all fields filled
    if (newCode.every(digit => digit !== '') && newCode.join('').length === 6) {
      handleReset(newCode.join(''));
    }
  };

  const handleReset = async (otpCode?: string) => {
    const otp = otpCode || code.join('');
    
    if (otp.length !== 6) {
      toast.warning('Invalid code', 'Please enter the 6-digit code');
      return;
    }

    if (!newPassword || !confirmPassword) {
      toast.warning('Required', 'Please enter and confirm your password');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.warning('Passwords do not match', 'Please re-enter your password');
      return;
    }

    if (newPassword.length < 8) {
      toast.warning('Weak password', 'Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      if (method === 'email') {
        const { data, error } = await supabase.functions.invoke('auth-reset-password', {
          body: {
            email: email,
            code: otp,
            newPassword: newPassword,
          },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);
      } else {
        const normalizedPhone = normalizePhoneToE164(phoneNumber);
        
        const { data, error } = await supabase.functions.invoke('auth-phone-reset-password', {
          body: {
            phoneNumber: normalizedPhone,
            code: otp,
            newPassword: newPassword,
          },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);
      }

      Alert.alert(
        'Success',
        'Password reset successfully! You can now log in with your new password.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Auth', { screen: 'Login' }),
          },
        ]
      );
    } catch (error: any) {
      toast.error('Error', error.message || 'Failed to reset password');
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
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>
          Enter the verification code sent to {method === 'email' ? email : phoneNumber}
        </Text>

        {/* OTP Input - 6 digits */}
        <View style={styles.otpContainer}>
          {code.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => {
                if (ref) codeInputs.current[index] = ref;
              }}
              style={[styles.otpInput, inputStyleRTL()]}
              value={digit}
              onChangeText={(value) => handleCodeChange(index, value)}
              onKeyPress={({ nativeEvent }) => {
                if (nativeEvent.key === 'Backspace' && !digit && index > 0) {
                  codeInputs.current[index - 1]?.focus();
                }
              }}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
            />
          ))}
        </View>

        <TextInput
          style={[styles.input, inputStyleRTL()]}
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder={t('newPassword')}
          secureTextEntry
          autoCapitalize="none"
        />

        <TextInput
          style={[styles.input, inputStyleRTL()]}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder={t('confirmNewPassword')}
          secureTextEntry
          autoCapitalize="none"
        />

        <TouchableOpacity
          style={[styles.buttonContainer, loading && styles.buttonDisabled]}
          onPress={() => handleReset()}
          disabled={loading || code.some(d => !d)}
        >
          <LinearGradient
            colors={['#7C3AED', '#9333EA']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.button}
          >
            <Text style={styles.buttonText}>
              {loading ? t('loading') : (t('resetPassword') || 'Reset Password')}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>{t('back')}</Text>
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
    padding: spacing.screenPadding,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.foreground.DEFAULT,
    marginBottom: spacing[2.5],
  },
  subtitle: {
    fontSize: 16,
    color: colors.foreground.muted,
    marginBottom: spacing[8],
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[8],
    gap: spacing.sm,
    direction: 'ltr',
  },
  otpInput: {
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
  input: {
    width: '100%',
    minHeight: 48,
    height: 52,
    borderWidth: 1,
    borderColor: colors.input.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    marginBottom: spacing.inputGap,
    backgroundColor: colors.input.background,
    color: colors.foreground.DEFAULT,
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
  backButton: {
    alignItems: 'center',
  },
  backButtonText: {
    color: colors.primary.DEFAULT,
    fontSize: 14,
    fontWeight: '500',
  },
});

