import { Text } from '@/components/common/Text';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRemoteConfig } from '@/contexts/RemoteConfigContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/integrations/supabase/client';
import { borderRadius, spacing } from '@/theme/spacing';
import { isRTL, rtlIcon, rtlInput, rtlRow, rtlText } from '@/utils/rtl';
import { toast } from '@/utils/toast';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Eye, EyeOff, Globe2, MessageCircle, Phone, PlayCircle } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Image, KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function Login() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const { isPaymentsHidden } = useRemoteConfig();
  const rtl = isRTL(language);
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, insets, rtl);
  const logoSource = isDark ? require('../../../assets/images/iconDarkmode.png') : require('../../../assets/images/logo.png');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tutorialUrl, setTutorialUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('app-settings', {
          body: { action: 'get', key: 'signup_tutorial' },
        });
        if (cancelled || error) return;
        const value = data?.settings?.value ?? data?.value;
        if (value && typeof value === 'object' && value.video_url) {
          setTutorialUrl(value.video_url);
        }
      } catch {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      toast.warning(t('required'), t('pleaseEnterEmailPassword'));
      return;
    }

    setLoading(true);
    try {
      const { error, isBlocked, blockReason } = await signIn(email.trim().toLowerCase(), password);

      if (isBlocked) {
        navigation.reset({
          index: 0,
          routes: [{
            name: 'Auth' as never,
            params: {
              screen: 'Blocked' as never,
              params: { reason: blockReason || null },
            },
          }],
        });
        return;
      }

      if (error) {
        let errorMessage = t('wrongEmailOrPassword');
        if (error.message?.includes('Network') || error.message?.includes('fetch') || error.message?.includes('Failed to fetch') || error.message?.includes('network') || error.message?.includes('ECONNREFUSED') || error.message?.includes('timeout') || error.message?.includes('timed out')) {
          errorMessage = t('networkError');
        } else if (error.message?.includes('Invalid login') || error.message?.includes('Invalid credentials') || error.message?.includes('Invalid email or password')) {
          errorMessage = t('wrongEmailOrPassword');
        } else if (error.message?.includes('Email not confirmed') || error.message?.includes('email_not_confirmed')) {
          errorMessage = t('pleaseEnterEmailPassword');
        }
        toast.error(t('loginFailed'), errorMessage);
        return;
      }

      // signIn succeeded. AuthContext already set user/session; RootNavigator will re-render
      // with Main stack and redirect to OwnerDashboard if user has admin access.
    } catch (unexpectedError: any) {
      console.error('Unexpected login error:', unexpectedError);
      toast.error(t('error'), t('wrongEmailOrPassword'));
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
        style={styles.scrollContent}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Top bar: back + logo + language */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={[styles.iconButton, rtlRow()]}
            onPress={() => navigation.canGoBack() && navigation.goBack()}
            activeOpacity={0.8}
          >
            <ArrowLeft size={20} color={colors.foreground.muted} style={rtlIcon()} />
          </TouchableOpacity>

          <View style={styles.logoContainer}>
            <Image source={logoSource} style={styles.logoImage} resizeMode="contain" />
          </View>

          <TouchableOpacity
            style={[styles.languageBadge, rtlRow()]}
            activeOpacity={0.8}
            onPress={() => {
              const next = language === 'ckb' ? 'ar' : 'ckb';
              setLanguage(next);
            }}
          >
            <Globe2 size={16} color={colors.foreground.muted} />
            <Text style={[styles.languageText, rtlText()]}>{language === 'ckb' ? 'کوردی' : 'العربية'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.title, rtlText()]}>{t('welcomeBack')}</Text>
        <Text style={[styles.subtitle, rtlText()]}>{t('signInToContinue')}</Text>

        <TextInput
          style={[styles.input, rtlInput()]}
          placeholder={t('email')}
          placeholderTextColor={colors.input.placeholder}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />

        <View style={styles.passwordWrap}>
          <TextInput
            style={[styles.input, styles.passwordInput, rtlInput()]}
            placeholder={t('password')}
            placeholderTextColor={colors.input.placeholder}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoComplete="password"
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowPassword((v) => !v)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            {showPassword ? <EyeOff size={22} color={colors.foreground.muted} /> : <Eye size={22} color={colors.foreground.muted} />}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.forgotPasswordWrap}
          onPress={() => navigation.navigate('Auth', { screen: 'ForgotPassword' })}
        >
          <Text style={[styles.forgotPassword, rtlText()]}>{t('forgotPassword')}</Text>
        </TouchableOpacity>

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
            <Text style={[styles.buttonText, rtlText()]}>{loading ? t('loading') : t('login')}</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Divider */}
        <View style={[styles.dividerRow, rtlRow()]}>
          <View style={styles.dividerLine} />
          <Text style={[styles.dividerText, rtlText()]}>{t('or') || 'or'}</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Continue with phone */}
        <TouchableOpacity
          style={[styles.secondaryButton, rtlRow()]}
          onPress={() => navigation.navigate('Auth', { screen: 'PhoneLogin' })}
          activeOpacity={0.85}
        >
          <Phone size={18} color={colors.primary.DEFAULT} />
          <Text style={[styles.secondaryButtonText, rtlText()]}>
            {t('continueWithPhone') || 'continueWithPhone'}
          </Text>
        </TouchableOpacity>

        <View style={[styles.signUpContainer, rtlRow()]}>
          <Text style={[styles.signUpText, rtlText()]}>{t('dontHaveAccount')} </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Auth', { screen: 'SignUp' })}>
            <Text style={[styles.signUpLink, rtlText()]}>{t('signUp')}</Text>
          </TouchableOpacity>
        </View>

        {/* Help row - opens WhatsApp */}
        {!isPaymentsHidden && (
          <TouchableOpacity
            style={[styles.helpContainer, rtlRow()]}
            activeOpacity={0.8}
            onPress={() => Linking.openURL('https://wa.me/9647504881516')}
          >
            <MessageCircle size={16} color={colors.foreground.muted} />
            <Text style={[styles.helpText, rtlText()]}>
              {t('needHelpChatWithUs') || 'Chat with us on WhatsApp'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Tutorial - account creation / how to sign up (YouTube or URL from Owner Dashboard) */}
        <TouchableOpacity
          style={[styles.helpContainer, rtlRow()]}
          activeOpacity={0.8}
          onPress={() => Linking.openURL(tutorialUrl || 'https://www.youtube.com')}
        >
          <PlayCircle size={16} color={colors.foreground.muted} />
          <Text style={[styles.helpText, rtlText()]}>
            {t('tutorial') || 'Tutorial'}
          </Text>
        </TouchableOpacity>

        {/* Terms & Privacy */}
        <View style={[styles.termsContainer, rtlRow()]}>
          <Text style={[styles.termsText, rtlText()]}>
            {t('termsAgreement')}{' '}
            <Text style={[styles.termsLink, rtlText()]} onPress={() => (navigation.getParent() as any)?.navigate('Terms')}>
              {t('termsOfService') || 'Terms of Service'}
            </Text>
            {' '}{t('and') || 'and'}{' '}
            <Text style={[styles.termsLink, rtlText()]} onPress={() => (navigation.getParent() as any)?.navigate('Privacy')}>
              {t('privacyPolicy') || 'Privacy Policy'}
            </Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: any, insets: any, rtl?: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.DEFAULT,
  },
  scrollContent: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    paddingStart: spacing.screenPadding,
    paddingEnd: spacing.screenPadding,
    paddingVertical: spacing[6],
  },
  topBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[5],
  },
  textRTL: {
    textAlign: 'right' as const,
    writingDirection: 'rtl',
  },
  inputRTL: {
    textAlign: 'right' as const,
    writingDirection: 'rtl',
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
    justifyContent: 'center',
  },
  logoImage: {
    height: 32,
    width: 120,
    maxWidth: '80%',
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
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.foreground.DEFAULT,
    marginBottom: spacing[2.5],
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  subtitle: {
    fontSize: 16,
    color: colors.foreground.muted,
    marginBottom: spacing[8],
    textAlign: 'right',
    writingDirection: 'rtl',
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
  passwordWrap: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    width: '100%',
    marginBottom: spacing.inputGap,
    borderWidth: 1,
    borderColor: colors.input.border,
    borderRadius: 12,
    backgroundColor: colors.input.background,
    minHeight: 52,
  },
  passwordWrapRTL: {
    flexDirection: 'row',
  },
  passwordInput: {
    flex: 1,
    minHeight: 48,
    height: 52,
    borderWidth: 0,
    paddingHorizontal: 16,
    fontSize: 15,
    marginBottom: 0,
  },
  eyeButton: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  forgotPasswordWrap: {
    alignSelf: 'flex-end',
    marginBottom: spacing[5],
    marginTop: -spacing[2],
  },
  forgotPassword: {
    color: colors.primary.DEFAULT,
    fontSize: 14,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  buttonContainer: {
    width: '100%',
    marginBottom: spacing[5],
  },
  button: {
    borderRadius: borderRadius.button,
    height: 56,
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
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signUpText: {
    color: colors.foreground.muted,
    fontSize: 14,
  },
  signUpLink: {
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
    paddingHorizontal: spacing[2],
  },
  termsText: {
    fontSize: 12,
    color: colors.foreground.muted,
    textAlign: 'center',
  },
  termsLink: {
    color: colors.primary.DEFAULT,
    fontWeight: '600',
  },
});

