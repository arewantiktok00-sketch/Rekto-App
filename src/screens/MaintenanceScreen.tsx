import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Wrench } from 'lucide-react-native';
import { Text } from '@/components/common/Text';

interface Props {
  message?: string;
}

export default function MaintenanceScreen({ message }: Props) {
  const { language, t } = useLanguage();
  const { colors } = useTheme();
  const isRTL = language === 'ckb' || language === 'ar';
  const styles = createStyles(colors);

  // Get localized message
  const getLocalizedMessage = () => {
    if (message) return message;
    
    // Fallback to default messages
    if (language === 'ckb') {
      return 'ئێمە لە چاککردنەوەدایین. تکایە دواتر هەوڵ بدەرەوە.';
    } else if (language === 'ar') {
      return 'نحن نجري صيانة. يرجى المحاولة لاحقاً.';
    } else {
      return 'We are performing maintenance. Please try again later.';
    }
  };

  return (
    <View style={styles.container}>
      <Wrench size={64} color={colors.warning} style={styles.icon} />
      
      <Text style={[styles.title, isRTL && styles.rtlText]}>
        {language === 'ckb' ? 'چاککردنەوە' : 
         language === 'ar' ? 'الصيانة' : 
         'Under Maintenance'}
      </Text>
      
      <Text style={[styles.message, isRTL && styles.rtlText]}>
        {getLocalizedMessage()}
      </Text>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  icon: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: 'Poppins-Bold',
    color: colors.primary.foreground,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: colors.foreground.muted,
    textAlign: 'center',
    lineHeight: 24,
  },
  rtlText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
