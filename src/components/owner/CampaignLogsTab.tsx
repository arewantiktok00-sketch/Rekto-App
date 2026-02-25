import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { FileText, Clock, User, CheckCircle, XCircle, RefreshCw, Building2, AlertCircle } from 'lucide-react-native';
import { ownerApi } from '@/services/ownerApi';
import { spacing, borderRadius } from '@/theme/spacing';
import { format } from 'date-fns';
import { toast } from '@/utils/toast';
import { Text } from '@/components/common/Text';

interface CampaignLogsTabProps {
  colors: any;
  t: (key: string) => string;
}

interface LogEntry {
  id: string;
  campaign_id: string | null;
  campaign_title: string | null;
  user_name: string | null;
  user_email: string | null;
  advertiser_id: string;
  advertiser_name: string | null;
  business_center: string | null;
  action: string;
  details: Record<string, any> | null;
  admin_email: string | null;
  created_at: string;
}

export const CampaignLogsTab: React.FC<CampaignLogsTabProps> = ({ colors, t }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await ownerApi.getLogs(100);
      setLogs(data?.logs || []);
    } catch (err: any) {
      console.error('[CampaignLogs] Failed to fetch logs:', err);
      toast.error('Error', 'Something went wrong');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchLogs();
  };

  const getActionIcon = (action: string) => {
    if (action.includes('Sent to TikTok') || action.includes('Created')) {
      return <CheckCircle size={16} color="#22C55E" />;
    }
    if (action.includes('Rejected') || action.includes('Failed')) {
      return <XCircle size={16} color="#EF4444" />;
    }
    if (action.includes('Paused') || action.includes('Stopped')) {
      return <AlertCircle size={16} color="#F59E0B" />;
    }
    return <Clock size={16} color={colors.foreground.muted} />;
  };

  const getActionColor = (action: string) => {
    if (action.includes('Sent to TikTok') || action.includes('Created')) {
      return '#22C55E';
    }
    if (action.includes('Rejected') || action.includes('Failed')) {
      return '#EF4444';
    }
    if (action.includes('Paused') || action.includes('Stopped')) {
      return '#F59E0B';
    }
    return colors.primary.DEFAULT;
  };

  const styles = createStyles(colors);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary.DEFAULT} />
      }
    >
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>{t('campaignLogs') || 'Campaign Logs'}</Text>
          <TouchableOpacity onPress={handleRefresh} disabled={refreshing} style={styles.refreshButton}>
            <RefreshCw size={18} color={colors.primary.DEFAULT} style={{ transform: [{ rotate: refreshing ? '180deg' : '0deg' }] }} />
          </TouchableOpacity>
        </View>
        <Text style={styles.subtitle}>Audit trail of all campaign actions and account usage</Text>
      </View>

      {loading && logs.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
          <Text style={styles.loadingText}>Loading logs...</Text>
        </View>
      ) : logs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <FileText size={48} color={colors.foreground.muted} />
          <Text style={styles.emptyText}>No campaign logs found</Text>
          <Text style={styles.emptySubtext}>Logs will appear here as actions are performed</Text>
        </View>
      ) : (
        <View style={styles.logsList}>
          {logs.map((log) => (
            <View key={log.id} style={styles.logCard}>
              <View style={styles.logHeader}>
                {getActionIcon(log.action)}
                <View style={styles.logInfo}>
                  <Text style={styles.logAction} numberOfLines={1}>
                    {log.action}
                  </Text>
                  <Text style={styles.logTitle} numberOfLines={1}>
                    {log.campaign_title || 'Unknown Campaign'}
                  </Text>
                </View>
              </View>

              <View style={styles.logDetails}>
                {log.user_name || log.user_email ? (
                  <View style={styles.detailRow}>
                    <User size={14} color={colors.foreground.muted} />
                    <Text style={styles.detailText}>
                      {log.user_name || log.user_email || 'Unknown User'}
                    </Text>
                  </View>
                ) : null}

                {log.advertiser_name || log.business_center ? (
                  <View style={styles.detailRow}>
                    <Building2 size={14} color={colors.foreground.muted} />
                    <Text style={styles.detailText} numberOfLines={1}>
                      {log.advertiser_name || log.business_center || 'Unknown Account'}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.detailRow}>
                  <Clock size={14} color={colors.foreground.muted} />
                  <Text style={styles.detailText}>
                    {log.created_at
                      ? format(new Date(log.created_at), 'MMM dd, yyyy HH:mm')
                      : 'N/A'}
                  </Text>
                </View>
              </View>

              {log.details && Object.keys(log.details).length > 0 && (
                <View style={styles.detailsBox}>
                  <Text style={styles.detailsLabel}>Details:</Text>
                  <Text style={styles.detailsText} numberOfLines={3}>
                    {JSON.stringify(log.details, null, 2)}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.DEFAULT,
    },
    contentContainer: {
      padding: spacing.md,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: spacing.xl * 2,
    },
    loadingText: {
      marginTop: spacing.md,
      fontSize: 14,
      color: colors.foreground.muted,
    },
    header: {
      marginBottom: spacing.lg,
    },
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.foreground.DEFAULT,
    },
    refreshButton: {
      padding: spacing.xs,
      borderRadius: borderRadius.sm,
    },
    subtitle: {
      fontSize: 14,
      color: colors.foreground.muted,
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.xl * 2,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.foreground.DEFAULT,
      marginTop: spacing.md,
    },
    emptySubtext: {
      fontSize: 14,
      color: colors.foreground.muted,
      marginTop: spacing.xs,
      textAlign: 'center',
    },
    logsList: {
      gap: spacing.md,
    },
    logCard: {
      backgroundColor: colors.card.background,
      borderRadius: borderRadius.card,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border.DEFAULT,
    },
    logHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    logInfo: {
      flex: 1,
    },
    logAction: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.foreground.DEFAULT,
      marginBottom: 4,
    },
    logTitle: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.foreground.muted,
    },
    logDetails: {
      gap: spacing.xs,
      marginTop: spacing.sm,
      paddingTop: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border.DEFAULT,
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    detailText: {
      fontSize: 12,
      color: colors.foreground.muted,
      flex: 1,
    },
    detailsBox: {
      marginTop: spacing.sm,
      padding: spacing.sm,
      backgroundColor: colors.background.secondary,
      borderRadius: borderRadius.sm,
    },
    detailsLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.foreground.muted,
      marginBottom: spacing.xs / 2,
    },
    detailsText: {
      fontSize: 11,
      color: colors.foreground.DEFAULT,
      fontFamily: 'monospace',
    },
  });

