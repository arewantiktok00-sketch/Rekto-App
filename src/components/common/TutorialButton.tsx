import React from 'react';
import { TouchableOpacity, ViewStyle, StyleSheet } from 'react-native';
import { PlayCircle } from 'lucide-react-native';
import { Text } from '@/components/common/Text';
import { useTheme } from '@/contexts/ThemeContext';
import { navigationRef } from '@/navigation/navigationService';
import { spacing } from '@/theme/spacing';

interface TutorialButtonProps {
  topic: string;
  style?: ViewStyle;
  /** Optional margin bottom (e.g. mb-4) */
  className?: string;
}

/**
 * Navigates to the Tutorial screen with the given topic.
 * Works from Auth (Login/SignUp) and from OwnerDashboard (root stack has Tutorial).
 */
export function TutorialButton({ topic, style }: TutorialButtonProps) {
  const { colors } = useTheme();

  const onPress = () => {
    if (navigationRef.current?.isReady()) {
      (navigationRef.current as any).navigate('Tutorial', { topic });
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, { borderColor: colors.border.DEFAULT }, style]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <PlayCircle size={20} color={colors.primary.DEFAULT} />
      <Text style={[styles.label, { color: colors.primary.DEFAULT }]}>Tutorial</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    borderWidth: 1.5,
    minHeight: 44,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
});
