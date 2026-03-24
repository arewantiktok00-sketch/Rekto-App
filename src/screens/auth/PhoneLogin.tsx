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
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Globe2, MessageCircle, Phone as PhoneIcon } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function PhoneLogin() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { t, language, isRTL } = useLanguage();
  const { isPaymentsHidden } = useRemoteConfig();
  const { checkBlockedStatus } = useAuth();
  const { colors } = useTheme();
  const styles = createStyles(colors, insets, isRTL);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const formatPhoneNumber = (text: string) => {
    // Remove all non-digits
    const digits = text.replace(/\D/g, '');
    
    // Format as Iraqi phone number
    if (digits.startsWith('0')) {
      return digits;
    }
    if (digits.length > 0 && !digits.startsWith('0')) {
      return '0' + digits;
    }
    return digits;
  };

  const handleLogin = async () => {
    if (!phone || !password) {
      toast.warning(t('required'), t('pleaseEnterPhoneAndPassword'));
      return;
    }

    const normalizedPhone = normalizePhoneToE164(phone);
    if (!normalizedPhone) {
      toast.warning(t('required'), t('invalidPhoneNumber'));
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('auth-phone-login', {
        body: { phoneNumber: normalizedPhone, password },
      });

      if (error) throw error;
      if (!data?.success) {
        if (data?.isBlocked) {
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

        if (data?.needsVerification) {
          toast.info(t('verificationRequired'), t('pleaseVerifyPhoneNumber'));
          navigation.navigate('Auth', {
            screen: 'VerifyCode',
            params: { phoneNumber: normalizedPhone, method: 'phone', purpose: 'login' },
          });
          return;
        }

        toast.error(t('loginFailed'), data?.error || t('wrongPhoneOrPassword'));
        return;
      }

      if (data?.session) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }

      const blockedStatus = await checkBlockedStatus();
      if (blockedStatus.isBlocked) {
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
    } catch (err: any) {
      toast.error(t('error'), t('wrongPhoneOrPassword'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
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
            <Text style={[styles.logoText, isRTL && styles.textRTL]}>rekto</Text>
          </View>

          <View style={styles.languageBadge}>
            <Globe2 size={16} color={colors.foreground.muted} />
            <Text style={[styles.languageText, isRTL && styles.textRTL]}>{language.toUpperCase()}</Text>
          </View>
        </View>

        {/* Heading */}
        <View style={styles.headingRow}>
          <View style={styles.headingIcon}>
            <PhoneIcon size={18} color="#fff" />
          </View>
          <View>
            <Text style={[styles.title, isRTL && styles.textRTL]}>{t('welcomeBack') || 'Welcome back'}</Text>
            <Text style={[styles.subtitle, isRTL && styles.textRTL]}>{t('signInWithPhone') || 'signInWithPhone'}</Text>
          </View>
        </View>

        {/* Phone field */}
        <Text style={[styles.fieldLabel, isRTL && styles.textRTL]}>{t('phoneNumber') || 'Phone Number'}</Text>
        <View style={styles.phoneRow}>
          <TouchableOpacity style={styles.countrySelector} activeOpacity={0.9}>
            <Text style={[styles.countryCodeText, isRTL && styles.textRTL]}>IQ +964</Text>
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
        <Text style={[styles.phoneHint, isRTL && styles.textRTL]}>
          {t('phoneFormatHint') || 'phoneFormatHint'}
        </Text>

        {/* Password */}
        <Text style={[styles.fieldLabel, isRTL && styles.textRTL]}>{t('password') || 'Password'}</Text>
        <TextInput
          style={[styles.passwordInput, inputStyleRTL()]}
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          placeholderTextColor={colors.input.placeholder}
          secureTextEntry
        />

        <TouchableOpacity
          onPress={() => navigation.navigate('Auth', { screen: 'ForgotPasswordPhone' })}
        >
          <Text style={[styles.forgotPassword, isRTL && styles.textRTL]}>{t('forgotPassword') || 'Forgot password?'}</Text>
        </TouchableOpacity>

        {/* Primary Login */}
        <TouchableOpacity
          style={[styles.buttonContainer, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          <LinearGradient
            colors={['#7C3AED', '#9333EA']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.button}
          >
            <Text style={[styles.buttonText, isRTL && styles.textRTL]}>
              {loading ? t('loading') : t('login') || 'Login'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={[styles.dividerText, isRTL && styles.textRTL]}>{t('or') || 'or'}</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Continue with Email */}
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('Auth', { screen: 'Login' })}
          activeOpacity={0.85}
        >
          <Text style={[styles.secondaryButtonText, isRTL && styles.textRTL]}>
            {t('continueWithEmail') || 'continueWithEmail'}
          </Text>
        </TouchableOpacity>

        {/* Bottom links */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, isRTL && styles.textRTL]}>{t('dontHaveAccount') || "Don't have an account?"} </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Auth', { screen: 'SignUp' })}>
            <Text style={[styles.footerLink, isRTL && styles.textRTL]}>{t('signUp') || 'Sign Up'}</Text>
          </TouchableOpacity>
        </View>

        {!isPaymentsHidden && (
          <TouchableOpacity
            style={styles.helpContainer}
            activeOpacity={0.8}
            onPress={() => Linking.openURL('https://wa.me/9647504881516')}
          >
            <MessageCircle size={16} color={colors.foreground.muted} />
            <Text style={[styles.helpText, isRTL && styles.textRTL]}>
              {t('needHelpChatWithUs') || 'Chat with us on WhatsApp'}
            </Text>
          </TouchableOpacity>
        )}

        <View style={styles.termsContainer}>
          <Text style={[styles.termsText, isRTL && styles.textRTL]}>
            {t('termsAgreement') || 'By signing in, you agree to our'}{' '}
            <Text style={[styles.termsLink, isRTL && styles.textRTL]} onPress={() => (navigation.getParent() as any)?.navigate('Terms')}>
              {t('termsOfService') || 'Terms of Service'}
            </Text>
            {' '}{t('and') || 'and'}{' '}
            <Text style={[styles.termsLink, isRTL && styles.textRTL]} onPress={() => (navigation.getParent() as any)?.navigate('Privacy')}>
              {t('privacyPolicy') || 'Privacy Policy'}
            </Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: any, insets: { top: number; bottom: number }, isRTL?: boolean) => StyleSheet.create({
  textRTL: { textAlign: 'right', writingDirection: 'rtl' },
  container: {
    flex: 1,
    backgroundColor: colors.background.DEFAULT,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingStart: spacing.screenPadding,
    paddingEnd: spacing.screenPadding,
    paddingTop: insets.top + spacing[6],
    paddingBottom: insets.bottom + spacing[6],
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
    paddingStart: spacing[3],
    paddingEnd: spacing[3],
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
    paddingStart: spacing[3],
    paddingEnd: spacing[3],
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
    paddingStart: spacing[4],
    paddingEnd: spacing[4],
    fontSize: 16,
    color: colors.foreground.DEFAULT,
    backgroundColor: colors.input.background,
  },
  phoneHint: {
    fontSize: 12,
    color: colors.foreground.muted,
    marginBottom: spacing[4],
  },
  passwordInput: {
    width: '100%',
    minHeight: 48,
    height: 52,
    borderWidth: 1,
    borderColor: colors.input.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: colors.foreground.DEFAULT,
    backgroundColor: colors.input.background,
    marginBottom: spacing[2],
  },
  buttonContainer: {
    width: '100%',
    marginBottom: spacing[5],
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
  forgotPassword: {
    color: colors.primary.DEFAULT,
    fontSize: 14,
    textAlign: 'right',
    marginBottom: spacing[5],
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

