import React from 'react';
import { View, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { useRemoteConfig } from '@/contexts/RemoteConfigContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { X } from 'lucide-react-native';
import { spacing, borderRadius } from '@/theme/spacing';
import { getTypographyStyles } from '@/theme/typography';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { Text } from '@/components/common/Text';

interface AppBannerProps {
  onDismiss?: () => void;
}

export const AppBanner: React.FC<AppBannerProps> = ({ onDismiss }) => {
  const { bannerConfig } = useRemoteConfig();
  const { colors } = useTheme();
  const { language, isRTL } = useLanguage();
  const typography = getTypographyStyles(language as 'ckb' | 'ar');
  const styles = createStyles(colors, typography, isRTL);

  if (!bannerConfig.banner_enabled || !bannerConfig.banner_text) {
    return null;
  }

  const handlePress = () => {
    if (bannerConfig.banner_link) {
      Linking.openURL(bannerConfig.banner_link);
    }
  };

  const handleDismiss = () => {
    if (onDismiss) {
      onDismiss();
    }
  };

  return (
    <Animated.View 
      entering={FadeInDown.duration(300)}
      style={styles.container}
    >
      <TouchableOpacity
        style={styles.content}
        onPress={handlePress}
        disabled={!bannerConfig.banner_link}
        activeOpacity={bannerConfig.banner_link ? 0.7 : 1}
      >
        <Text style={styles.text} numberOfLines={2}>
          {bannerConfig.banner_text}
        </Text>
      </TouchableOpacity>

      {onDismiss && (
        <TouchableOpacity style={styles.closeButton} onPress={handleDismiss}>
          <X size={18} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

const createStyles = (colors: any, typography: any, isRTL?: boolean) => StyleSheet.create({
  container: {
    backgroundColor: '#7C3AED20', // Primary with opacity
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#7C3AED40',
  },
  content: {
    flex: 1,
  },
  text: {
    color: '#7C3AED',
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    textAlign: 'left',
    writingDirection: 'rtl',
    lineHeight: 20,
  },
  closeButton: {
    padding: spacing.xs,
    marginStart: spacing.sm,
  },
});
