import { Text } from '@/components/common/Text';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/integrations/supabase/client';
import { spacing } from '@/theme/spacing';
import { iconTransformRTL, inputStyleRTL } from '@/utils/rtl';
import { toast } from '@/utils/toast';
import { useNavigation, useRoute } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { ArrowLeft, Lock } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function ForgotPasswordNewPassword() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { colors } = useTheme();
  const styles = createStyles(colors, insets);
  const email = (route.params as any)?.email as string;
  const code = (route.params as any)?.code as string;

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!newPassword || !confirmPassword) {
      toast.warning(t('required'), t('pleaseEnterAndConfirmPassword'));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.warning(t('passwordsDoNotMatch'), t('reEnterPassword'));
      return;
    }
    if (newPassword.length < 8) {
      toast.warning(t('weakPassword'), t('weakPassword'));
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('auth-reset-password', {
        body: {
          email: email?.trim()?.toLowerCase(),
          code,
          newPassword,
        },
      });

      if (error) {
        toast.error(t('error'), t('somethingWentWrong'));
        return;
      }
      if (data?.error) {
        toast.error(t('error'), t('couldNotResetPassword'));
        return;
      }

      Alert.alert(
        t('success'),
        t('passwordResetSuccess'),
        [{ text: t('ok'), onPress: () => navigation.navigate('Auth', { screen: 'Login' }) }]
      );
    } catch (err: any) {
      toast.error(t('error'), t('somethingWentWrong'));
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
          <ArrowLeft size={24} color={colors.foreground.muted} style={iconTransformRTL()} />
        </TouchableOpacity>

        <View style={styles.iconCircle}>
          <Lock size={28} color="#7C3AED" />
        </View>
        <Text style={styles.title}>Set New Password</Text>
        <Text style={styles.subtitle}>Enter your new password below</Text>

        <TextInput
          style={[styles.input, inputStyleRTL()]}
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder={t('newPassword') || 'New Password'}
          placeholderTextColor={colors.input.placeholder}
          secureTextEntry
          autoCapitalize="none"
        />
        <TextInput
          style={[styles.input, inputStyleRTL()]}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder={t('confirmNewPassword') || 'Confirm New Password'}
          placeholderTextColor={colors.input.placeholder}
          secureTextEntry
          autoCapitalize="none"
        />

        <TouchableOpacity
          style={[styles.buttonContainer, loading && styles.buttonDisabled]}
          onPress={handleReset}
          disabled={loading}
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

        <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
          <Text style={styles.backLinkText}>{t('back') || 'Back'}</Text>
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
    buttonContainer: { width: '100%', marginTop: spacing[4], marginBottom: spacing[4] },
    button: {
      height: 56,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: colors.primary.foreground, fontSize: 17, fontWeight: '600' },
    backLink: { alignSelf: 'center' },
    backLinkText: { fontSize: 14, color: colors.primary.DEFAULT, fontWeight: '500' },
  });
