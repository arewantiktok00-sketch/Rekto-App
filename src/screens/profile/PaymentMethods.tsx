import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '@/contexts/LanguageContext';
import { isRTL, rtlText, rtlRow } from '@/utils/rtl';
import { Plus, CreditCard, AlertTriangle } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing, borderRadius } from '@/theme/spacing';
import { toast } from '@/utils/toast';
import { Text } from '@/components/common/Text';
import { ScreenHeader } from '@/components/common/ScreenHeader';

export function PaymentMethods() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { t, language } = useLanguage();
  const rtl = isRTL(language);
  const { colors } = useTheme();
  const styles = createStyles(colors, insets, rtl);
  const comingSoonShown = useRef(false);
  const [showComingSoon, setShowComingSoon] = useState(false);

  useEffect(() => {
    if (comingSoonShown.current) return;
    comingSoonShown.current = true;
    setShowComingSoon(true);
  }, [t]);

  const handleAddCard = () => {
    toast.info(t('comingSoon') || 'Coming soon', t('paymentMethodsComingSoon') || 'Payment methods are not supported yet.');
  };

  return (
    <View style={styles.container}>
      <Modal
        visible={showComingSoon}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowComingSoon(false);
          navigation.goBack();
        }}
      >
        <View style={styles.comingSoonBackdrop}>
          <View style={styles.comingSoonCard}>
            <View style={styles.comingSoonHeader}>
              <View style={styles.comingSoonIconWrap}>
                <AlertTriangle size={26} color="#FFFFFF" />
              </View>
              <Text style={[styles.comingSoonTitle, rtlText(rtl)]}>{t('comingSoon') || 'Coming Soon'}</Text>
            </View>
            <View style={styles.comingSoonBody}>
              <Text style={[styles.comingSoonText, rtlText(rtl)]}>
                {t('paymentMethodsComingSoon') || 'Payment methods are not supported yet.'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.comingSoonButton}
              onPress={() => {
                setShowComingSoon(false);
                navigation.goBack();
              }}
            >
              <Text style={[styles.comingSoonButtonText, rtlText(rtl)]}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <ScreenHeader
        title={t('paymentMethods') || 'Payment Methods'}
        onBack={() => navigation.goBack()}
        style={{ paddingTop: insets.top + 8 }}
        rightElement={
          <TouchableOpacity onPress={handleAddCard} style={styles.headerPlusButton} activeOpacity={0.8}>
            <Plus size={20} color={colors.primary.foreground} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 16, width: '100%' }}>
        <View style={styles.emptyState}>
          <View style={styles.emptyIconCircle}>
            <CreditCard size={28} color={colors.foreground.muted} />
          </View>
          <Text style={[styles.emptyText, rtlText(rtl)]}>{t('noPaymentMethods')}</Text>
          <Text style={[styles.emptySubtext, rtlText(rtl)]}>{t('addCardToStart')}</Text>
          <TouchableOpacity style={styles.addButtonContainer}>
            <LinearGradient
              colors={['#7C3AED', '#9333EA']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.addButton, rtlRow(rtl)]}
            >
              <Plus size={20} color="#fff" />
              <Text style={[styles.addButtonText, rtlText(rtl)]}>{t('addCard')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* More payment options */}
        <Text style={[styles.moreOptionsLabel, rtlText(rtl)]}>
          {t('morePaymentOptions') || 'More payment options'}
        </Text>
        <View style={[styles.moreOptionCard, rtlRow(rtl)]}>
          <View style={styles.moreOptionIcon}>
            <CreditCard size={18} color={colors.foreground.muted} />
          </View>
          <View style={styles.moreOptionContent}>
            <Text style={[styles.moreOptionTitle, rtlText(rtl)]}>
              {t('digitalWallets') || 'Digital Wallets'}
            </Text>
            <Text style={[styles.moreOptionSubtitle, rtlText(rtl)]}>
              {t('comingSoon') || 'Coming soon'}
            </Text>
          </View>
        </View>
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any, insets: any, rtl?: boolean) => StyleSheet.create({
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
  headerPlusButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.foreground.DEFAULT,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.foreground.muted,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  addButtonContainer: {
    width: '100%',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingStart: spacing.lg,
    paddingEnd: spacing.lg,
    borderRadius: borderRadius.button,
    gap: spacing.sm,
    height: 56,
    justifyContent: 'center',
  },
  addButtonText: {
    color: colors.primary.foreground,
    fontSize: 17,
    fontWeight: '600',
  },
  moreOptionsLabel: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    color: colors.foreground.muted,
  },
  moreOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card.background,
    borderRadius: borderRadius.card,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    paddingStart: spacing.md,
    paddingEnd: spacing.md,
    paddingVertical: spacing.md,
  },
  moreOptionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: spacing.md,
  },
  moreOptionContent: {
    flex: 1,
  },
  moreOptionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.foreground.DEFAULT,
    marginBottom: 2,
  },
  moreOptionSubtitle: {
    fontSize: 12,
    color: colors.foreground.muted,
  },
  comingSoonBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  comingSoonCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  comingSoonHeader: {
    backgroundColor: '#EF4444',
    paddingVertical: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  comingSoonIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  comingSoonTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  comingSoonBody: {
    paddingStart: spacing.lg,
    paddingEnd: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  comingSoonText: {
    fontSize: 14,
    color: '#111827',
    textAlign: 'center',
    lineHeight: 20,
  },
  comingSoonButton: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    backgroundColor: '#EF4444',
    alignItems: 'center',
  },
  comingSoonButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});

