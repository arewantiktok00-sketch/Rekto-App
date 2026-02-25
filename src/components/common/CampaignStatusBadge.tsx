import React from 'react';
import { View, StyleSheet } from 'react-native';
import { 
  Clock, 
  CreditCard, 
  FileCheck, 
  Pause, 
  CheckCircle, 
  AlertCircle, 
  XCircle 
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, borderRadius } from '@/theme/spacing';
import { Text } from '@/components/common/Text';

export type CampaignStatus =
  | 'pending'
  | 'waiting_for_admin'
  | 'awaiting_payment'
  | 'verifying_payment'
  | 'scheduled'
  | 'in_review'
  | 'active'
  | 'running'
  | 'paused'
  | 'completed'
  | 'rejected'
  | 'failed';

interface CampaignStatusBadgeProps {
  status: string;
  rejectionReason?: string | null;
  tiktokStatus?: string | null;
  compact?: boolean;
}

// Status configuration - EXACTLY matching web version
const statusConfig: Record<string, { 
  icon: React.ComponentType<{ size?: number; color?: string }>; 
  color: string; 
  bgColor: string; 
  label: string;
}> = {
  waiting_for_admin: { 
    icon: Clock, 
    color: '#CA8A04',      // Yellow-600
    bgColor: 'rgba(234, 179, 8, 0.15)', 
    label: 'Under Review'  // NOT "Pending"!
  },
  awaiting_payment: { 
    icon: CreditCard, 
    color: '#EA580C',      // Orange-600
    bgColor: 'rgba(249, 115, 22, 0.15)', 
    label: 'Awaiting Payment'
  },
  verifying_payment: { 
    icon: FileCheck, 
    color: '#2563EB',      // Blue-600
    bgColor: 'rgba(59, 130, 246, 0.15)', 
    label: 'Verifying Payment'
  },
  pending: { 
    icon: Clock, 
    color: '#CA8A04',      // Yellow-600
    bgColor: 'rgba(234, 179, 8, 0.15)', 
    label: 'In Review'     // This means TikTok is reviewing
  },
  active: { 
    icon: CheckCircle, 
    color: '#16A34A',      // Green-600
    bgColor: 'rgba(22, 163, 74, 0.15)', 
    label: 'Active'
  },
  paused: { 
    icon: Pause, 
    color: '#71717A',      // Gray-500
    bgColor: 'rgba(113, 113, 122, 0.15)', 
    label: 'Paused'
  },
  completed: { 
    icon: CheckCircle, 
    color: '#2563EB',      // Blue-600
    bgColor: 'rgba(59, 130, 246, 0.15)', 
    label: 'Completed'
  },
  failed: { 
    icon: AlertCircle, 
    color: '#DC2626',      // Red-600
    bgColor: 'rgba(220, 38, 38, 0.15)', 
    label: 'Failed'
  },
  rejected: { 
    icon: XCircle, 
    color: '#DC2626',      // Red-600
    bgColor: 'rgba(220, 38, 38, 0.15)', 
    label: 'Rejected'
  },
};

export const CampaignStatusBadge: React.FC<CampaignStatusBadgeProps> = ({
  status,
  rejectionReason,
  tiktokStatus,
  compact = false,
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  // Priority: TikTok rejection > internal status
  let config = statusConfig[status] || statusConfig.pending;
  
  // Override for TikTok-specific statuses
  if (tiktokStatus === 'AUDIT_DENIED') {
    config = statusConfig.rejected;
  } else if (tiktokStatus === 'AUDITING' && status === 'pending') {
    config = statusConfig.pending; // "In Review" - TikTok is reviewing
  }

  const Icon = config.icon;
  const iconSize = compact ? 12 : 14;

  return (
    <View style={[styles.badge, { backgroundColor: config.bgColor }, compact && styles.compact]}>
      <Icon size={iconSize} color={config.color} />
      <Text style={[styles.badgeText, { color: config.color }, compact && styles.compactText]}>
        {config.label}
      </Text>
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.badge,
    alignSelf: 'flex-start',
    gap: 4,
  },
  checkIcon: {
    marginEnd: 2,
  },
  compact: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[0.5],
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  compactText: {
    fontSize: 10,
  },
});
