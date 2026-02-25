import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, borderRadius } from '@/theme/spacing';
import { Text } from '@/components/common/Text';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  iconBgColor?: string;
  variant?: 'dark' | 'light';
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  iconBgColor,
  variant = 'dark',
  trend,
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors, variant);
  const defaultIconBg = colors.background.secondary;
  return (
    <View style={styles.card}>
      <View style={styles.iconLabelRow}>
        {icon && (
          <View style={[styles.iconContainer, { backgroundColor: iconBgColor || defaultIconBg }]}>
            {icon}
          </View>
        )}
        <Text style={styles.title}>{title}</Text>
      </View>
      <Text style={styles.value}>{value}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {trend && (
        <View style={styles.trend}>
          <Text
            style={[
              styles.trendText,
              { color: trend.isPositive ? colors.success : colors.error },
            ]}
          >
            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
          </Text>
        </View>
      )}
    </View>
  );
};

const createStyles = (colors: any, variant: 'dark' | 'light') => StyleSheet.create({
  card: {
    backgroundColor: colors.card.background,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    shadowColor: colors.border.DEFAULT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: variant === 'light' ? 0.05 : 0.1,
    shadowRadius: 8,
    elevation: 2,
    minHeight: 100,
  },
  iconLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 14,
    color: colors.foreground.muted,
    fontWeight: '500',
    flex: 1,
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.foreground.DEFAULT,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: colors.foreground.muted,
    marginTop: 4,
  },
  trend: {
    marginTop: spacing[2],
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
