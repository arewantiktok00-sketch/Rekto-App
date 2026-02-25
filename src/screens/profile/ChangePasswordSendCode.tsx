import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase, supabaseRead } from '@/integrations/supabase/client';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing } from '@/theme/spacing';
import { toast } from '@/utils/toast';
import { ArrowLeft, Mail } from 'lucide-react-native';
import { Text } from '@/components/common/Text';
import { ScreenHeader } from '@/components/common/ScreenHeader';

export function ChangePasswordSendCode() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const paramEmail = (route.params as any)?.email as string | undefined;
  const [email, setEmail] = useState(paramEmail || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (paramEmail) {
      setEmail(paramEmail);
      return;
    }
    const load = async () => {
      if (!user?.id) return;
      try {
        const { data } = await supabaseRead
          .from('profiles')
          .select('email')
          .eq('user_id', user.id)
          .maybeSingle();
        const userEmail = user.email || data?.email || '';
        if (userEmail && !userEmail.endsWith('@rekto.phone')) {
          setEmail(userEmail.trim().toLowerCase());
        }
      } catch {
        if (user?.email) setEmail(user.email.trim().toLowerCase());
      }
    };
    load();
  }, [paramEmail, user]);

  const handleSendCode = async () => {
    const emailToUse = email?.trim()?.toLowerCase();
    if (!emailToUse) {
      toast.warning('Error', 'No email found for your account');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('auth-change-password', {
        body: { action: 'send_code', email: emailToUse },
      });
      if (error) {
        toast.error('Error', error.message || 'Failed to send code');
        return;
      }
      if (data?.error || data?.success === false) {
        toast.error('Error', (data?.error as string) || (data?.message as string) || 'Failed to send code');
        return;
      }
      toast.success('Code Sent', 'Check your email for the code');
      navigation.navigate('ChangePasswordOTP' as never, { email: emailToUse } as never);
    } catch (err: any) {
      toast.error('Error', err.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background.DEFAULT }]}>
      <ScreenHeader
        title={t('changePassword') || 'Change Password'}
        onBack={() => navigation.goBack()}
      />
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Mail size={28} color="#7C3AED" />
        </View>
        <Text style={styles.title}>Send verification code</Text>
        <Text style={styles.subtitle}>We'll send a 6-digit code to your email</Text>
        <View style={styles.emailBox}>
          <Text style={styles.emailLabel}>{t('email') || 'Email'}</Text>
          <Text style={styles.emailValue} numberOfLines={1}>{email || '—'}</Text>
        </View>
        <TouchableOpacity
          style={[styles.buttonWrap, loading && styles.buttonDisabled]}
          onPress={handleSendCode}
          disabled={loading}
        >
          <LinearGradient
            colors={['#7C3AED', '#9333EA']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.button}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={styles.buttonText}>{t('sendCode') || 'Send Code'}</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
          <Text style={styles.backLinkText}>{t('back') || 'Back'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = () =>
  StyleSheet.create({
    container: { flex: 1 },
    content: { flex: 1, padding: spacing.screenPadding, paddingTop: spacing[8] },
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
    title: { fontSize: 22, fontWeight: '700', color: '#111', textAlign: 'center', marginBottom: 8 },
    subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: spacing[6] },
    emailBox: {
      backgroundColor: '#F3F4F6',
      borderRadius: 12,
      padding: spacing[4],
      marginBottom: spacing[6],
    },
    emailLabel: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
    emailValue: { fontSize: 16, fontWeight: '600', color: '#111' },
    buttonWrap: { width: '100%', marginBottom: spacing[4] },
    buttonDisabled: { opacity: 0.6 },
    button: { height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    buttonText: { color: '#FFF', fontSize: 17, fontWeight: '600' },
    backLink: { alignSelf: 'center' },
    backLinkText: { fontSize: 14, color: '#7C3AED', fontWeight: '500' },
  });
const styles = createStyles();
