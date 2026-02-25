import React from 'react';
import { Modal, View, StyleSheet, TouchableOpacity } from 'react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Text } from '@/components/common/Text';
import { X } from 'lucide-react-native';
import { spacing, borderRadius } from '@/theme/spacing';

interface ExpiredOfferModalProps {
  visible: boolean;
  onClose: () => void;
}

const copy = {
  en: {
    title: 'Offer Ended',
    message: 'This special offer is no longer available. Stay tuned for our next promotion!',
    button: 'Got it',
  },
  ckb: {
    title: 'ئۆفەرەکە تەواو بوو',
    message: 'ئەم ئۆفەرە تایبەتە ئیتر بەردەست نییە. چاوەڕوانی ئۆفەری داهاتوومان بە!',
    button: 'تێگەیشتم',
  },
  ar: {
    title: 'انتهى العرض',
    message: 'هذا العرض الخاص لم يعد متاحاً. ترقب عروضنا القادمة!',
    button: 'فهمت',
  },
};

export const ExpiredOfferModal: React.FC<ExpiredOfferModalProps> = ({ visible, onClose }) => {
  const { language } = useLanguage();
  const { colors } = useTheme();
  const isRTL = language === 'ckb' || language === 'ar';
  const strings = copy[language as keyof typeof copy] || copy.en;
  const styles = createStyles(colors, isRTL);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={18} color={colors.foreground.DEFAULT} />
          </TouchableOpacity>
          <Text style={styles.title}>{strings.title}</Text>
          <Text style={styles.message}>{strings.message}</Text>
          <TouchableOpacity style={styles.okButton} onPress={onClose}>
            <Text style={styles.okButtonText}>{strings.button}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (colors: any, isRTL: boolean) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
    backgroundColor: colors.overlay.dark,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.lg,
    },
    card: {
      width: '100%',
      borderRadius: borderRadius.card,
      backgroundColor: colors.card.background,
      padding: spacing.lg,
    },
    closeButton: {
      alignSelf: 'flex-end',
      padding: spacing.xs,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.foreground.DEFAULT,
      textAlign: isRTL ? 'right' : 'left',
      marginBottom: spacing.sm,
    },
    message: {
      fontSize: 14,
      color: colors.foreground.muted,
      textAlign: isRTL ? 'right' : 'left',
      marginBottom: spacing.lg,
    },
    okButton: {
      alignSelf: 'flex-end',
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 10,
      backgroundColor: colors.primary.DEFAULT,
    },
    okButtonText: {
      color: '#fff',
      fontWeight: '600',
    },
  });
