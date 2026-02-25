import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Users, Building2, CheckCircle, AlertTriangle } from 'lucide-react-native';
import { ownerApi } from '@/services/ownerApi';
import { spacing, borderRadius } from '@/theme/spacing';
import { toast } from '@/utils/toast';
import { Text } from '@/components/common/Text';

interface AdAccountsTabProps {
  colors: any;
  t: (key: string) => string;
}

export const AdAccountsTab: React.FC<AdAccountsTabProps> = ({ colors, t }) => {
  const [loading, setLoading] = useState(true);
  const [advertisers, setAdvertisers] = useState<any[]>([]);

  useEffect(() => {
    fetchAdvertisers();
  }, []);

  const fetchAdvertisers = async () => {
    try {
      const data = await ownerApi.listWithHealth();
      setAdvertisers(data?.advertisers || []);
    } catch (err) {
      console.error('Failed to fetch advertisers:', err);
    } finally {
      setLoading(false);
    }
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
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{t('adAccounts') || 'Ad Accounts'}</Text>
          <Text style={styles.subtitle}>Manage TikTok advertiser accounts</Text>
        </View>
      </View>

      {advertisers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Users size={48} color={colors.foreground.muted} />
          <Text style={styles.emptyText}>No advertiser accounts</Text>
        </View>
      ) : (
        <View style={styles.accountsList}>
          {advertisers.map((account) => (
            <View key={account.id} style={styles.accountCard}>
              <View style={styles.accountHeader}>
                <Building2 size={20} color={colors.primary.DEFAULT} />
                <View style={styles.accountInfo}>
                  <Text style={styles.accountName}>
                    {account.nickname || account.name || account.advertiser_id}
                  </Text>
                  <Text style={styles.accountId}>{account.advertiser_id}</Text>
                  {account.business_center && (
                    <Text style={styles.businessCenter}>{account.business_center}</Text>
                  )}
                </View>
                {account.is_active && (
                  <View style={styles.activeBadge}>
                    <CheckCircle size={16} color="#22C55E" />
                    <Text style={styles.activeText}>Primary</Text>
                  </View>
                )}
              </View>

              <View style={styles.metricsContainer}>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Status</Text>
                  <Text style={styles.metricValue}>{account.status || 'N/A'}</Text>
                </View>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Active Ads</Text>
                  <Text style={styles.metricValue}>
                    {account.active_ads_count || 0}/{account.max_active_ads || 0}
                  </Text>
                </View>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Health</Text>
                  <View style={styles.healthContainer}>
                    {account.health_status === 'active' ? (
                      <CheckCircle size={16} color="#22C55E" />
                    ) : (
                      <AlertTriangle size={16} color="#F59E0B" />
                    )}
                    <Text
                      style={[
                        styles.healthText,
                        {
                          color:
                            account.health_status === 'active' ? '#22C55E' : '#F59E0B',
                        },
                      ]}
                    >
                      {account.health_status || 'Unknown'}
                    </Text>
                  </View>
                </View>
              </View>
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
    },
    header: {
      marginBottom: spacing.lg,
    },
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.foreground.DEFAULT,
      marginBottom: spacing.xs,
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
    accountsList: {
      gap: spacing.md,
    },
    accountCard: {
      backgroundColor: colors.card.background,
      borderRadius: borderRadius.card,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border.DEFAULT,
    },
    accountHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    accountInfo: {
      flex: 1,
    },
    accountName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.foreground.DEFAULT,
      marginBottom: 2,
    },
    accountId: {
      fontSize: 12,
      fontFamily: 'monospace',
      color: colors.foreground.muted,
      marginBottom: 2,
    },
    businessCenter: {
      fontSize: 12,
      color: colors.primary.DEFAULT,
    },
    activeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      backgroundColor: '#22C55E' + '20',
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: borderRadius.sm,
    },
    activeText: {
      fontSize: 11,
      fontWeight: '600',
      color: '#22C55E',
    },
    metricsContainer: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    metric: {
      flex: 1,
    },
    metricLabel: {
      fontSize: 12,
      color: colors.foreground.muted,
      marginBottom: 4,
    },
    metricValue: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.foreground.DEFAULT,
    },
    healthContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    healthText: {
      fontSize: 14,
      fontWeight: '600',
    },
  });

