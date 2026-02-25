import { Text } from '@/components/common/Text';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/integrations/supabase/client';
import { borderRadius, spacing } from '@/theme/spacing';
import { iconTransformRTL, inputStyleRTL } from '@/utils/rtl';
import { toast } from '@/utils/toast';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Globe2, MessageCircle, Phone, PlayCircle } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Sign up page tutorial: from app_settings key signup_tutorial (video_url, title_en, title_ckb, title_ar). */
interface SignupTutorialSettings {
  video_url?: string;
  title_en?: string;
  title_ckb?: string;
  title_ar?: string;
}

export function SignUp() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { t, language, isRTL } = useLanguage();
  const { colors } = useTheme();
  const styles = createStyles(colors, insets, isRTL);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [signupTutorial, setSignupTutorial] = useState<SignupTutorialSettings | null>(null);

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
          setSignupTutorial({
            video_url: value.video_url,
            title_en: value.title_en,
            title_ckb: value.title_ckb,
            title_ar: value.title_ar,
          });
        }
      } catch {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSignUp = async () => {
    if (!fullName.trim()) {
      toast.warning('Required', 'Please enter your full name');
      return;
    }

    if (!email || !password) {
      toast.warning('Required', 'Please enter email and password');
      return;
    }

    if (password.length < 8) {
      toast.warning('Weak password', 'Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      
      const { data, error } = await supabase.functions.invoke('auth-signup', {
        body: {
          email: normalizedEmail,
          password,
          fullName,
          full_name: fullName,
        },
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        const errorMsg = data.error;
        if (errorMsg.includes('already registered') || errorMsg.includes('Please log in') || errorMsg.includes('reset your password')) {
          toast.error('Account Exists', errorMsg);
        } else {
          toast.error('Error', errorMsg);
        }
        return;
      }

      // Navigate to verification code page with email
      if (data?.needsVerification) {
        navigation.navigate('Auth', { 
          screen: 'VerifyCode',
          params: { 
            email: normalizedEmail,
            method: 'email',
            purpose: 'signup'
          }
        });
      } else {
        // Account created but no verification needed (shouldn't happen)
        toast.success('Signup successful', 'Your account is ready');
      }
    } catch (error: any) {
      toast.error('Error', error.message || 'Signup failed');
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
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Top bar: back + logo + language */}
        <View style={[styles.topBar, isRTL && styles.rowReverse]}>
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

          <View style={[styles.languageBadge, isRTL && styles.rowReverse]}>
            <Globe2 size={16} color={colors.foreground.muted} />
            <Text style={[styles.languageText, isRTL && styles.textRTL]}>{language.toUpperCase()}</Text>
          </View>
        </View>

        <Text style={[styles.title, isRTL && styles.textRTL]}>{t('createAccount') || 'Create Account'}</Text>
        <Text style={[styles.subtitle, isRTL && styles.textRTL]}>
          {t('startRunningAds') || 'Start running TikTok ads in minutes'}
        </Text>

        {/* Full Name */}
        <View style={[styles.fieldLabelRow, isRTL && styles.rowReverse]}>
          <Text style={[styles.fieldLabel, isRTL && styles.textRTL]}>{t('fullName') || 'Full Name'}</Text>
          <View style={styles.requiredBadge}>
            <Text style={[styles.requiredBadgeText, isRTL && styles.textRTL]}>{t('required') || 'Required'}</Text>
          </View>
        </View>
        <TextInput
          style={[styles.input, inputStyleRTL()]}
          placeholder="John Doe"
          placeholderTextColor={colors.input.placeholder}
          value={fullName}
          onChangeText={setFullName}
          autoCapitalize="words"
        />

        {/* Email */}
        <Text style={[styles.fieldLabel, isRTL && styles.textRTL]}>{t('email') || 'Email'}</Text>
        <TextInput
          style={[styles.input, inputStyleRTL()]}
          placeholder="your@email.com"
          placeholderTextColor={colors.input.placeholder}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />

        {/* Password */}
        <Text style={[styles.fieldLabel, isRTL && styles.textRTL]}>{t('password') || 'Password'}</Text>
        <TextInput
          style={[styles.input, inputStyleRTL()]}
          placeholder={t('minCharacters') || 'Min. 8 characters'}
          placeholderTextColor={colors.input.placeholder}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="password-new"
        />
        <Text style={[styles.hint, isRTL && styles.textRTL]}>{t('minCharacters') || 'Min. 8 characters'}</Text>

        <TouchableOpacity
          style={[styles.buttonContainer, loading && styles.buttonDisabled]}
          onPress={handleSignUp}
          disabled={loading}
        >
          <LinearGradient
            colors={['#7C3AED', '#9333EA']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.button}
          >
            <Text style={[styles.buttonText, isRTL && styles.textRTL]}>
              {loading ? t('loading') : t('signUp') || 'Create Account'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Divider */}
        <View style={[styles.dividerRow, isRTL && styles.rowReverse]}>
          <View style={styles.dividerLine} />
          <Text style={[styles.dividerText, isRTL && styles.textRTL]}>{t('or') || 'or'}</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Continue with phone */}
        <TouchableOpacity
          style={[styles.secondaryButton, isRTL && styles.rowReverse]}
          onPress={() => navigation.navigate('Auth', { screen: 'PhoneSignUp' })}
          activeOpacity={0.85}
        >
          <Phone size={18} color={colors.primary.DEFAULT} />
          <Text style={[styles.secondaryButtonText, isRTL && styles.textRTL]}>
            {t('continueWithPhone') || 'continueWithPhone'}
          </Text>
        </TouchableOpacity>

        <View style={[styles.signInContainer, isRTL && styles.rowReverse]}>
          <Text style={[styles.signInText, isRTL && styles.textRTL]}>{t('alreadyHaveAccount')} </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Auth', { screen: 'Login' })}>
            <Text style={[styles.signInLink, isRTL && styles.textRTL]}>{t('login')}</Text>
          </TouchableOpacity>
        </View>

        {/* Help row - opens WhatsApp */}
        <TouchableOpacity
          style={[styles.helpContainer, isRTL && styles.rowReverse]}
          activeOpacity={0.8}
          onPress={() => Linking.openURL('https://wa.me/9647504881516')}
        >
          <MessageCircle size={16} color={colors.foreground.muted} />
          <Text style={[styles.helpText, isRTL && styles.textRTL]}>
            {t('needHelpChatWithUs') || 'Chat with us on WhatsApp'}
          </Text>
        </TouchableOpacity>

        {/* Sign up page tutorial — only if owner set video_url in Owner Dashboard → Tutorials → Sign Up Page Tutorial */}
        {signupTutorial?.video_url ? (
          <TouchableOpacity
            style={[styles.helpContainer, isRTL && styles.rowReverse]}
            activeOpacity={0.8}
            onPress={() => Linking.openURL(signupTutorial.video_url!)}
          >
            <PlayCircle size={16} color={colors.foreground.muted} style={iconTransformRTL()} />
            <Text style={[styles.helpText, isRTL && styles.textRTL]}>
              {language === 'ckb' && signupTutorial.title_ckb
                ? signupTutorial.title_ckb
                : language === 'ar' && signupTutorial.title_ar
                  ? signupTutorial.title_ar
                  : signupTutorial.title_en || 'Watch sign-up tutorial'}
            </Text>
          </TouchableOpacity>
        ) : null}

        {/* Terms & Privacy - tappable */}
        <View style={[styles.termsContainer, isRTL && styles.rowReverse]}>
          <Text style={[styles.termsText, isRTL && styles.textRTL]}>
            {t('termsAgreement') || 'By creating an account, you agree to our'}{' '}
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

const createStyles = (colors: any, insets: any, isRTL?: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.DEFAULT,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing[6],
    paddingTop: insets.top + spacing.md,
  },
  textRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  rowReverse: {
    flexDirection: 'row',
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
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  requiredBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    marginBottom: spacing[1.5],
  },
  requiredBadgeText: {
    fontSize: 10,
    color: '#B91C1C',
    fontWeight: '700',
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
    color: colors.foreground.muted,
    fontSize: 13,
    marginBottom: spacing[5],
    marginTop: 6,
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
  termsContainer: {
    marginTop: spacing[4],
    marginBottom: spacing[4],
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
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInText: {
    color: colors.foreground.muted,
    fontSize: 14,
  },
  signInLink: {
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
});

