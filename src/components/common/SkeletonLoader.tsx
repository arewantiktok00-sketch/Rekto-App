import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, borderRadius } from '@/theme/spacing';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = 20,
  borderRadius: br = borderRadius.card,
  style,
}) => {
  const { colors } = useTheme();
  const animatedValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, []);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: br,
          backgroundColor: colors.background.secondary || '#F3F4F6',
          opacity,
        },
        style,
      ]}
    />
  );
};

export const CampaignCardSkeleton = () => {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.card, { backgroundColor: colors.card.background }]}>
      <View style={styles.header}>
        <SkeletonLoader width={48} height={48} borderRadius={12} />
        <View style={styles.headerText}>
          <SkeletonLoader width="70%" height={18} />
          <SkeletonLoader width="50%" height={14} style={{ marginTop: 8 }} />
        </View>
        <SkeletonLoader width={80} height={24} borderRadius={12} />
      </View>
      <View style={styles.metrics}>
        <SkeletonLoader width="30%" height={40} />
        <SkeletonLoader width="30%" height={40} />
        <SkeletonLoader width="30%" height={40} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: spacing.md + 4,
    marginBottom: spacing.md,
    marginHorizontal: spacing.md,
    borderRadius: borderRadius.card + 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  metrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
});
