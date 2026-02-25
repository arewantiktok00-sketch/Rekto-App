import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '@/contexts/LanguageContext';
import { Check, Globe2 } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, borderRadius } from '@/theme/spacing';
import { getTypographyStyles } from '@/theme/typography';
import { toast } from '@/utils/toast';
import { Text } from '@/components/common/Text';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { rtlText, rtlRow } from '@/utils/rtl';

export function LanguageSettings() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { language, setLanguage, t } = useLanguage();
  const rtl = true;
  const { colors } = useTheme();
  const typography = getTypographyStyles(language as 'ckb' | 'ar');
  const styles = createStyles(colors, insets, typography, rtl);

  const languages = [
    { code: 'ckb', name: 'Kurdish (Sorani)', nativeName: 'کوردی', countryCode: 'IQ' },
    { code: 'en', name: 'English', nativeName: 'English', countryCode: 'US' },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية', countryCode: 'IQ' },
  ];

  const handleLanguageChange = async (lang: 'ckb' | 'en' | 'ar') => {
    await setLanguage(lang);
    toast.success('باشە', 'زمان نوێکرایەوە');
  };

  const currentLanguage = languages.find((l) => l.code === language) || languages[0];

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t('languageSettings') || 'profile.language'}
        onBack={() => navigation.goBack()}
        style={{ paddingTop: insets.top + 8 }}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 16, width: '100%' }}>
        {/* Current Language Card */}
        <View style={[styles.currentLanguageCard, rtlRow(rtl)]}>
          <View style={styles.currentLanguageIcon}>
            <Globe2 size={20} color="#FAFAFA" />
          </View>
          <View style={styles.currentLanguageContent}>
            <Text style={[styles.currentLanguageLabel, rtlText(rtl)]}>
              {t('profileCurrentLanguage') || 'Current Language'}
            </Text>
            <Text style={[styles.currentLanguageValue, rtlText(rtl)]}>{currentLanguage.name}</Text>
          </View>
        </View>

        {/* Section label */}
        <Text style={[styles.sectionLabel, rtlText(rtl)]}>
          {t('profileSelectLanguage') || 'Select Language'}
        </Text>

        {/* Language options */}
        <View style={styles.languagesCard}>
          {languages.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={[
                styles.languageOption,
                rtlRow(rtl),
                language === lang.code && styles.languageOptionSelected,
              ]}
              onPress={() => handleLanguageChange(lang.code as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.languageCountry, rtl && { marginEnd: 0, marginStart: spacing.md }]}>
                <Text
                  style={[
                    styles.countryCode,
                    rtlText(rtl),
                    language === lang.code && styles.languageTextSelected,
                  ]}
                >
                  {lang.countryCode}
                </Text>
              </View>
              <View style={styles.languageLeft}>
                <Text
                  style={[
                    styles.languageName,
                    rtlText(rtl),
                    language === lang.code && styles.languageTextSelected,
                  ]}
                >
                  {lang.name}
                </Text>
                <Text
                  style={[
                    styles.languageNative,
                    rtlText(rtl),
                    language === lang.code && styles.languageTextSelected,
                  ]}
                >
                  {lang.nativeName}
                </Text>
              </View>
              {language === lang.code && (
                <View style={styles.checkContainer}>
                  <Check size={18} color="#FAFAFA" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.infoCard}>
          <Text style={[styles.infoText, rtlText(rtl)]}>
            {t('confirmLanguageChange') || 'Changing language will update the app interface immediately.'}
          </Text>
        </View>
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any, insets: any, typography: any, rtl?: boolean) => StyleSheet.create({
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
  rowReverse: {
    flexDirection: 'row',
  },
  headerLeftSlot: {
    minWidth: 100,
    maxWidth: 100,
    alignItems: rtl ? 'flex-end' : 'flex-start',
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
  currentLanguageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.card,
    borderWidth: 2,
    borderColor: '#A855F7',
    backgroundColor: colors.primary.DEFAULT,
    paddingStart: spacing.md,
    paddingEnd: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  currentLanguageIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: spacing.md,
  },
  currentLanguageContent: {
    flex: 1,
  },
  currentLanguageLabel: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: '#FAFAFA',
    marginBottom: 2,
  },
  currentLanguageValue: {
    ...typography.body,
    fontSize: 16,
    fontWeight: '600',
    color: '#FAFAFA',
  },
  sectionLabel: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    color: colors.foreground.muted,
    marginBottom: spacing.sm,
  },
  languagesCard: {
    marginBottom: spacing.lg,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card.background,
    paddingStart: spacing.md,
    paddingEnd: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.card,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  languageOptionSelected: {
    borderColor: colors.primary.DEFAULT,
    backgroundColor: colors.primary.DEFAULT,
  },
  languageCountry: {
    width: 40,
    marginEnd: spacing.md,
  },
  countryCode: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '600',
    color: colors.foreground.DEFAULT,
  },
  languageTextSelected: {
    color: '#FAFAFA',
  },
  languageLeft: {
    flex: 1,
  },
  languageName: {
    ...typography.h3,
    fontSize: 17,
    color: colors.foreground.DEFAULT,
    marginBottom: 4,
  },
  languageNative: {
    ...typography.bodySmall,
    fontSize: 14,
    color: colors.foreground.muted,
  },
  checkContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary.DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCard: {
    backgroundColor: colors.card.background,
    borderRadius: borderRadius.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  infoText: {
    ...typography.bodySmall,
    fontSize: 13,
    color: colors.foreground.muted,
  },
});

