import React from 'react';
import { View, StyleSheet } from 'react-native';
import {
  Clock,
  CreditCard,
  FileCheck,
  CheckCircle,
  AlertCircle,
  XCircle,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { spacing, borderRadius } from '@/theme/spacing';
import { Text } from '@/components/common/Text';
import { translateCampaignStatus } from '@/utils/transactionCampaignTranslator';

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
  | 'failed'
  | 'deleted_external';

interface CampaignStatusBadgeProps {
  status: string;
  rejectionReason?: string | null;
  tiktokStatus?: string | null;
  compact?: boolean;
}

// Status configuration - icons/colors only; label comes from translateCampaignStatus
const statusConfig: Record<string, {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  color: string;
  bgColor: string;
}> = {
  waiting_for_admin: {
    icon: Clock,
    color: '#CA8A04',
    bgColor: 'rgba(234, 179, 8, 0.15)',
  },
  awaiting_payment: {
    icon: CreditCard,
    color: '#EA580C',
    bgColor: 'rgba(249, 115, 22, 0.15)',
  },
  verifying_payment: {
    icon: FileCheck,
    color: '#2563EB',
    bgColor: 'rgba(59, 130, 246, 0.15)',
  },
  pending: {
    icon: Clock,
    color: '#CA8A04',
    bgColor: 'rgba(234, 179, 8, 0.15)',
  },
  in_review: {
    icon: Clock,
    color: '#CA8A04',
    bgColor: 'rgba(234, 179, 8, 0.15)',
  },
  scheduled: {
    icon: Clock,
    color: '#CA8A04',
    bgColor: 'rgba(234, 179, 8, 0.15)',
  },
  active: {
    icon: CheckCircle,
    color: '#16A34A',
    bgColor: 'rgba(22, 163, 74, 0.15)',
  },
  running: {
    icon: CheckCircle,
    color: '#16A34A',
    bgColor: 'rgba(22, 163, 74, 0.15)',
  },
  paused: {
    icon: CheckCircle,
    color: '#2563EB',
    bgColor: 'rgba(59, 130, 246, 0.15)',
  },
  completed: {
    icon: CheckCircle,
    color: '#2563EB',
    bgColor: 'rgba(59, 130, 246, 0.15)',
  },
  failed: {
    icon: AlertCircle,
    color: '#DC2626',
    bgColor: 'rgba(220, 38, 38, 0.15)',
  },
  rejected: {
    icon: XCircle,
    color: '#DC2626',
    bgColor: 'rgba(220, 38, 38, 0.15)',
  },
  deleted_external: {
    icon: XCircle,
    color: '#6B7280',
    bgColor: 'rgba(107, 114, 128, 0.12)',
  },
};

export const CampaignStatusBadge: React.FC<CampaignStatusBadgeProps> = ({
  status,
  compact = false,
}) => {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const styles = createStyles(colors);

  const normalizedStatus = (status || '').toLowerCase();
  const displayStatus = normalizedStatus === 'paused' ? 'completed' : normalizedStatus;
  const config = statusConfig[displayStatus] || statusConfig.pending;

  const label = translateCampaignStatus(displayStatus, language as 'ckb' | 'ar');
  const Icon = config.icon;
  const iconSize = compact ? 12 : 14;

  return (
    <View style={[styles.badge, { backgroundColor: config.bgColor }, compact && styles.compact]}>
      <Icon size={iconSize} color={config.color} />
      <Text style={[styles.badgeText, { color: config.color }, compact && styles.compactText]}>
        {label}
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
