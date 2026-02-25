import React, { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRemoteConfig } from '@/contexts/RemoteConfigContext';
import { AppSettings } from '@/types/remote-config';
import { Lock } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { spacing } from '@/theme/spacing';
import { getTypographyStyles } from '@/theme/typography';
import { Text } from '@/components/common/Text';

interface FeatureGateProps {
  feature: keyof AppSettings['features'];
  children: ReactNode;
  fallback?: ReactNode;
  showDisabledMessage?: boolean;
  disabledMessage?: string;
}

export const FeatureGate: React.FC<FeatureGateProps> = ({
  feature,
  children,
  fallback,
  showDisabledMessage = false,
  disabledMessage,
}) => {
  const { isFeatureEnabled } = useRemoteConfig();
  const { colors } = useTheme();
  const { language } = useLanguage();
  const typography = getTypographyStyles(language as 'ckb' | 'ar');
  const styles = createStyles(colors, typography);

  if (!isFeatureEnabled(feature)) {
    if (fallback) return <>{fallback}</>;
    
    if (showDisabledMessage) {
      return (
        <View style={styles.disabledContainer}>
          <Lock size={24} color="rgba(255,255,255,0.3)" />
          <Text style={styles.disabledText}>
            {disabledMessage || 'This feature is currently unavailable'}
          </Text>
        </View>
      );
    }
    
    return null;
  }

  return <>{children}</>;
};

const createStyles = (colors: any, typography: any) => StyleSheet.create({
  disabledContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  disabledText: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
