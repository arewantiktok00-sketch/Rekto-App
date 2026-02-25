import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useLanguage } from '@/contexts/LanguageContext';
import { CheckCircle, ArrowRight } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, borderRadius } from '@/theme/spacing';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/common/Text';
import { iconTransformRTL } from '@/utils/rtl';

export function PaymentSuccess() {
  const navigation = useNavigation();
  const route = useRoute();
  const { t, isRTL } = useLanguage();
  const { colors } = useTheme();
  const styles = createStyles(colors, isRTL);
  const { campaignId } = route.params as { campaignId?: string };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={colors.gradients.primary}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <CheckCircle size={80} color="#fff" />
          </View>
          <Text style={[styles.title, isRTL && styles.textRTL]}>{t('paymentSuccessful')}</Text>
          <Text style={[styles.subtitle, isRTL && styles.textRTL]}>{t('adBeingLaunched')}</Text>

          <View style={styles.infoCard}>
            <View style={[styles.infoRow, isRTL && styles.rowReverse]}>
              <Text style={[styles.infoLabel, isRTL && styles.textRTL]}>{t('status')}</Text>
              <Text style={[styles.infoValue, isRTL && styles.textRTL]}>{t('processing')}</Text>
            </View>
            <View style={[styles.infoRow, isRTL && styles.rowReverse]}>
              <Text style={[styles.infoLabel, isRTL && styles.textRTL]}>{t('estimatedStart')}</Text>
              <Text style={[styles.infoValue, isRTL && styles.textRTL]}>{t('within30Min')}</Text>
            </View>
          </View>

          <Text style={[styles.message, isRTL && styles.textRTL]}>{t('notifyWhenLive')}</Text>

          <View style={[styles.actions, isRTL && styles.rowReverse]}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate('Main', { screen: 'Dashboard' })}
            >
              <Text style={[styles.primaryButtonText, isRTL && styles.textRTL]}>{t('goToDashboard')}</Text>
            </TouchableOpacity>
            {campaignId && (
              <TouchableOpacity
                style={[styles.secondaryButton, isRTL && styles.rowReverse]}
                onPress={() => navigation.navigate('CampaignDetail', { id: campaignId })}
              >
                <Text style={[styles.secondaryButtonText, isRTL && styles.textRTL]}>{t('viewCampaigns')}</Text>
                <ArrowRight size={16} color={colors.primary.DEFAULT} style={iconTransformRTL()} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const createStyles = (colors: any, isRTL?: boolean) => StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.screenPadding,
  },
  iconContainer: {
    marginBottom: spacing[6],
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    marginBottom: spacing[2.5],
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: spacing[6],
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: borderRadius.card,
    padding: spacing.lg,
    width: '100%',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  infoLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  message: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: spacing[6],
    lineHeight: 20,
  },
  actions: {
    width: '100%',
    gap: spacing.md,
  },
  primaryButton: {
    backgroundColor: '#fff',
    paddingVertical: spacing.md,
    height: 56,
    borderRadius: borderRadius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: colors.primary.DEFAULT,
    fontSize: 17,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingVertical: spacing.md,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fff',
    gap: spacing.sm,
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
