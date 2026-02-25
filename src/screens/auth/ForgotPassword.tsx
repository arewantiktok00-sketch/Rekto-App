import { Text } from '@/components/common/Text';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/integrations/supabase/client';
import { spacing } from '@/theme/spacing';
import { inputStyleRTL } from '@/utils/rtl';
import { toast } from '@/utils/toast';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, Phone } from 'lucide-react-native';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

export function ForgotPassword() {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendReset = async () => {
    if (!email) {
      toast.warning('Required', 'Please enter your email');
      return;
    }

    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      
      const { data, error } = await supabase.functions.invoke('auth-forgot-password', {
        body: { email: normalizedEmail },
      });

      if (error) throw error;
      if (data?.error) {
        // Check if it's a Google account
        if (data.useGoogle) {
          toast.error('Use Google Sign-In', 'This account uses Google login');
          return;
        }
        throw new Error(data.error);
      }

      // Always show success for security (don't reveal if email exists)
      toast.success('Code Sent', 'Check your email for the 6-digit code');
      navigation.navigate('Auth', {
        screen: 'ForgotPasswordOTP',
        params: { email: normalizedEmail },
      });
    } catch (error: any) {
      toast.error('Error', error.message || 'Failed to send verification code');
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
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>{t('back')}</Text>
        </TouchableOpacity>

        <View style={styles.iconCircle}>
          <Mail size={28} color="#7C3AED" />
        </View>
        <Text style={styles.title}>{t('forgotPassword') || 'Forgot Password'}</Text>
        <Text style={styles.subtitle}>
          Enter your email and we'll send you a 6-digit verification code
        </Text>

        <TextInput
          style={[styles.input, inputStyleRTL()]}
          value={email}
          onChangeText={setEmail}
          placeholder={t('email')}
          placeholderTextColor={colors.input.placeholder}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />

        <TouchableOpacity
          style={[styles.buttonContainer, loading && styles.buttonDisabled]}
          onPress={handleSendReset}
          disabled={loading}
        >
          <LinearGradient
            colors={['#7C3AED', '#9333EA']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.button}
          >
            <Text style={styles.buttonText}>
              {loading ? t('loading') : 'Send Verification Code'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{t('or') || 'or'}</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          style={styles.phoneButton}
          onPress={() => navigation.navigate('Auth', { screen: 'ForgotPasswordPhone' })}
        >
          <Phone size={18} color={colors.primary.DEFAULT} />
          <Text style={styles.phoneButtonText}>Reset with Phone Number</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.loginLink}
          onPress={() => navigation.navigate('Auth', { screen: 'Login' })}
        >
          <Text style={styles.loginLinkText}>Remember your password? Login</Text>
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
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing[12],
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing[4],
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
  input: {
    width: '100%',
    minHeight: 48,
    height: 56,
    borderWidth: 1,
    borderColor: colors.input.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    marginBottom: spacing[4],
    backgroundColor: colors.input.background,
    color: colors.foreground.DEFAULT,
  },
  buttonContainer: {
    width: '100%',
    marginBottom: spacing.md,
  },
  button: {
    height: 56,
    borderRadius: 16,
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
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing[4],
    gap: spacing[2],
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border.DEFAULT,
  },
  dividerText: {
    fontSize: 12,
    color: colors.foreground.muted,
  },
  phoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: 16,
    marginBottom: spacing[4],
  },
  phoneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary.DEFAULT,
  },
  loginLink: {
    alignSelf: 'center',
    marginTop: spacing[4],
  },
  loginLinkText: {
    fontSize: 14,
    color: colors.primary.DEFAULT,
    fontWeight: '500',
  },
  backButton: {
    position: 'absolute',
    start: spacing[4],
    top: spacing[6],
    zIndex: 10,
  },
  backButtonText: {
    color: colors.primary.DEFAULT,
    fontSize: 14,
    fontWeight: '500',
  },
});

