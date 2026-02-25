import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  FlatList,
  ScrollView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Shield,
  AlertTriangle,
  Building2,
  Key,
  Ban,
  CheckCircle,
  ChevronDown,
} from 'lucide-react-native';
import { ownerApi } from '@/services/ownerApi';
import { getOwnerColors } from '@/theme/colors';
import { spacing, borderRadius } from '@/theme/spacing';

type HealthStatus = 'active' | 'suspended' | 'action_needed' | 'disabled';

interface Advertiser {
  id: string;
  advertiser_id: string;
  name: string | null;
  nickname: string | null;
  business_center: string | null;
  is_active: boolean;
  status: string;
  max_active_ads: number;
  active_ads_count: number;
  has_token: boolean;
  health_status?: HealthStatus;
  health_reason?: string;
}

interface AdvertiserSelectorProps {
  selectedAdvertiserId: string | null;
  onSelect: (advertiserId: string) => void;
  disabled?: boolean;
}

export const AdvertiserSelector: React.FC<AdvertiserSelectorProps> = ({
  selectedAdvertiserId,
  onSelect,
  disabled = false,
}) => {
  const colors = getOwnerColors();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors, insets);

  const [advertisers, setAdvertisers] = useState<Advertiser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchAdvertisers();
  }, []);

  const fetchAdvertisers = async () => {
    try {
      const data = await ownerApi.listWithHealth();
      const advList = (data?.advertisers || []) as Advertiser[];
      setAdvertisers(advList);

      // Auto-select primary if nothing selected (only from healthy accounts)
      if (!selectedAdvertiserId && advList.length > 0) {
        const healthyAccounts = advList.filter(
          (a) => a.health_status === 'active' && a.status === 'active'
        );
        const primary = healthyAccounts.find((a) => a.is_active) || healthyAccounts[0];
        if (primary) onSelect(primary.advertiser_id);
      }
    } catch (err) {
      console.error('Failed to fetch advertisers:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter out suspended accounts from the list
  const healthyAdvertisers = advertisers.filter((a) => a.health_status !== 'suspended');

  const selectedAdv = advertisers.find((a) => a.advertiser_id === selectedAdvertiserId);

  const getHealthIcon = (health?: HealthStatus) => {
    switch (health) {
      case 'active':
        return <CheckCircle size={14} color="#22C55E" />;
      case 'action_needed':
        return <AlertTriangle size={14} color="#F59E0B" />;
      case 'disabled':
        return <Ban size={14} color={colors.foreground.muted} />;
      default:
        return null;
    }
  };

  const getCapacityColor = (used: number, max: number) => {
    const ratio = used / max;
    if (ratio >= 1) return { text: '#EF4444', bg: '#FEE2E2' };
    if (ratio >= 0.8) return { text: '#F59E0B', bg: '#FEF3C7' };
    return { text: '#22C55E', bg: '#D1FAE5' };
  };

  // Group by business center
  const groupedAdvertisers = healthyAdvertisers.reduce((acc, adv) => {
    const bc = adv.business_center || 'Other';
    if (!acc[bc]) acc[bc] = [];
    acc[bc].push(adv);
    return acc;
  }, {} as Record<string, Advertiser[]>);

  const suspendedCount = advertisers.filter((a) => a.health_status === 'suspended').length;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>Loading ad accounts...</Text>
      </View>
    );
  }

  if (healthyAdvertisers.length === 0) {
    return (
      <View style={styles.warningContainer}>
        <AlertTriangle size={16} color="#F59E0B" />
        <Text style={styles.warningText}>No healthy ad accounts available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Shield size={12} color={colors.foreground.muted} />
        <Text style={styles.label}>
          Select Ad Account ({healthyAdvertisers.length} available)
        </Text>
        {suspendedCount > 0 && (
          <Text style={styles.suspendedText}>({suspendedCount} suspended)</Text>
        )}
      </View>

      <TouchableOpacity
        style={[styles.selector, disabled && styles.selectorDisabled]}
        onPress={() => !disabled && setShowModal(true)}
        disabled={disabled}
      >
        {selectedAdv ? (
          <View style={styles.selectedContainer}>
            {getHealthIcon(selectedAdv.health_status)}
            <Text style={styles.selectedText} numberOfLines={1}>
              {selectedAdv.nickname || selectedAdv.name || selectedAdv.advertiser_id.slice(-8)}
            </Text>
            {selectedAdv.business_center && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{selectedAdv.business_center}</Text>
              </View>
            )}
          </View>
        ) : (
          <Text style={styles.placeholderText}>Choose ad account...</Text>
        )}
        <ChevronDown size={18} color={colors.foreground.muted} />
      </TouchableOpacity>

      {selectedAdvertiserId && selectedAdv && (
        <Text style={styles.hintText}>
          Campaign will be created on{' '}
          <Text style={styles.hintBold}>
            {selectedAdv.nickname || selectedAdv.name || 'this account'}
          </Text>
          {selectedAdv.business_center && ` (${selectedAdv.business_center})`}
          {selectedAdv.health_status === 'action_needed' && (
            <Text style={styles.warningHint}> ⚠️ Token may need refresh</Text>
          )}
        </Text>
      )}

      {/* Modal Picker */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
        statusBarTranslucent
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Ad Account</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Text style={styles.modalClose}>Done</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalList}
              contentContainerStyle={styles.modalListContent}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
            >
              {Object.entries(groupedAdvertisers).map(([bc, accounts]) => (
                <View key={bc} style={styles.groupSection}>
                  <View style={styles.groupHeader}>
                    <Building2 size={14} color={colors.foreground.muted} />
                    <Text style={styles.groupTitle}>
                      {bc} ({accounts.length})
                    </Text>
                  </View>
                  {accounts.map((adv) => {
                    const isFull = adv.active_ads_count >= adv.max_active_ads;
                    const isActionNeeded = adv.health_status === 'action_needed';
                    const isDisabled =
                      adv.status !== 'active' ||
                      isFull ||
                      !adv.has_token ||
                      adv.health_status === 'disabled';
                    const capacityColor = getCapacityColor(adv.active_ads_count, adv.max_active_ads);
                    const isSelected = selectedAdvertiserId === adv.advertiser_id;

                    return (
                      <TouchableOpacity
                        key={adv.id}
                        style={[
                          styles.accountItem,
                          isSelected && styles.accountItemSelected,
                          isDisabled && styles.accountItemDisabled,
                        ]}
                        onPress={() => {
                          if (!isDisabled) {
                            onSelect(adv.advertiser_id);
                            setShowModal(false);
                          }
                        }}
                        disabled={isDisabled}
                      >
                        <View style={styles.accountItemLeft}>
                          {getHealthIcon(adv.health_status)}
                          <View style={styles.accountItemInfo}>
                            <View style={styles.accountItemHeader}>
                              <Text
                                style={[
                                  styles.accountItemName,
                                  isSelected && styles.accountItemNameSelected,
                                ]}
                                numberOfLines={1}
                              >
                                {adv.nickname || adv.name || `Account ${adv.advertiser_id.slice(-6)}`}
                              </Text>
                              {adv.is_active && (
                                <View style={styles.primaryBadge}>
                                  <Text style={styles.primaryBadgeText}>Primary</Text>
                                </View>
                              )}
                              {isActionNeeded && (
                                <Text style={styles.actionNeededBadge}>⚠️</Text>
                              )}
                              {!adv.has_token && (
                                <Key size={12} color="#EF4444" />
                              )}
                            </View>
                            <Text style={styles.accountItemId} numberOfLines={1}>
                              {adv.advertiser_id}
                            </Text>
                          </View>
                        </View>
                        <View
                          style={[
                            styles.capacityBadge,
                            { backgroundColor: capacityColor.bg },
                          ]}
                        >
                          <Text style={[styles.capacityText, { color: capacityColor.text }]}>
                            {adv.active_ads_count}/{adv.max_active_ads}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const createStyles = (colors: any, insets: any) =>
  StyleSheet.create({
    container: {
      gap: spacing.xs,
    },
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      padding: spacing.sm,
    },
    loadingText: {
      fontSize: 12,
      color: colors.foreground.muted,
    },
    warningContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      padding: spacing.sm,
      backgroundColor: '#FEF3C7',
      borderRadius: borderRadius.sm,
    },
    warningText: {
      fontSize: 12,
      color: '#F59E0B',
    },
    labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginBottom: spacing.xs,
    },
    label: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.foreground.muted,
    },
    suspendedText: {
      color: '#EF4444',
    },
    selector: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.card.background || '#27272A',
      borderWidth: 1,
      borderColor: colors.border.DEFAULT,
      borderRadius: borderRadius.card || 12,
      padding: spacing.md,
      minHeight: 56,
    },
    selectorDisabled: {
      opacity: 0.5,
    },
    selectedContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      flex: 1,
    },
    selectedText: {
      fontSize: 14,
      color: colors.foreground.DEFAULT,
      flex: 1,
    },
    badge: {
      backgroundColor: colors.background.DEFAULT,
      paddingHorizontal: spacing.xs,
      paddingVertical: 2,
      borderRadius: borderRadius.xs,
      borderWidth: 1,
      borderColor: colors.border.DEFAULT,
    },
    badgeText: {
      fontSize: 10,
      color: colors.foreground.muted,
    },
    placeholderText: {
      fontSize: 14,
      color: colors.foreground.muted,
      flex: 1,
    },
    hintText: {
      fontSize: 11,
      color: colors.foreground.muted,
      marginTop: spacing.xs,
    },
    hintBold: {
      fontWeight: '600',
      color: colors.foreground.DEFAULT,
    },
    warningHint: {
      color: '#F59E0B',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.overlay.dark,
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.card.background,
      borderTopLeftRadius: borderRadius.card || 20,
      borderTopRightRadius: borderRadius.card || 20,
      height: '80%',
      maxHeight: '92%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 10,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.DEFAULT,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.foreground.DEFAULT,
    },
    modalClose: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.primary.DEFAULT,
    },
    modalList: {
      flex: 1,
    },
    modalListContent: {
      paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.xl,
    },
    groupSection: {
      marginBottom: spacing.md,
    },
    groupHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: colors.background.DEFAULT,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.DEFAULT,
    },
    groupTitle: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.foreground.muted,
    },
    accountItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.DEFAULT,
    },
    accountItemSelected: {
      backgroundColor: colors.primary.DEFAULT + '20',
    },
    accountItemDisabled: {
      opacity: 0.5,
    },
    accountItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      flex: 1,
    },
    accountItemInfo: {
      flex: 1,
    },
    accountItemHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginBottom: 2,
    },
    accountItemName: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.foreground.DEFAULT,
      flex: 1,
    },
    accountItemNameSelected: {
      color: colors.primary.DEFAULT,
      fontWeight: '600',
    },
    primaryBadge: {
      backgroundColor: colors.primary.DEFAULT + '20',
      paddingHorizontal: spacing.xs,
      paddingVertical: 2,
      borderRadius: borderRadius.xs,
    },
    primaryBadgeText: {
      fontSize: 9,
      color: colors.primary.DEFAULT,
      fontWeight: '600',
    },
    actionNeededBadge: {
      fontSize: 12,
    },
    accountItemId: {
      fontSize: 11,
      fontFamily: 'monospace',
      color: colors.foreground.muted,
    },
    capacityBadge: {
      paddingHorizontal: spacing.xs,
      paddingVertical: 4,
      borderRadius: borderRadius.xs,
    },
    capacityText: {
      fontSize: 11,
      fontWeight: '600',
    },
  });
