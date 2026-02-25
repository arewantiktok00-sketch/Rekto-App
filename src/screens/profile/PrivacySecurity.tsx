import React, { useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase, supabaseRead } from '@/integrations/supabase/client';
import { Shield, LogOut, Trash2, Lock, X, AlertTriangle, Eye, EyeOff } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, borderRadius } from '@/theme/spacing';
import { getTypographyStyles, getFontFamily } from '@/theme/typography';
import { toast } from '@/utils/toast';
import { Text } from '@/components/common/Text';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import { isRTL, rtlText, rtlRow } from '@/utils/rtl';

export function PrivacySecurity() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { signOut, user } = useAuth();
  const { t, language } = useLanguage();
  const rtl = isRTL(language);
  const { colors } = useTheme();
  const typography = getTypographyStyles(language as 'ckb' | 'ar');
  const fontFamily = getFontFamily(language as 'ckb' | 'ar');
  const styles = createStyles(colors, insets, typography, fontFamily, rtl);
  const queryClient = useQueryClient();
  const [resolvedEmail, setResolvedEmail] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const isPhoneBasedEmail = (emailStr: string): boolean => {
    return emailStr?.endsWith('@rekto.phone') || emailStr?.startsWith('phone_');
  };

  const normalizeEmail = (emailStr: string) => emailStr.trim().toLowerCase();

  const loadProfileEmail = async (): Promise<string> => {
    if (!user) return;
    try {
      const { data } = await supabaseRead
        .from('profiles')
        .select('email')
        .eq('user_id', user.id)
        .maybeSingle();

      const userEmail = user.email || '';
      const rawEmail = isPhoneBasedEmail(userEmail) ? (data?.email || userEmail) : (data?.email || userEmail);
      const normalized = normalizeEmail(rawEmail || userEmail);
      setResolvedEmail(normalized);
      return normalized;
    } catch (error) {
      const fallbackEmail = user?.email || '';
      const normalized = normalizeEmail(fallbackEmail);
      setResolvedEmail(normalized);
      return normalized;
    }
  };

  const handleChangePassword = async () => {
    const emailToUse = resolvedEmail || (await loadProfileEmail()) || user?.email || '';
    if (!emailToUse) {
      Alert.alert(t('error') || 'Error', t('noEmailFound') || 'No email found for your account');
      return;
    }
    navigation.navigate('ChangePasswordSendCode' as never, { email: emailToUse } as never);
  };

  const handleLogoutAll = () => {
    Alert.alert(
      t('logoutAllDevices'),
      t('logoutAllDevicesDesc'),
      [
        { text: t('back'), style: 'cancel' },
        {
          text: t('logout'),
          style: 'destructive',
          onPress: async () => {
            await signOut();
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account?',
      'Are you sure about this decision? This will permanently delete:\n\n• All your campaigns and advertisements\n• Your transaction and payment history\n• Any remaining wallet balance\n• Your profile and all personal data',
      [
        { text: 'No, Keep My Account', style: 'cancel' },
        {
          text: 'Yes, I Want to Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Final Warning',
              "This decision cannot be reversed.\n\nOnce you delete your account, neither you, our support team, nor the company can recover your data. This is permanent due to our privacy policy.\n\nAll your data will be erased forever.",
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete My Account Permanently',
                  style: 'destructive',
                  onPress: handleDeleteAccountApi,
                },
              ]
            );
          },
        },
      ]
    );
  };

  const handleDeleteAccountApi = async () => {
    setDeleteLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        Alert.alert('Error', 'Session expired. Please sign in again.');
        return;
      }

      const response = await fetch(
        `${supabase.supabaseUrl}/functions/v1/delete-account`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        await supabase.auth.signOut();
        await AsyncStorage.clear();
        queryClient.clear();
        navigation.reset({
          index: 0,
          routes: [{ name: 'Auth' as never }],
        });
      } else {
        Alert.alert('Error', 'Failed to delete account. Please try again.');
      }
    } catch (err: any) {
      Alert.alert('Error', 'Failed to delete account. Please try again.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t('privacySecurity') || 'Privacy & Security'}
        onBack={() => navigation.goBack()}
        style={{ paddingTop: insets.top + 8 }}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 16, width: '100%' }}>
        {/* PASSWORD SECTION */}
        <Text style={[styles.sectionLabel, rtlText(rtl)]}>{t('password') || 'PASSWORD'}</Text>
        <TouchableOpacity
          style={[styles.card, rtl && styles.cardRTL]}
          activeOpacity={0.85}
          onPress={handleChangePassword}
        >
          <View style={[styles.cardIcon, styles.cardIconPurple, rtl && styles.cardIconRTL]}>
            <Lock size={18} color="#7C3AED" />
          </View>
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, rtlText(rtl)]}>{t('changePassword') || 'Change Password'}</Text>
            <Text style={[styles.cardSubtitle, rtlText(rtl)]}>
              {t('changePasswordSubtitle') ||
                'Verify with email code to change password'}
            </Text>
        </View>
        </TouchableOpacity>

        {/* SESSIONS SECTION */}
        <Text style={[styles.sectionLabel, rtlText(rtl)]}>{t('sessions') || 'SESSIONS'}</Text>
          <TouchableOpacity
          style={[styles.card, rtl && styles.cardRTL]}
          activeOpacity={0.85}
            onPress={handleLogoutAll}
          >
          <View style={[styles.cardIcon, styles.cardIconIndigo, rtl && styles.cardIconRTL]}>
            <LogOut size={18} color="#4F46E5" />
          </View>
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, rtlText(rtl)]}>
              {t('logoutAllDevices') || 'Logout from All Devices'}
            </Text>
            <Text style={[styles.cardSubtitle, rtlText(rtl)]}>
              {t('logoutAllDevicesDesc') || 'Sign out from all active sessions'}
            </Text>
          </View>
          </TouchableOpacity>

        <TouchableOpacity style={[styles.card, rtl && styles.cardRTL]} activeOpacity={0.85}>
          <View style={[styles.cardIcon, styles.cardIconGreen, rtl && styles.cardIconRTL]}>
            <Shield size={18} color="#16A34A" />
          </View>
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, rtlText(rtl)]}>
              {t('accountSecurity') || 'Account Security'}
            </Text>
            <Text style={[styles.cardSubtitle, rtlText(rtl)]}>
              {t('accountSecurityInfo') ||
                'Your account is protected with email/password authentication. All data is encrypted and securely stored.'}
            </Text>
        </View>
        </TouchableOpacity>

        {/* DANGER ZONE */}
        <Text style={[styles.sectionLabel, styles.dangerLabel, rtlText(rtl)]}>
          {t('dangerZone') || 'DANGER ZONE'}
        </Text>
        <TouchableOpacity
          style={[styles.deleteAccountButton, rtlRow(rtl), deleteLoading && styles.deleteAccountButtonDisabled]}
          activeOpacity={0.85}
          onPress={handleDeleteAccount}
          disabled={deleteLoading}
        >
          {deleteLoading ? (
            <ActivityIndicator size="small" color={colors.primary.foreground} />
          ) : (
            <>
              <Trash2 size={18} color={colors.primary.foreground} />
              <Text style={[styles.deleteAccountText, rtlText(rtl)]}>
                {t('deleteAccount') || 'Delete Account'}
              </Text>
            </>
          )}
        </TouchableOpacity>
        </View>
      </ScrollView>

    </View>
  );
}

