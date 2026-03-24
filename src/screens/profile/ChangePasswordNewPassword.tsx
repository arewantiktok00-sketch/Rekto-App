import { ScreenHeader } from '@/components/common/ScreenHeader';
import { Text } from '@/components/common/Text';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/integrations/supabase/client';
import { spacing } from '@/theme/spacing';
import { inputStyleRTL } from '@/utils/rtl';
import { toast } from '@/utils/toast';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

export function ChangePasswordNewPassword() {
  const navigation = useNavigation();
  const route = useRoute();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const email = (route.params as any)?.email as string;
  const code = (route.params as any)?.code as string;
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!newPassword || !confirmPassword) {
      toast.warning(t('required'), t('enterConfirmPassword'));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.warning(t('passwordsDoNotMatch'), t('enterConfirmPassword'));
      return;
    }
    if (newPassword.length < 8) {
      toast.warning(t('weakPassword'), t('minCharacters'));
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('auth-change-password', {
        body: { action: 'change_password', email: email?.trim()?.toLowerCase(), code, newPassword },
      });
      if (error) {
        toast.error(t('error'), t('changePassword'));
        return;
      }
      if (data?.error || data?.success === false) {
        toast.error(t('error'), t('changePassword'));
        return;
      }
      toast.success(t('success'), t('passwordChanged'));
      navigation.navigate('PrivacySecurity' as never);
    } catch (err: any) {
      toast.error(t('error'), t('changePassword'));
    } finally {
      setLoading(false);
    }
  };

  const styles = createStyles(colors);

  return (
    <View style={[styles.container, { backgroundColor: colors.background.DEFAULT }]}>
      <ScreenHeader
        title={t('setNewPassword') || 'Set New Password'}
        onBack={() => navigation.goBack()}
      />
      <View style={styles.content}>
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
          style={[styles.buttonWrap, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <LinearGradient
            colors={['#7C3AED', '#9333EA']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.button}
          >
            <Text style={styles.buttonText}>{t('changePassword') || 'Change Password'}</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
          <Text style={styles.backLinkText}>{t('back') || 'Back'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1 },
    content: { flex: 1, padding: spacing.screenPadding, paddingTop: spacing[4] },
    subtitle: {
      fontSize: 16,
      color: colors.foreground.muted,
      marginBottom: spacing[6],
    },
    input: {
      height: 56,
      borderWidth: 1,
      borderColor: colors.input.border,
      borderRadius: 16,
      paddingHorizontal: spacing[4],
      fontSize: 16,
      marginBottom: spacing[4],
      backgroundColor: colors.input.background,
      color: colors.foreground.DEFAULT,
    },
    buttonWrap: { width: '100%', marginTop: spacing[4], marginBottom: spacing[4] },
    buttonDisabled: { opacity: 0.6 },
    button: { height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    buttonText: { color: '#FFF', fontSize: 17, fontWeight: '600' },
    backLink: { alignSelf: 'center' },
    backLinkText: { fontSize: 14, color: '#7C3AED', fontWeight: '500' },
  });
