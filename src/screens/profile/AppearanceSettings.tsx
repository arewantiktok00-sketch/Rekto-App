import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Check, Moon, Sun, Monitor } from 'lucide-react-native';
import { spacing, borderRadius } from '@/theme/spacing';
import { getTypographyStyles } from '@/theme/typography';
import { toast } from '@/utils/toast';
import { Text } from '@/components/common/Text';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { isRTL, rtlText, rtlRow } from '@/utils/rtl';

type Theme = 'light' | 'dark' | 'system';

export function AppearanceSettings() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { t, language } = useLanguage();
  const rtl = isRTL(language);
  const { colors, themeMode, setThemeMode } = useTheme();
  const typography = getTypographyStyles(language as 'ckb' | 'ar');
  const styles = createStyles(colors, insets, typography, rtl);
  const [theme, setTheme] = useState<Theme>(themeMode);

  useEffect(() => {
    setTheme(themeMode);
  }, [themeMode]);

  const handleThemeChange = async (newTheme: Theme) => {
    setTheme(newTheme);
    await setThemeMode(newTheme);
    toast.success('Saved', 'Theme updated');
  };

  const themes = [
    {
      value: 'system' as Theme,
      label: t('systemDefault') || 'System Default',
      description: t('followsDeviceSettings') || 'Follows your device settings',
      icon: Monitor,
    },
    {
      value: 'light' as Theme,
      label: t('lightMode') || 'Light Mode',
      description: t('brightAndClean') || 'Bright and clean interface',
      icon: Sun,
    },
    {
      value: 'dark' as Theme,
      label: t('darkMode') || 'Dark Mode',
      description: t('easyOnTheEyes') || 'Easy on the eyes',
      icon: Moon,
    },
  ];

  const currentTheme = themes.find((tItem) => tItem.value === theme) || themes[1];

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t('appearance') || 'Appearance'}
        onBack={() => navigation.goBack()}
        style={{ paddingTop: insets.top + 8 }}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 16, width: '100%' }}>
        {/* Current Theme Card */}
        <View style={[styles.currentThemeCard, rtlRow(rtl)]}>
          <View style={[styles.currentThemeIcon, rtl && styles.currentThemeIconRTL]}>
            <Sun size={20} color="#FAFAFA" />
          </View>
          <View style={styles.currentThemeContent}>
            <Text style={[styles.currentThemeLabel, rtlText(rtl)]}>
              {t('appearanceCurrentTheme') || 'Current Theme'}
            </Text>
            <Text style={[styles.currentThemeValue, rtlText(rtl)]}>{currentTheme.label}</Text>
          </View>
        </View>

        {/* Section label */}
        <Text style={[styles.sectionLabel, rtlText(rtl)]}>
          {t('selectTheme') || 'SELECT THEME'}
        </Text>

        {/* Theme options */}
        <View style={styles.themeList}>
        {themes.map((themeOption) => {
          const Icon = themeOption.icon;
          const isSelected = theme === themeOption.value;
          return (
            <TouchableOpacity
              key={themeOption.value}
              style={[styles.themeOption, isSelected && styles.themeOptionSelected, rtlRow(rtl)]}
              onPress={() => handleThemeChange(themeOption.value)}
              activeOpacity={0.85}
            >
              {rtl ? (
                <>
                  <View style={[styles.themeCheck, isSelected && styles.themeCheckSelected]}>
                    {isSelected && <Check size={16} color="#FAFAFA" />}
                  </View>
                  <View style={styles.themeText}>
                    <Text style={[styles.themeLabel, isSelected && styles.themeLabelSelected, rtlText(rtl)]}>
                      {themeOption.label}
                    </Text>
                    <Text style={[styles.themeDescription, isSelected && styles.themeDescriptionSelected, rtlText(rtl)]}>
                      {themeOption.description}
                    </Text>
                  </View>
                  <View style={[styles.themeIconWrapper, rtl && styles.themeIconRTL]}>
                    <Icon size={20} color={isSelected ? '#FAFAFA' : colors.foreground.muted} />
                  </View>
                </>
              ) : (
                <>
                  <View style={[styles.themeIconWrapper]}>
                    <Icon size={20} color={isSelected ? '#FAFAFA' : colors.foreground.muted} />
                  </View>
                  <View style={styles.themeText}>
                    <Text style={[styles.themeLabel, isSelected && styles.themeLabelSelected, rtlText(rtl)]}>
                      {themeOption.label}
                    </Text>
                    <Text style={[styles.themeDescription, isSelected && styles.themeDescriptionSelected, rtlText(rtl)]}>
                      {themeOption.description}
                    </Text>
                  </View>
                  <View style={[styles.themeCheck, isSelected && styles.themeCheckSelected]}>
                    {isSelected && <Check size={16} color="#FAFAFA" />}
                  </View>
                </>
              )}
            </TouchableOpacity>
          );
        })}
        </View>

        <View style={styles.infoCard}>
          <Text style={[styles.infoText, rtlText(rtl)]}>
            {t('themeInfo') ||
              'Your theme preference is saved and will be applied across all your sessions.'}
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
    gap: 6,
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
    fontWeight: '600',
    color: colors.foreground.DEFAULT,
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
    paddingHorizontal: 16,
    paddingTop: spacing.sm,
    paddingBottom: Math.max(40, insets.bottom + spacing.xl),
    width: '100%',
    maxWidth: '100%',
  },
  currentThemeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.card,
    borderWidth: 2,
    borderColor: '#A855F7',
    backgroundColor: colors.primary.DEFAULT,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  currentThemeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: spacing.md,
  },
  currentThemeIconRTL: {
    marginEnd: 0,
    marginStart: spacing.md,
  },
  currentThemeContent: {
    flex: 1,
  },
  currentThemeLabel: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: '#FAFAFA',
    marginBottom: 2,
  },
  currentThemeValue: {
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
    textAlign: 'center',
  },
  themeList: {
    marginBottom: spacing.lg,
  },
  themeOption: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card.background,
    padding: 16,
    borderRadius: 16,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  themeOptionSelected: {
    borderColor: colors.primary.DEFAULT,
    backgroundColor: '#7C3AED',
  },
  themeIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: spacing.md,
  },
  themeIconRTL: {
    marginEnd: 0,
    marginStart: spacing.md,
  },
  themeText: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  themeLabel: {
    ...typography.h3,
    fontSize: 16,
    color: colors.foreground.DEFAULT,
    marginBottom: 4,
  },
  themeLabelSelected: {
    color: '#FAFAFA',
  },
  themeDescription: {
    ...typography.caption,
    fontSize: 12,
    color: colors.foreground.muted,
  },
  themeDescriptionSelected: {
    color: '#FAFAFA',
  },
  themeCheck: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.border.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeCheckSelected: {
    borderColor: colors.primary.DEFAULT,
    backgroundColor: colors.primary.DEFAULT,
  },
  infoText: {
    ...typography.bodySmall,
    fontSize: 13,
    color: colors.foreground.muted,
    padding: spacing.md,
    textAlign: (rtl ? 'right' : 'left') as 'left' | 'right',
    writingDirection: 'rtl',
  },
  infoCard: {
    backgroundColor: colors.card.background,
    borderRadius: borderRadius.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
});

