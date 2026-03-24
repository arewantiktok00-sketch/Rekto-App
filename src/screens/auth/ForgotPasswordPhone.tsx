import { Text } from '@/components/common/Text';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/integrations/supabase/client';
import { borderRadius, spacing } from '@/theme/spacing';
import { normalizePhoneToE164 } from '@/utils/phone';
import { inputStyleRTL } from '@/utils/rtl';
import { toast } from '@/utils/toast';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function ForgotPasswordPhone() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { colors } = useTheme();
  const styles = createStyles(colors, insets);
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const formatPhoneNumber = (text: string) => {
    const digits = text.replace(/\D/g, '');
    if (digits.startsWith('0')) {
      return digits;
    }
    if (digits.length > 0 && !digits.startsWith('0')) {
      return '0' + digits;
    }
    return digits;
  };

  const handleSendOTP = async () => {
    if (!phone || phone.length < 10) {
      toast.warning('Required', 'Please enter a valid phone number');
      return;
    }

    setLoading(true);
    try {
      const normalizedPhone = normalizePhoneToE164(phone);
      
      const { data, error } = await supabase.functions.invoke('auth-phone-forgot-password', {
        body: { phoneNumber: normalizedPhone },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Check for rate limiting
      if (data?.hasValidToken && data?.cooldown) {
        toast.info(t('pleaseWait'), t('pleaseWaitMinutes'));
        return;
      }

      setSent(true);
      toast.success(t('codeSent'), t('codeSentViaWhatsApp'));
    } catch (error: any) {
      toast.error(t('error'), t('couldNotSendCode'));
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.contentSent}>
          <Text style={styles.title}>Check Your Phone</Text>
          <Text style={styles.subtitle}>
            We've sent a reset code to {phone}
          </Text>
          <TouchableOpacity
            style={styles.buttonContainer}
            onPress={() => {
              const normalizedPhone = normalizePhoneToE164(phone);
              navigation.navigate('Auth', { 
                screen: 'ResetPassword',
                params: {
                  phoneNumber: normalizedPhone,
                  method: 'phone'
                }
              });
            }}
          >
            <LinearGradient
              colors={['#7C3AED', '#9333EA']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.button}
            >
              <Text style={styles.buttonText}>Continue to Reset</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>{t('forgotPassword')}</Text>
        <Text style={styles.subtitle}>
          Enter your phone number and we'll send you a reset code
        </Text>

        <View style={styles.phoneContainer}>
          <Text style={styles.countryCode}>+964</Text>
          <TextInput
            style={[styles.phoneInput, inputStyleRTL()]}
            value={phone}
            onChangeText={(text) => setPhone(formatPhoneNumber(text))}
            placeholder="7501234567"
            keyboardType="phone-pad"
            maxLength={11}
          />
        </View>

        <TouchableOpacity
          style={[styles.buttonContainer, loading && styles.buttonDisabled]}
          onPress={handleSendOTP}
          disabled={loading}
        >
          <LinearGradient
            colors={['#7C3AED', '#9333EA']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.button}
          >
            <Text style={styles.buttonText}>
              {loading ? t('loading') : 'Send Reset Code'}
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

const createStyles = (colors: any, insets: { top: number; bottom: number }) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.DEFAULT,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.screenPadding,
    paddingTop: insets.top + spacing[6],
    paddingBottom: insets.bottom + spacing[6],
  },
  contentSent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.screenPadding,
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
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.input.border,
    borderRadius: borderRadius.input,
    marginBottom: spacing.inputGap,
    backgroundColor: colors.input.background,
    height: 52,
  },
  countryCode: {
    paddingHorizontal: spacing[4],
    fontSize: 16,
    color: colors.foreground.muted,
    borderEndWidth: 1,
    borderEndColor: colors.border.DEFAULT,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: spacing[4],
    fontSize: 16,
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

