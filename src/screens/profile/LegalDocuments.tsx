import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FileText, ShieldCheck, Receipt, ChevronRight } from 'lucide-react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, borderRadius } from '@/theme/spacing';
import { getTypographyStyles } from '@/theme/typography';
import { Text } from '@/components/common/Text';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { iconTransformRTL } from '@/utils/rtl';

export function LegalDocuments() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { t, language, isRTL } = useLanguage();
  const { colors } = useTheme();
  const typography = getTypographyStyles(language as 'ckb' | 'ar');
  const styles = createStyles(colors, insets, typography, isRTL);

  const items = [
    { icon: FileText, label: t('termsOfService') || 'Terms of Service', screen: 'Terms' },
    { icon: ShieldCheck, label: t('privacyPolicy') || 'Privacy Policy', screen: 'Privacy' },
    { icon: Receipt, label: t('refund') || 'Refund Policy', screen: 'Refund' },
  ];

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t('legalDocuments') || 'Legal Documents'}
        onBack={() => navigation.goBack()}
        style={{ paddingTop: insets.top + 8 }}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 16, width: '100%' }}>
        <View style={styles.card}>
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <TouchableOpacity
                key={item.screen}
                style={[styles.itemRow, isRTL && styles.rowReverse]}
                onPress={() => navigation.navigate(item.screen as never)}
                activeOpacity={0.8}
              >
                <View style={styles.itemIcon}>
                  <Icon size={18} color={colors.primary.DEFAULT} />
                </View>
                <Text style={[styles.itemLabel, isRTL && styles.textRTL]}>{item.label}</Text>
                <ChevronRight size={18} color={colors.foreground.muted} style={iconTransformRTL()} />
              </TouchableOpacity>
            );
          })}
        </View>
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any, insets: any, typography: any, isRTL?: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.DEFAULT,
  },
  rowReverse: {
    flexDirection: 'row',
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
  card: {
    width: '100%',
    backgroundColor: colors.card.background,
    borderRadius: borderRadius.card,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    overflow: 'hidden',
  },
  itemRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
    gap: spacing.sm,
  },
  itemIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.card.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemLabel: {
    ...typography.body,
    flex: 1,
    minWidth: 0,
    color: colors.foreground.DEFAULT,
  },
});
