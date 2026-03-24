import { ScreenHeader } from '@/components/common/ScreenHeader';
import { Text } from '@/components/common/Text';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase, supabaseRead } from '@/integrations/supabase/client';
import { borderRadius, spacing } from '@/theme/spacing';
import { getFontFamily, getTypographyStyles } from '@/theme/typography';
import { getAvatarGradient } from '@/utils/avatar';
import { isRTL, rtlInput, rtlRow, rtlText } from '@/utils/rtl';
import { toast } from '@/utils/toast';
import { useNavigation } from '@react-navigation/native';
import { Check, Mail, Phone, User } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function PersonalInfo() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const rtl = isRTL(language);
  const { colors } = useTheme();
  const typography = getTypographyStyles(language as 'ckb' | 'ar');
  const fontFamily = getFontFamily(language as 'ckb' | 'ar');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [originalData, setOriginalData] = useState({ fullName: '', email: '', phone: '' });
  const styles = createStyles(colors, insets, typography, fontFamily, rtl);
  const avatarGradient = useMemo(
    () => getAvatarGradient(user?.id, fullName || user?.user_metadata?.full_name),
    [user?.id, fullName, user?.user_metadata?.full_name]
  );

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fallbackName = user.user_metadata?.full_name || '';
    const fallbackEmail = user.email || '';
    setFullName(fallbackName);
    setEmail(isPhoneBasedEmail(fallbackEmail) ? '' : fallbackEmail);
    setProfileEmail(fallbackEmail);
    setPhone('');
    setOriginalData({
      fullName: fallbackName,
      email: isPhoneBasedEmail(fallbackEmail) ? '' : fallbackEmail,
      phone: '',
    });
    setLoading(false);
    fetchProfile();
  }, [user]);

  const isPhoneBasedEmail = (emailStr: string): boolean => {
    return emailStr?.endsWith('@rekto.phone') || emailStr?.startsWith('phone_');
  };

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data } = await supabaseRead
        .from('profiles')
        .select('full_name, email, phone_number')
        .eq('user_id', user.id)
        .maybeSingle();

      const name = data?.full_name || user.user_metadata?.full_name || '';
      const emailVal = data?.email || user.email || '';
      const phoneVal = data?.phone_number || '';

      setFullName(name);
      setEmail(isPhoneBasedEmail(emailVal) ? '' : emailVal);
      setProfileEmail(emailVal);
      setPhone(phoneVal);
      setOriginalData({
        fullName: name,
        email: isPhoneBasedEmail(emailVal) ? '' : emailVal,
        phone: phoneVal,
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const normalizeEmail = (emailStr: string) => emailStr.trim().toLowerCase();

  // Only fullName can be changed - email and phone are read-only
  const hasChanges = fullName !== originalData.fullName;

  const handleSave = async () => {
    if (!hasChanges || !user) return;

    setSaving(true);
    try {
      // Only update full_name - email and phone are read-only (authentication identifiers)
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setOriginalData({ fullName, email, phone });
      toast.success(t('saved') || t('success'), t('profileUpdated'));
    } catch (error: any) {
      toast.error(t('error'), t('failedToSaveProfile'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
    <View style={styles.container}>
      <ScreenHeader
        title={t('personalInformation') || 'Personal Information'}
        onBack={() => navigation.goBack()}
        style={{ paddingTop: insets.top + 8 }}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ paddingHorizontal: 16, width: '100%' }}>
        {/* Avatar circle - same gradient as Profile */}
        <View style={styles.avatarContainer}>
          <LinearGradient
            colors={avatarGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatarCircle}
          >
            <Text style={styles.avatarInitial}>
              {fullName?.trim()[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'A'}
            </Text>
          </LinearGradient>
        </View>

        <View style={styles.formCard}>
          <View style={styles.section}>
            <Text style={[styles.fieldLabel, styles.labelRtl]}>{t('fullName') || 'Full Name'}</Text>
            <View style={styles.inputWrapper}>
              <User size={18} color={colors.foreground.muted} />
            <TextInput
              style={[styles.input, styles.inputRtl]}
              value={fullName}
              onChangeText={setFullName}
              placeholder={t('fullName') || 'Full Name'}
              placeholderTextColor={colors.foreground.muted}
            />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.fieldLabel, styles.labelRtl]}>{t('emailAddress') || 'Email Address'}</Text>
            <View style={styles.readOnlyWrapper}>
              <Mail size={18} color={colors.foreground.muted} />
              <Text style={[styles.readOnlyValue, styles.labelRtl]}>
                {email?.includes('@rekto.phone') || !email ? (t('phoneAccount') || 'Phone Account') : email || '-'}
              </Text>
            </View>
            <Text style={[styles.hint, styles.hintRtl]}>{t('emailCannotBeChanged') || 'Email address cannot be changed'}</Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.fieldLabel, styles.labelRtl]}>{t('phoneNumber') || 'Phone Number'}</Text>
            <View style={styles.readOnlyWrapper}>
              <Phone size={18} color={colors.foreground.muted} />
              <Text style={[styles.readOnlyValue, styles.labelRtl]}>{phone || '-'}</Text>
            </View>
            <Text style={[styles.hint, styles.hintRtl]}>{t('phoneCannotBeChanged') || 'Phone number cannot be changed'}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveButtonContainer, (!hasChanges || saving) && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!hasChanges || saving}
        >
          <LinearGradient
            colors={['#7C3AED', '#9333EA']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.saveButton}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={styles.saveButtonContent}>
                <View style={styles.saveButtonIconWrapper}>
                  <Check size={16} color={colors.primary.foreground} />
                </View>
                <Text style={[styles.saveButtonText, styles.labelRtl]}>{t('saveChanges') || 'Save Changes'}</Text>
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: any, insets: any, typography: any, fontFamily: string, rtl?: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.DEFAULT,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingStart: spacing.lg,
    paddingEnd: spacing.lg,
    paddingTop: spacing.sm,
    width: '100%',
    maxWidth: '100%',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    ...typography.h1,
    fontSize: 32,
    color: '#FFFFFF',
  },
  labelRtl: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  hintRtl: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  inputRtl: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  formCard: {
    width: '100%',
    backgroundColor: colors.card.background,
    borderRadius: borderRadius.card,
    padding: spacing.md + 4,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  section: {
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    ...typography.label,
    fontSize: 15,
    fontWeight: '600',
    color: colors.foreground.DEFAULT,
    marginBottom: 8,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  inputWrapper: {
    width: '100%',
    flexDirection: (rtl ? 'row-reverse' : 'row') as 'row' | 'row-reverse',
    alignItems: 'center',
    minHeight: 48,
    backgroundColor: colors.input.background || '#F3F4F6',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.input.border || 'transparent',
    paddingHorizontal: 16,
    gap: spacing.sm,
  },
  inputWrapperDisabled: {
    backgroundColor: colors.background.secondary,
  },
  readOnlyWrapper: {
    width: '100%',
    flexDirection: (rtl ? 'row-reverse' : 'row') as 'row' | 'row-reverse',
    alignItems: 'center',
    minHeight: 48,
    backgroundColor: colors.background.secondary || '#F3F4F6',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT || 'transparent',
    paddingHorizontal: 16,
    gap: spacing.sm,
  },
  readOnlyValue: {
    ...typography.body,
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    color: colors.foreground.muted,
    paddingVertical: 0,
  },
  input: {
    ...typography.body,
    flex: 1,
    fontSize: 16,
    color: colors.foreground.DEFAULT,
    paddingVertical: 0,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  inputDisabled: {
    color: colors.foreground.muted,
  },
  hint: {
    ...typography.caption,
    fontSize: 13,
    color: colors.foreground.muted,
    marginTop: 6,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  saveButtonContainer: {
    width: '100%',
    marginTop: spacing.md,
  },
  saveButton: {
    height: 56,
    borderRadius: borderRadius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonContent: {
    flexDirection: (rtl ? 'row-reverse' : 'row') as 'row' | 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  saveButtonIconWrapper: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    ...typography.body,
    color: colors.primary.foreground,
    fontSize: 17,
    fontWeight: '600',
  },
});

