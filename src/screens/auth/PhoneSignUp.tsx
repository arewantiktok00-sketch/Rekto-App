import { Text } from '@/components/common/Text';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRemoteConfig } from '@/contexts/RemoteConfigContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/integrations/supabase/client';
import { borderRadius, spacing } from '@/theme/spacing';
import { normalizePhoneToE164 } from '@/utils/phone';
import { iconTransformRTL, inputStyleRTL } from '@/utils/rtl';
import { toast } from '@/utils/toast';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, Globe2, Mail, MessageCircle, Phone as PhoneIcon } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Linking, Platform, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

export function PhoneSignUp() {
  const navigation = useNavigation();
  const route = useRoute();
  const { t, language } = useLanguage();
  const { isPaymentsHidden } = useRemoteConfig();
  const { checkBlockedStatus } = useAuth();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [step, setStep] = useState<'phone' | 'otp' | 'details'>('phone');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const codeInputs = React.useRef<TextInput[]>([]);

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

  const clearOtp = () => {
    setOtp(['', '', '', '', '', '']);
    codeInputs.current[0]?.focus();
  };

  const handleSendOTP = async () => {
    if (!phone || phone.length < 10) {
      toast.warning(t('required'), t('invalidPhoneNumber'));
      return;
    }

    setLoading(true);
    try {
      const fullPhone = normalizePhoneToE164(phone);
      
      const { data, error } = await supabase.functions.invoke('auth-phone-send-otp', {
        body: { phoneNumber: fullPhone, purpose: 'signup' },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.hasValidToken) {
        toast.info(t('pleaseWait'), t('pleaseWaitMinutes'));
        setStep('otp');
        return;
      }

      toast.success(t('codeSent'), t('codeSentViaWhatsApp'));

      setStep('otp');
    } catch (error: any) {
      toast.error(t('error'), t('couldNotSendCode'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      toast.warning(t('error'), t('invalidCode'));
      return;
    }

    setLoading(true);
    try {
      const fullPhone = normalizePhoneToE164(phone);
      
      const { data, error } = await supabase.functions.invoke('auth-phone-verify-otp', {
        body: { phoneNumber: fullPhone, code: otpCode },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setStep('details');
    } catch (error: any) {
      const attemptsRemaining =
        error?.context?.attemptsRemaining ??
        error?.attemptsRemaining ??
        null;
      toast.error(
        t('verificationFailed'),
        attemptsRemaining !== null
          ? `${error.message || t('invalidCodeTryAgain')} (${t('attemptsLeft')}: ${attemptsRemaining})`
          : error.message || t('invalidCodeTryAgain')
      );
      clearOtp();
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteSignUp = async () => {
    if (!fullName || !password || password.length < 8) {
      toast.warning(t('required'), t('pleaseEnterEmailPassword'));
      return;
    }

    setLoading(true);
    try {
      const fullPhone = normalizePhoneToE164(phone);
      const trimmedFullName = fullName.trim();

      const { data, error } = await supabase.functions.invoke('auth-phone-signup', {
        body: {
          phoneNumber: fullPhone,
          phone: fullPhone,
          fullName: trimmedFullName,
          full_name: trimmedFullName,
          password: password,
        },
      });

      if (error) throw error;

      if (data?.error) {
        const errorMsg = data.error;
        if (errorMsg.includes('already registered') || errorMsg.includes('Please log in')) {
          toast.error(t('error'), t('accountAlreadyExists'));
        } else {
          toast.error(t('error'), t('somethingWentWrong'));
        }
        return;
      }

      // Check if account is blocked (shouldn't happen on signup, but check anyway)
      if (data?.isBlocked || (typeof data?.error === 'string' && (data.error.includes('suspended') || data.error.includes('blocked')))) {
        Alert.alert(
          'Account Suspended',
          data.reason || 'Your account has been suspended. Please contact support.'
        );
        navigation.reset({
          index: 0,
          routes: [{ 
            name: 'Auth' as never, 
            params: { 
              screen: 'Blocked' as never,
              params: { reason: data.reason || null }
            } 
          }],
        });
        return;
      }

      // After successful signup, check blocked status
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const blockedStatus = await checkBlockedStatus();
        if (blockedStatus.isBlocked) {
          Alert.alert(
            'Account Suspended',
            blockedStatus.reason || 'Your account has been suspended. Please contact support.'
          );
          navigation.reset({
            index: 0,
            routes: [{ 
              name: 'Auth' as never, 
              params: { 
                screen: 'Blocked' as never,
                params: { reason: blockedStatus.reason || null }
              } 
            }],
          });
          return;
        }
      }

      if (data?.session) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }

      toast.success(t('signupSuccessful'), t('yourAccountIsReady'));
    } catch (error: any) {
      toast.error(t('error'), t('somethingWentWrong'));
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (value: string, index: number) => {
    if (value.length > 1) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      codeInputs.current[index + 1]?.focus();
    }

    if (newOtp.every(digit => digit !== '') && newOtp.join('').length === 6) {
      handleVerifyOTP();
    }
  };

  if (step === 'phone') {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.content}>
          {/* Top bar */}
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => navigation.canGoBack() && navigation.goBack()}
              activeOpacity={0.8}
            >
              <ArrowLeft size={20} color={colors.foreground.muted} style={iconTransformRTL()} />
            </TouchableOpacity>

            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>rekto</Text>
            </View>

            <View style={styles.languageBadge}>
              <Globe2 size={16} color={colors.foreground.muted} />
              <Text style={styles.languageText}>{language.toUpperCase()}</Text>
            </View>
          </View>

          {/* Heading */}
          <View style={styles.headingRow}>
            <View style={styles.headingIcon}>
              <PhoneIcon size={18} color="#fff" />
            </View>
            <View>
              <Text style={styles.title}>{t('phoneSignUp') || 'phoneSignUp'}</Text>
              <Text style={styles.subtitle}>{t('enterPhoneToStart') || 'enterPhoneToStart'}</Text>
            </View>
          </View>

          {/* Phone field */}
          <Text style={styles.fieldLabel}>{t('phoneNumber') || 'Phone Number'}</Text>
          <View style={styles.phoneRow}>
            <TouchableOpacity style={styles.countrySelector} activeOpacity={0.9}>
              <Text style={styles.countryCodeText}>IQ +964</Text>
            </TouchableOpacity>
            <TextInput
              style={[styles.phoneInput, inputStyleRTL()]}
              value={phone}
              onChangeText={(text) => setPhone(formatPhoneNumber(text))}
              placeholder="7XX XXX XXXX"
              keyboardType="phone-pad"
              maxLength={11}
            />
          </View>
          <Text style={styles.phoneHint}>
            {t('phoneFormatHint') || 'phoneFormatHint'}
          </Text>

          {/* Send verification code */}
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
                {loading ? t('loading') : t('sendVerificationCode') || 'sendVerificationCode'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t('or') || 'or'}</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Continue with Email */}
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('Auth', { screen: 'SignUp' })}
            activeOpacity={0.85}
          >
            <Mail size={18} color={colors.primary.DEFAULT} />
            <Text style={styles.secondaryButtonText}>
              {t('continueWithEmail') || 'continueWithEmail'}
            </Text>
          </TouchableOpacity>

          {/* Bottom links */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('alreadyHaveAccount') || 'Already have an account?'} </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Auth', { screen: 'Login' })}>
              <Text style={styles.footerLink}>{t('login') || 'Login'}</Text>
            </TouchableOpacity>
          </View>

          {!isPaymentsHidden && (
            <TouchableOpacity
              style={styles.helpContainer}
              activeOpacity={0.8}
              onPress={() => Linking.openURL('https://wa.me/9647504881516')}
            >
              <MessageCircle size={16} color={colors.foreground.muted} />
              <Text style={styles.helpText}>
                {t('needHelpChatWithUs') || 'Chat with us on WhatsApp'}
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>
              {t('termsAgreement') || 'By creating an account, you agree to our'}{' '}
              <Text style={styles.termsLink} onPress={() => (navigation.getParent() as any)?.navigate('Terms')}>
                {t('termsOfService') || 'Terms of Service'}
              </Text>
              {' '}{t('and') || 'and'}{' '}
              <Text style={styles.termsLink} onPress={() => (navigation.getParent() as any)?.navigate('Privacy')}>
                {t('privacyPolicy') || 'Privacy Policy'}
              </Text>
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  }

  if (step === 'otp') {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Verify Your Phone</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit code sent to {phone}
          </Text>

          <View style={styles.codeContainer}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => {
                  if (ref) codeInputs.current[index] = ref;
                }}
                style={[styles.codeInput, inputStyleRTL()]}
                value={digit}
                onChangeText={(value) => handleCodeChange(value, index)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
              />
            ))}
          </View>

          <TouchableOpacity
            style={[styles.buttonContainer, loading && styles.buttonDisabled]}
            onPress={handleVerifyOTP}
            disabled={loading || otp.some(d => !d)}
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
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Complete Your Profile</Text>
        <Text style={styles.subtitle}>Enter your details to finish signing up</Text>

        <TextInput
          style={[styles.input, inputStyleRTL()]}
          value={fullName}
          onChangeText={setFullName}
          placeholder="e.g. Ahmed Ali"
          placeholderTextColor={colors.input?.placeholder ?? colors.foreground?.muted ?? '#94A3B8'}
          autoCapitalize="words"
        />

        <TextInput
          style={[styles.input, inputStyleRTL()]}
          value={password}
          onChangeText={setPassword}
          placeholder={t('password')}
          secureTextEntry
          autoCapitalize="none"
        />
        <Text style={styles.hint}>{t('minCharacters')}</Text>

        <TouchableOpacity
          style={[styles.buttonContainer, loading && styles.buttonDisabled]}
          onPress={handleCompleteSignUp}
          disabled={loading}
        >
          <LinearGradient
            colors={['#7C3AED', '#9333EA']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.button}
          >
            <Text style={styles.buttonText}>
              {loading ? t('loading') : t('signUp')}
            </Text>
          </LinearGradient>
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
    justifyContent: 'flex-start',
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing[6],
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[5],
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    flex: 1,
    alignItems: 'center',
  },
  logoText: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
    color: colors.foreground.DEFAULT,
  },
  languageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    gap: spacing[1.5],
  },
  languageText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    color: colors.foreground.muted,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginBottom: spacing[5],
  },
  headingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#A855F7',
    alignItems: 'center',
    justifyContent: 'center',
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
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.foreground.DEFAULT,
    marginBottom: spacing[1.5],
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[1.5],
  },
  countrySelector: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.input,
    borderWidth: 1,
    borderColor: colors.input.border,
    backgroundColor: colors.input.background,
    marginEnd: spacing[2],
  },
  countryCodeText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.foreground.DEFAULT,
  },
  phoneInput: {
    flex: 1,
    height: 52,
    borderRadius: borderRadius.input,
    borderWidth: 1,
    borderColor: colors.input.border,
    paddingHorizontal: spacing[4],
    fontSize: 16,
    color: colors.foreground.DEFAULT,
    backgroundColor: colors.input.background,
  },
  phoneHint: {
    fontSize: 12,
    color: colors.foreground.muted,
    marginBottom: spacing[4],
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[8],
    gap: spacing[2],
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
  hint: {
    fontSize: 13,
    color: colors.foreground.muted,
    marginBottom: spacing.md,
    marginTop: 6,
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: colors.foreground.muted,
    fontSize: 14,
  },
  footerLink: {
    color: colors.primary.DEFAULT,
    fontSize: 14,
    fontWeight: '600',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[4],
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
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: borderRadius.button,
    paddingVertical: spacing[3],
    marginBottom: spacing[6],
    gap: spacing[2],
    backgroundColor: colors.background.DEFAULT,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.foreground.DEFAULT,
  },
  helpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[4],
    gap: spacing[2],
  },
  helpText: {
    fontSize: 13,
    color: colors.foreground.muted,
  },
  termsContainer: {
    marginTop: spacing[4],
  },
  termsText: {
    color: colors.foreground.muted,
    fontSize: 12,
    textAlign: 'center',
  },
  termsLink: {
    color: colors.primary.DEFAULT,
    fontWeight: '600',
  },
});

