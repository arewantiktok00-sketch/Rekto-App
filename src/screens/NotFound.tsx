import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, borderRadius } from '@/theme/spacing';
import { ChevronBackIcon } from '@/components/icons/ChevronBackIcon';
import { Text } from '@/components/common/Text';

export function NotFound() {
  const navigation = useNavigation();
  const { t, isRTL } = useLanguage();
  const { colors } = useTheme();
  const styles = createStyles(colors, isRTL);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>404</Text>
      <Text style={[styles.subtitle, isRTL && styles.textRTL]}>{t('pageNotFound') || 'Page Not Found'}</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.goBack()}
      >
        <View style={styles.backRow}>
          <ChevronBackIcon size={20} color={colors.primary.foreground} isRTL={isRTL} />
          <Text style={[styles.buttonText, isRTL && styles.textRTL]}>{t('back') || 'Go Back'}</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (colors: any, isRTL?: boolean) => StyleSheet.create({
  textRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.screenPadding,
    backgroundColor: colors.background.DEFAULT,
  },
  title: {
    fontSize: 72,
    fontWeight: '700',
    color: colors.primary.DEFAULT,
    marginBottom: spacing[2.5],
  },
  subtitle: {
    fontSize: 24,
    color: colors.foreground.muted,
    marginBottom: spacing[8],
  },
  button: {
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: borderRadius.button,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing[6],
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backRow: {
    flexDirection: (isRTL ?? false) ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: 6,
  },
  buttonText: {
    color: colors.primary.foreground,
    fontSize: 17,
    fontWeight: '600',
  },
});
