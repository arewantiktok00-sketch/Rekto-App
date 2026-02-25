import { Text } from '@/components/common/Text';
import { supabaseRead } from '@/integrations/supabase/client';
import { ownerApi } from '@/services/ownerApi';
import { borderRadius, spacing } from '@/theme/spacing';
import { inputStyleRTL, isRTL, rtlText } from '@/utils/rtl';
import { toast } from '@/utils/toast';
import Slider from '@react-native-community/slider';
import { Activity as ActivityIcon, AlertTriangle, BarChart3, CheckCircle, DollarSign, Edit2, Heart, Minus, Plus, Power, RefreshCw, Save, X, XCircle } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

const MIN_MAX_ADS = 1;
const MAX_MAX_ADS = 50;
const TAP_TARGET_MIN = 44;

interface AccountHealthTabProps {
  colors: any;
  t: (key: string) => string;
  language?: string;
}

export const AccountHealthTab: React.FC<AccountHealthTabProps> = ({ colors, t, language = 'ckb' }) => {
  const rtl = isRTL(language);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [healthData, setHealthData] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingMaxAdsId, setEditingMaxAdsId] = useState<string | null>(null);
  const [editMaxAdsValue, setEditMaxAdsValue] = useState<number>(10);
  const [savingMaxAds, setSavingMaxAds] = useState(false);

  useEffect(() => {
    fetchHealthData();
  }, []);

  const fetchHealthData = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const data = await ownerApi.listWithHealth();
      const advertisers = data?.advertisers || [];

      // Fetch campaign stats for each advertiser
      const advertisersWithStats = await Promise.all(
        advertisers.map(async (advertiser: any) => {
          // Get total campaigns count
          const { count: totalCampaigns } = await supabaseRead
            .from('campaigns')
            .select('*', { count: 'exact', head: true })
            .eq('assigned_advertiser_id', advertiser.advertiser_id);

          // Get total spend
          const { data: campaigns } = await supabaseRead
            .from('campaigns')
            .select('spend')
            .eq('assigned_advertiser_id', advertiser.advertiser_id)
            .not('spend', 'is', null);

          const totalSpend = campaigns?.reduce((sum, c) => sum + (c.spend || 0), 0) || 0;

          return {
            ...advertiser,
            total_campaigns: totalCampaigns || 0,
            total_spend: totalSpend,
          };
        })
      );

      setHealthData(advertisersWithStats);
    } catch (err) {
      console.error('Failed to fetch health data:', err);
      toast.error('Error', 'Something went wrong');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchHealthData(true);
  };

  const getHealthStatus = (status?: string) => {
    switch (status) {
      case 'active':
        return { icon: CheckCircle, color: '#22C55E', label: 'Active' };
      case 'action_needed':
        return { icon: AlertTriangle, color: '#F59E0B', label: 'Action Needed' };
      case 'suspended':
        return { icon: XCircle, color: '#EF4444', label: 'Suspended' };
      case 'disabled':
        return { icon: XCircle, color: '#6B7280', label: 'Disabled' };
      default:
        return { icon: ActivityIcon, color: '#6B7280', label: 'Unknown' };
    }
  };

  // Calculate overview stats
  const overviewStats = {
    total: healthData.length,
    active: healthData.filter((a) => a.health_status === 'active').length,
    suspended: healthData.filter((a) => a.health_status === 'suspended').length,
    actionNeeded: healthData.filter((a) => a.health_status === 'action_needed').length,
    disabled: healthData.filter((a) => a.health_status === 'disabled').length,
  };

  const startEditing = (account: any) => {
    setEditingId(account.id);
    setEditName(account.nickname || account.name || '');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName('');
  };

  const saveName = async (accountId: string) => {
    if (!editName.trim()) {
      toast.error('Error', 'Something went wrong');
      return;
    }

    setSaving(true);
    try {
      const data = await ownerApi.updateName(accountId, editName.trim());

      toast.success('Success', 'Operation completed');

      // Update local state
      setHealthData((prev) =>
        prev.map((acc) =>
          acc.id === accountId ? { ...acc, nickname: editName.trim() } : acc
        )
      );

      cancelEditing();
    } catch (err: any) {
      toast.error('Error', 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const startEditingMaxAds = (account: any) => {
    setEditingMaxAdsId(account.id);
    setEditMaxAdsValue(Math.min(MAX_MAX_ADS, Math.max(MIN_MAX_ADS, account.max_active_ads || 10)));
  };

  const cancelEditingMaxAds = () => {
    setEditingMaxAdsId(null);
  };

  const saveMaxAds = async (accountId: string) => {
    const value = Math.round(editMaxAdsValue);
    if (value < MIN_MAX_ADS || value > MAX_MAX_ADS) {
      toast.error('Error', `Max ads must be between ${MIN_MAX_ADS} and ${MAX_MAX_ADS}`);
      return;
    }

    setSavingMaxAds(true);
    try {
      await ownerApi.updateMaxAds(accountId, value);
      toast.success('Success', 'Max ads updated');

      setHealthData((prev) =>
        prev.map((acc) =>
          acc.id === accountId ? { ...acc, max_active_ads: value } : acc
        )
      );
      setEditingMaxAdsId(null);
    } catch (err: any) {
      toast.error('Error', 'Failed to update max ads');
    } finally {
      setSavingMaxAds(false);
    }
  };

  const markAsActive = async (account: any) => {
    setSaving(true);
    try {
      // Update status to active
      const data = await ownerApi.updateStatus(account.id, 'active');

      toast.success('Success', 'Operation completed');

      // Refresh data
      fetchHealthData(true);
    } catch (err: any) {
      toast.error('Error', 'Something went wrong');
    } finally {
      setSaving(false);
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
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={true}
    >
      {/* Top section title — Account Health (en / ckb / ar) */}
      <View style={[styles.topTitleRow, rtl && { alignItems: 'flex-end' }]}>
        <Text style={[styles.topTitleText, rtlText(), rtl && { fontFamily: 'Rabar_021' }]}>
          {t('accountHealth') || 'Account Health'}
        </Text>
      </View>

      {/* Overview Section */}
      <View style={styles.overviewCard}>
        <View style={styles.overviewHeader}>
          <View style={styles.overviewTitleRow}>
            <Heart size={20} color={colors.primary.DEFAULT} />
            <Text style={[styles.overviewTitle, rtlText(), rtl && { fontFamily: 'Rabar_021' }]}>
              {t('accountHealthOverview') || 'Account Health Overview'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw
              size={16}
              color={colors.primary.DEFAULT}
              style={refreshing && { transform: [{ rotate: '180deg' }] }}
            />
            <Text style={[styles.refreshButtonText, rtlText(), rtl && { fontFamily: 'Rabar_021' }]}>Refresh</Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.overviewSubtitle, rtlText(), rtl && { fontFamily: 'Rabar_021' }]}>
          {(t('accountHealthOverviewSubtitle') || 'Monitor the status of all {count} TikTok Ad Accounts').replace('{count}', String(overviewStats.total))}
        </Text>


        {/* Stats Cards */}
          <View style={[styles.statOverviewCard, { backgroundColor: '#22C55E' + '15' }]}>
            <CheckCircle size={24} color="#22C55E" />
            <Text style={[styles.statOverviewNumber, { color: '#22C55E' }]}>
              {overviewStats.active}
            </Text>
            <Text style={[styles.statOverviewLabel, rtlText(), rtl && { fontFamily: 'Rabar_021' }]}>Active</Text>
          </View>

          <View style={[styles.statOverviewCard, { backgroundColor: '#EF4444' + '15' }]}>
            <XCircle size={24} color="#EF4444" />
            <Text style={[styles.statOverviewNumber, { color: '#EF4444' }]}>
              {overviewStats.suspended}
            </Text>
            <Text style={[styles.statOverviewLabel, rtlText(), rtl && { fontFamily: 'Rabar_021' }]}>Suspended</Text>
          </View>

          <View style={[styles.statOverviewCard, { backgroundColor: '#F59E0B' + '15' }]}>
            <AlertTriangle size={24} color="#F59E0B" />
            <Text style={[styles.statOverviewNumber, { color: '#F59E0B' }]}>
              {overviewStats.actionNeeded}
            </Text>
            <Text style={[styles.statOverviewLabel, rtlText(), rtl && { fontFamily: 'Rabar_021' }]}>Action Needed</Text>
          </View>

          <View style={[styles.statOverviewCard, { backgroundColor: '#6B7280' + '15' }]}>
            <XCircle size={24} color="#6B7280" />
            <Text style={[styles.statOverviewNumber, { color: '#6B7280' }]}>
              {overviewStats.disabled}
            </Text>
            <Text style={[styles.statOverviewLabel, rtlText(), rtl && { fontFamily: 'Rabar_021' }]}>Disabled</Text>
          </View>
      </View>

      {/* Accounts List Header */}
      <View style={[styles.sectionHeader, rtl && { alignItems: 'flex-end' }]}>
        <Text style={[styles.sectionTitle, rtlText(), rtl && { fontFamily: 'Rabar_021' }]}>Account Details</Text>
      </View>

      {healthData.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, rtlText(), rtl && { fontFamily: 'Rabar_021' }]}>No accounts found</Text>
        </View>
      ) : (
        <View style={styles.accountsList}>
          {healthData.map((account) => {
            const status = getHealthStatus(account.health_status);
            const StatusIcon = status.icon;

            return (
              <View key={account.id} style={styles.accountCard}>
                <View style={styles.accountHeader}>
                  <StatusIcon size={20} color={status.color} />
                  <View style={styles.accountInfo}>
                    {editingId === account.id ? (
                      <View style={styles.editContainer}>
                        <TextInput
                          style={[styles.nameInput, inputStyleRTL()]}
                          value={editName}
                          onChangeText={setEditName}
                          placeholder="Enter account name"
                          placeholderTextColor={colors.foreground.muted}
                          autoFocus
                        />
                        <View style={styles.editActions}>
                          <TouchableOpacity
                            style={styles.saveButton}
                            onPress={() => saveName(account.id)}
                            disabled={saving}
                          >
                            <Save size={16} color={colors.primary.foreground} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={cancelEditing}
                            disabled={saving}
                          >
                            <X size={16} color={colors.foreground.DEFAULT} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <>
                        <View style={styles.nameRow}>
                          <Text style={styles.accountName}>
                            {account.nickname || account.name || account.advertiser_id}
                          </Text>
                          <TouchableOpacity
                            style={styles.editIconButton}
                            onPress={() => startEditing(account)}
                          >
                            <Edit2 size={16} color={colors.primary.DEFAULT} />
                          </TouchableOpacity>
                        </View>
                        <Text style={styles.accountId}>{account.advertiser_id}</Text>
                      </>
                    )}
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
                    <Text style={[styles.statusText, { color: status.color }]}>
                      {status.label}
                    </Text>
                  </View>
                </View>

                {account.health_reason && (
                  <View style={[styles.reasonContainer, rtl && { alignItems: 'flex-end' }]}>
                    <Text style={[styles.reasonLabel, rtlText(), rtl && { fontFamily: 'Rabar_021' }]}>Reason:</Text>
                    <Text style={[styles.reasonText, rtlText(), rtl && { fontFamily: 'Rabar_021' }]}>{account.health_reason}</Text>
                  </View>
                )}

                {account.health_status === 'action_needed' && (
                  <View style={styles.actionButtonsContainer}>
                    <TouchableOpacity
                      style={styles.markActiveButton}
                      onPress={() => markAsActive(account)}
                      disabled={saving}
                    >
                      <Power size={16} color={colors.primary.foreground} />
                      <Text style={[styles.markActiveButtonText, rtlText(), rtl && { fontFamily: 'Rabar_021' }]}>Mark as Active</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.statsContainer}>
                  <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                      <View style={styles.statIconContainer}>
                        <BarChart3 size={18} color={colors.primary.DEFAULT} />
                      </View>
                      <View style={[styles.statContent, rtl && { alignItems: 'flex-end' }]}>
                        <Text style={[styles.statLabel, rtlText(), rtl && { fontFamily: 'Rabar_021' }]}>Total Campaigns</Text>
                        <Text style={styles.statValue}>{account.total_campaigns || 0}</Text>
                      </View>
                    </View>

                    <View style={styles.statCard}>
                      <View style={[styles.statIconContainer, { backgroundColor: '#22C55E' + '20' }]}>
                        <DollarSign size={18} color="#22C55E" />
                      </View>
                      <View style={[styles.statContent, rtl && { alignItems: 'flex-end' }]}>
                        <Text style={[styles.statLabel, rtlText(), rtl && { fontFamily: 'Rabar_021' }]}>Total Spend</Text>
                        <Text style={[styles.statValue, { color: '#22C55E' }]}>
                          ${(account.total_spend || 0).toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Max Ads: prominent control */}
                  <View style={[styles.maxAdsSection, rtl && { alignItems: 'flex-end' }]}>
                    <Text style={[styles.maxAdsLabel, rtlText(), rtl && { fontFamily: 'Rabar_021' }]}>Max Ads:</Text>
                    <Text style={[styles.maxAdsUsage, rtlText()]}>
                      {account.active_ads_count ?? 0} active / {account.max_active_ads ?? 0} max
                    </Text>
                    {editingMaxAdsId === account.id ? (
                      <View style={styles.maxAdsEditor}>
                        <View style={styles.maxAdsStepper}>
                          <Pressable
                            style={({ pressed }) => [styles.maxAdsStepperButton, pressed && styles.maxAdsStepperButtonPressed]}
                            onPress={() => setEditMaxAdsValue((v) => Math.max(MIN_MAX_ADS, v - 1))}
                          >
                            <Minus size={20} color={colors.primary.DEFAULT} />
                          </Pressable>
                          <TextInput
                            style={[styles.maxAdsInput, inputStyleRTL()]}
                            value={String(Math.round(editMaxAdsValue))}
                            onChangeText={(txt) => {
                              const n = parseInt(txt, 10);
                              if (!isNaN(n)) setEditMaxAdsValue(Math.min(MAX_MAX_ADS, Math.max(MIN_MAX_ADS, n)));
                            }}
                            keyboardType="number-pad"
                            selectTextOnFocus
                          />
                          <Pressable
                            style={({ pressed }) => [styles.maxAdsStepperButton, pressed && styles.maxAdsStepperButtonPressed]}
                            onPress={() => setEditMaxAdsValue((v) => Math.min(MAX_MAX_ADS, v + 1))}
                          >
                            <Plus size={20} color={colors.primary.DEFAULT} />
                          </Pressable>
                        </View>
                        <Slider
                          style={styles.maxAdsSlider}
                          minimumValue={MIN_MAX_ADS}
                          maximumValue={MAX_MAX_ADS}
                          step={1}
                          value={editMaxAdsValue}
                          onValueChange={setEditMaxAdsValue}
                          minimumTrackTintColor={colors.primary.DEFAULT}
                          maximumTrackTintColor={colors.border.DEFAULT}
                          thumbTintColor={colors.primary.DEFAULT}
                        />
                        <View style={styles.maxAdsEditorActions}>
                          <TouchableOpacity
                            style={styles.maxAdsCancelButton}
                            onPress={cancelEditingMaxAds}
                            disabled={savingMaxAds}
                          >
                            <X size={18} color={colors.foreground.DEFAULT} />
                            <Text style={[styles.maxAdsCancelText, rtlText(), rtl && { fontFamily: 'Rabar_021' }]}>Cancel</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.maxAdsSaveButton, savingMaxAds && styles.maxAdsSaveButtonDisabled]}
                            onPress={() => saveMaxAds(account.id)}
                            disabled={savingMaxAds}
                          >
                            <Save size={18} color={colors.primary.foreground} />
                            <Text style={[styles.maxAdsSaveText, rtlText(), rtl && { fontFamily: 'Rabar_021' }]}>Save</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.maxAdsEditTrigger}
                        onPress={() => startEditingMaxAds(account)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.maxAdsEditTriggerText, rtlText(), rtl && { fontFamily: 'Rabar_021' }]}>
                          Set max: {account.max_active_ads ?? 0} (tap to edit)
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.metricsContainer}>
                    <View style={[styles.metric, rtl && { alignItems: 'flex-end' }]}>
                      <Text style={[styles.metricLabel, rtlText(), rtl && { fontFamily: 'Rabar_021' }]}>Status</Text>
                      <Text style={styles.metricValue}>{account.status || 'N/A'}</Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
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
      paddingBottom: spacing.xl,
      flexGrow: 1,
    },
    topTitleRow: {
      marginBottom: spacing.md,
      alignSelf: 'stretch',
    },
    topTitleText: {
      fontSize: 20,
      fontFamily: 'Poppins-SemiBold',
      color: colors.foreground.DEFAULT,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    overviewCard: {
      backgroundColor: colors.card.background,
      borderRadius: borderRadius.card,
      padding: spacing.md,
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border.DEFAULT,
    },
    overviewHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    overviewTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    overviewTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.foreground.DEFAULT,
    },
    overviewSubtitle: {
      fontSize: 14,
      color: colors.foreground.muted,
      marginBottom: spacing.md,
    },
    refreshButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.sm,
      backgroundColor: colors.background.DEFAULT,
      borderWidth: 1,
      borderColor: colors.border.DEFAULT,
    },
    refreshButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary.DEFAULT,
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    statOverviewCard: {
      flex: 1,
      minWidth: '45%',
      padding: spacing.md,
      borderRadius: borderRadius.card,
      alignItems: 'center',
      gap: spacing.xs,
    },
    statOverviewNumber: {
      fontSize: 28,
      fontWeight: '700',
    },
    statOverviewLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.foreground.muted,
    },
    sectionHeader: {
      marginBottom: spacing.md,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.foreground.DEFAULT,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: spacing.xl,
    },
    emptyText: {
      fontSize: 16,
      color: colors.foreground.muted,
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
      marginBottom: spacing.sm,
    },
    accountInfo: {
      flex: 1,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginBottom: 2,
    },
    accountName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.foreground.DEFAULT,
      flex: 1,
    },
    editIconButton: {
      padding: spacing.xs,
    },
    editContainer: {
      flex: 1,
      gap: spacing.xs,
    },
    nameInput: {
      backgroundColor: colors.background.DEFAULT,
      borderWidth: 1,
      borderColor: colors.border.DEFAULT,
      borderRadius: borderRadius.sm,
      padding: spacing.sm,
      fontSize: 16,
      color: colors.foreground.DEFAULT,
    },
    editActions: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    saveButton: {
      backgroundColor: colors.primary.DEFAULT,
      padding: spacing.xs,
      borderRadius: borderRadius.sm,
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelButton: {
      backgroundColor: colors.background.DEFAULT,
      borderWidth: 1,
      borderColor: colors.border.DEFAULT,
      padding: spacing.xs,
      borderRadius: borderRadius.sm,
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    accountId: {
      fontSize: 12,
      fontFamily: 'monospace',
      color: colors.foreground.muted,
    },
    statusBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: borderRadius.sm,
    },
    statusText: {
      fontSize: 11,
      fontWeight: '600',
    },
    reasonContainer: {
      backgroundColor: colors.background.DEFAULT,
      padding: spacing.sm,
      borderRadius: borderRadius.sm,
      marginBottom: spacing.sm,
    },
    reasonLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.foreground.muted,
      marginBottom: spacing.xs,
    },
    reasonText: {
      fontSize: 12,
      color: colors.foreground.DEFAULT,
    },
    statsContainer: {
      marginTop: spacing.sm,
      gap: spacing.md,
    },
    statsRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.background.DEFAULT,
      borderRadius: borderRadius.sm,
      padding: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border.DEFAULT,
    },
    statIconContainer: {
      width: 36,
      height: 36,
      borderRadius: borderRadius.sm,
      backgroundColor: colors.primary.DEFAULT + '20',
      alignItems: 'center',
      justifyContent: 'center',
    },
    statContent: {
      flex: 1,
    },
    statLabel: {
      fontSize: 11,
      color: colors.foreground.muted,
      marginBottom: 2,
    },
    statValue: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.foreground.DEFAULT,
    },
    maxAdsSection: {
      marginTop: spacing.md,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
      backgroundColor: colors.background.DEFAULT,
      borderRadius: borderRadius.sm,
      borderWidth: 1,
      borderColor: colors.border.DEFAULT,
    },
    maxAdsLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.foreground.DEFAULT,
      marginBottom: 4,
    },
    maxAdsUsage: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.primary.DEFAULT,
      marginBottom: spacing.sm,
    },
    maxAdsEditor: {
      gap: spacing.sm,
    },
    maxAdsStepper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    maxAdsStepperButton: {
      minWidth: TAP_TARGET_MIN,
      minHeight: TAP_TARGET_MIN,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary.DEFAULT + '20',
      borderRadius: borderRadius.sm,
    },
    maxAdsStepperButtonPressed: {
      opacity: 0.8,
    },
    maxAdsInput: {
      flex: 1,
      minHeight: TAP_TARGET_MIN,
      fontSize: 18,
      fontWeight: '700',
      color: colors.foreground.DEFAULT,
      textAlign: 'center',
    },
    maxAdsSlider: {
      width: '100%',
      height: 40,
    },
    maxAdsEditorActions: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
    maxAdsCancelButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      minHeight: TAP_TARGET_MIN,
      backgroundColor: colors.background.DEFAULT,
      borderWidth: 1,
      borderColor: colors.border.DEFAULT,
      borderRadius: borderRadius.sm,
    },
    maxAdsCancelText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.foreground.DEFAULT,
    },
    maxAdsSaveButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      minHeight: TAP_TARGET_MIN,
      backgroundColor: colors.primary.DEFAULT,
      borderRadius: borderRadius.sm,
    },
    maxAdsSaveButtonDisabled: {
      opacity: 0.6,
    },
    maxAdsSaveText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.primary.foreground,
    },
    maxAdsEditTrigger: {
      minHeight: TAP_TARGET_MIN,
      justifyContent: 'center',
      paddingVertical: spacing.sm,
    },
    maxAdsEditTriggerText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.primary.DEFAULT,
    },
    metricsContainer: {
      flexDirection: 'row',
      gap: spacing.md,
      marginTop: spacing.xs,
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
      fontSize: 16,
      fontWeight: '600',
      color: colors.foreground.DEFAULT,
    },
    actionButtonsContainer: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    markActiveButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      backgroundColor: '#22C55E',
      padding: spacing.sm,
      borderRadius: borderRadius.sm,
    },
    markActiveButtonText: {
      color: colors.primary.foreground,
      fontSize: 14,
      fontWeight: '600',
    },
  });