const createStyles = (colors: any, insets: any, typography: any, fontFamily: string, rtl?: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.DEFAULT,
  },
  header: {
    paddingTop: insets.top + spacing.md,
    paddingStart: spacing.md,
    paddingEnd: spacing.md,
    paddingBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.DEFAULT,
  },
  headerRTL: {
    flexDirection: 'row',
  },
  rowReverse: {
    flexDirection: 'row',
  },
  textRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  backButtonWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    minWidth: 40,
    minHeight: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  backButtonLabel: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  headerLeftSlot: {
    minWidth: 100,
    maxWidth: 100,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerRightSlot: {
    minWidth: 100,
    maxWidth: 100,
  },
  headerTitle: {
    ...typography.h3,
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    color: colors.foreground.DEFAULT,
    marginHorizontal: spacing.sm,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingStart: spacing.lg,
    paddingEnd: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: insets.bottom + spacing.xl * 2,
    width: '100%',
    maxWidth: '100%',
  },
  sectionLabel: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    color: colors.foreground.muted,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.card.background,
    borderRadius: borderRadius.card,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: spacing.sm,
  },
  cardRTL: {
    flexDirection: 'row',
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: spacing.md,
  },
  cardIconRTL: {
    marginEnd: 0,
    marginStart: spacing.md,
  },
  cardIconPurple: {
    backgroundColor: 'rgba(124,58,237,0.1)',
  },
  cardIconIndigo: {
    backgroundColor: 'rgba(79,70,229,0.08)',
  },
  cardIconGreen: {
    backgroundColor: 'rgba(22,163,74,0.08)',
  },
  cardIconRed: {
    backgroundColor: 'rgba(220,38,38,0.06)',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    ...typography.label,
    fontSize: 14,
    color: colors.foreground.DEFAULT,
    marginBottom: 4,
  },
  cardSubtitle: {
    ...typography.caption,
    fontSize: 12,
    color: colors.foreground.muted,
  },
  dangerLabel: {
    color: '#EF4444',
  },
  deleteAccountButton: {
    backgroundColor: colors.error,
    borderRadius: borderRadius.card,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  deleteAccountText: {
    ...typography.body,
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary.foreground,
  },
  deleteAccountButtonDisabled: {
    opacity: 0.7,
  },
  deleteModalContent: {
    backgroundColor: colors.card.background,
    borderRadius: 20,
    width: '90%',
    maxWidth: 400,
    padding: spacing.lg,
  },
  deleteModalBody: {
    gap: spacing.md,
    alignItems: 'center',
  },
  warningIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteModalTitle: {
    ...typography.h3,
    color: colors.foreground.DEFAULT,
    textAlign: (isRTL ? 'right' : 'center') as 'left' | 'right' | 'center',
    writingDirection: 'rtl',
  },
  deleteModalText: {
    ...typography.bodySmall,
    color: colors.foreground.muted,
    textAlign: (isRTL ? 'right' : 'center') as 'left' | 'right' | 'center',
    writingDirection: 'rtl',
  },
  deleteActions: {
    flexDirection: 'row' as const,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  deleteCancelButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  deleteCancelText: {
    ...typography.body,
    color: colors.foreground.DEFAULT,
  },
  deleteConfirmButton: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: colors.error,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  deleteConfirmText: {
    ...typography.body,
    color: colors.primary.foreground,
    fontWeight: '600',
  },
  passwordField: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: 12,
    backgroundColor: colors.input.background,
    paddingStart: spacing.md,
    paddingEnd: spacing.md,
  },
  deletePasswordInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: colors.foreground.DEFAULT,
    fontFamily,
    textAlign: (isRTL ? 'right' : 'left') as 'left' | 'right',
    writingDirection: 'rtl',
  },
  passwordToggle: {
    padding: spacing.xs,
  },
  deleteFinalButton: {
    width: '100%',
    backgroundColor: colors.error,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  deleteFinalText: {
    ...typography.body,
    color: colors.primary.foreground,
    fontWeight: '600',
  },
});

