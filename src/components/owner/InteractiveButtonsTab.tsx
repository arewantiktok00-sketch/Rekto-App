import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronDown, ChevronUp, Save, CheckCircle2, AlertCircle, X } from 'lucide-react-native';
import { supabase } from '@/integrations/supabase/client';
import { getOwnerColors } from '@/theme/colors';
import { inputStyleRTL } from '@/utils/rtl';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/utils/toast';
import { spacing, borderRadius } from '@/theme/spacing';
import { getTypographyStyles } from '@/theme/typography';
import { Text } from '@/components/common/Text';

interface Advertiser {
  id: string;
  advertiser_id: string;
  name: string;
  nickname: string | null;
  business_center: string | null;
  status: string;
  interactive_button_kurdish: string | null;
  interactive_button_arabic: string | null;
  interactive_button_all: string | null;
}

interface EditedButtons {
  [advertiserId: string]: {
    kurdish: string;
    arabic: string;
    all: string;
  };
}

export function InteractiveButtonsTab() {
  const insets = useSafeAreaInsets();
  const themeColors = getOwnerColors();
  const { t, isRTL } = useLanguage();
  const colors = themeColors;
  const typography = getTypographyStyles('ckb');
  const styles = createStyles(colors, insets, typography, isRTL);
  const [loading, setLoading] = useState(true);
  const [advertisers, setAdvertisers] = useState<Advertiser[]>([]);
  const [editedButtons, setEditedButtons] = useState<EditedButtons>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    fetchAdvertisers();
  }, []);

  const fetchAdvertisers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('owner-advertisers-core', {
        body: { action: 'list' },
      });
      if (error) throw error;
      const fetchedAdvertisers = (data.advertisers || []) as Advertiser[];
      setAdvertisers(fetchedAdvertisers);
      const initialEdited: EditedButtons = {};
      fetchedAdvertisers.forEach((adv) => {
        initialEdited[adv.advertiser_id] = {
          kurdish: adv.interactive_button_kurdish || '',
          arabic: adv.interactive_button_arabic || '',
          all: adv.interactive_button_all || '',
        };
      });
      setEditedButtons(initialEdited);
    } catch (error: any) {
      console.error('Error fetching advertisers:', error);
      toast.error(t('error'), t('somethingWentWrong'));
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (advertiser: Advertiser) => {
    const buttons = editedButtons[advertiser.advertiser_id];
    if (!buttons) return null;
    const kurdishSet = buttons.kurdish.trim() !== '';
    const arabicSet = buttons.arabic.trim() !== '';
    const allSet = buttons.all.trim() !== '';
    const allSetCount = [kurdishSet, arabicSet, allSet].filter(Boolean).length;
    if (allSetCount === 3) {
      return (
        <View style={styles.statusBadge}>
          <CheckCircle2 size={12} color="#22C55E" />
          <Text style={[styles.statusBadgeText, styles.statusBadgeTextSuccess]}>
            All IDs Set
          </Text>
        </View>
      );
    } else if (allSetCount > 0) {
      return (
        <View style={styles.statusBadge}>
          <AlertCircle size={12} color="#F59E0B" />
          <Text style={[styles.statusBadgeText, styles.statusBadgeTextPartial]}>
            Partial
          </Text>
        </View>
      );
    } else {
      return (
        <View style={styles.statusBadge}>
          <X size={12} color={colors.foreground.muted} />
          <Text style={[styles.statusBadgeText, styles.statusBadgeTextNone]}>
            Not Configured
          </Text>
        </View>
      );
    }
  };

  const hasChanges = (advertiser: Advertiser): boolean => {
    const current = editedButtons[advertiser.advertiser_id];
    if (!current) return false;
    return (
      current.kurdish.trim() !== (advertiser.interactive_button_kurdish || '') ||
      current.arabic.trim() !== (advertiser.interactive_button_arabic || '') ||
      current.all.trim() !== (advertiser.interactive_button_all || '')
    );
  };

  const handleSave = async (advertiser: Advertiser) => {
    if (!hasChanges(advertiser)) {
      Alert.alert('No Changes', 'No changes to save');
      return;
    }
    try {
      setSavingId(advertiser.advertiser_id);
      const buttons = editedButtons[advertiser.advertiser_id];
      const { data, error } = await supabase.functions.invoke('owner-advertisers-buttons', {
        body: {
          action: 'updateInteractiveButtons',
          id: advertiser.id,
          interactive_button_kurdish: buttons.kurdish.trim() || null,
          interactive_button_arabic: buttons.arabic.trim() || null,
          interactive_button_all: buttons.all.trim() || null,
        },
      });
      if (error) throw error;
      if (data.success) {
        Alert.alert(
          'Saved',
          `Button IDs saved for ${advertiser.nickname || advertiser.name || advertiser.advertiser_id}`
        );
        fetchAdvertisers();
      } else {
        Alert.alert('Error', data.error || 'Failed to save');
      }
    } catch (error: any) {
      console.error('Error saving buttons:', error);
      toast.error(t('error'), t('somethingWentWrong'));
    } finally {
      setSavingId(null);
    }
  };

  const updateButtonValue = (advertiserId: string, type: 'kurdish' | 'arabic' | 'all', value: string) => {
    setEditedButtons((prev) => ({
      ...prev,
      [advertiserId]: {
        ...prev[advertiserId],
        [type]: value,
      },
    }));
  };

  const grouped = advertisers.reduce((acc, adv) => {
    const bc = adv.business_center || 'Ungrouped';
    if (!acc[bc]) acc[bc] = [];
    acc[bc].push(adv);
    return acc;
  }, {} as Record<string, Advertiser[]>);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>Loading advertisers...</Text>
      </View>
    );
  }

  if (advertisers.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No advertisers configured yet</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {Object.entries(grouped).map(([businessCenter, groupAdvertisers]) => (
        <View key={businessCenter} style={styles.groupSection}>
          <Text style={styles.groupHeader}>{businessCenter}</Text>
          {groupAdvertisers.map((advertiser) => {
            const isExpanded = expandedId === advertiser.advertiser_id;
            const buttons = editedButtons[advertiser.advertiser_id] || {
              kurdish: '',
              arabic: '',
              all: '',
            };
            const hasUnsavedChanges = hasChanges(advertiser);
            const isSaving = savingId === advertiser.advertiser_id;
            return (
              <View key={advertiser.advertiser_id} style={styles.advertiserCard}>
                <TouchableOpacity
                  style={styles.cardHeader}
                  onPress={() => setExpandedId(isExpanded ? null : advertiser.advertiser_id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardHeaderLeft}>
                    <Text style={styles.advertiserName}>
                      {advertiser.nickname || advertiser.name || advertiser.advertiser_id}
                    </Text>
                    <Text style={styles.advertiserId}>{advertiser.advertiser_id}</Text>
                  </View>
                  <View style={styles.cardHeaderRight}>
                    {getStatusBadge(advertiser)}
                    {isExpanded ? (
                      <ChevronUp size={20} color={colors.foreground.muted} />
                    ) : (
                      <ChevronDown size={20} color={colors.foreground.muted} />
                    )}
                  </View>
                </TouchableOpacity>
                {isExpanded && (
                  <View style={styles.expandedContent}>
                    <View style={styles.inputGroup}>
                      <View style={[styles.badge, styles.badgePurple]}>
                        <Text style={[styles.badgeText, { color: '#7C3AED' }]}>Kurdish</Text>
                      </View>
                      <TextInput
                        style={[styles.input, inputStyleRTL()]}
                        value={buttons.kurdish}
                        onChangeText={(value) =>
                          updateButtonValue(advertiser.advertiser_id, 'kurdish', value)
                        }
                        placeholder="e.g. 1798765432109876543"
                        placeholderTextColor={colors.input.placeholder}
                        keyboardType="number-pad"
                      />
                    </View>
                    <View style={styles.inputGroup}>
                      <View style={[styles.badge, styles.badgeBlue]}>
                        <Text style={[styles.badgeText, { color: '#3B82F6' }]}>Arabic</Text>
                      </View>
                      <TextInput
                        style={[styles.input, inputStyleRTL()]}
                        value={buttons.arabic}
                        onChangeText={(value) =>
                          updateButtonValue(advertiser.advertiser_id, 'arabic', value)
                        }
                        placeholder="e.g. 1798765432109876543"
                        placeholderTextColor={colors.input.placeholder}
                        keyboardType="number-pad"
                      />
                    </View>
                    <View style={styles.inputGroup}>
                      <View style={[styles.badge, styles.badgeGreen]}>
                        <Text style={[styles.badgeText, { color: '#22C55E' }]}>All</Text>
                      </View>
                      <TextInput
                        style={[styles.input, inputStyleRTL()]}
                        value={buttons.all}
                        onChangeText={(value) =>
                          updateButtonValue(advertiser.advertiser_id, 'all', value)
                        }
                        placeholder="e.g. 1798765432109876543"
                        placeholderTextColor={colors.input.placeholder}
                        keyboardType="number-pad"
                      />
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.saveButton,
                        (!hasUnsavedChanges || isSaving) && styles.saveButtonDisabled,
                      ]}
                      onPress={() => handleSave(advertiser)}
                      disabled={!hasUnsavedChanges || isSaving}
                    >
                      {isSaving ? (
                        <ActivityIndicator size="small" color={colors.primary.foreground} />
                      ) : (
                        <>
                          <Save size={16} color={colors.primary.foreground} />
                          <Text style={styles.saveButtonText}>Save</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
}

const createStyles = (colors: any, insets: any, typography: any, isRTL?: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.DEFAULT,
    },
    contentContainer: {
      padding: spacing.md,
      paddingBottom: insets.bottom + spacing.xl,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background.DEFAULT,
    },
    loadingText: {
      ...typography.body,
      marginTop: spacing.md,
      color: colors.foreground.muted,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background.DEFAULT,
      padding: spacing.xl,
    },
    emptyText: {
      ...typography.body,
      color: colors.foreground.muted,
      fontSize: 16,
    },
    groupSection: {
      marginBottom: spacing.xl,
    },
    groupHeader: {
      ...typography.h3,
      fontSize: 18,
      fontWeight: '700',
      color: colors.foreground.DEFAULT,
      marginBottom: spacing.md,
      paddingHorizontal: spacing.sm,
      textAlign: (isRTL ? 'right' : 'left') as 'left' | 'right',
    },
    advertiserCard: {
      backgroundColor: colors.card.background,
      borderRadius: borderRadius.card,
      borderWidth: 1,
      borderColor: colors.border.DEFAULT,
      marginBottom: spacing.md,
      overflow: 'hidden',
    },
    cardHeader: {
      flexDirection: 'row' as const,
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: spacing.md,
    },
    cardHeaderLeft: {
      flex: 1,
    },
    advertiserName: {
      ...typography.body,
      fontSize: 16,
      fontWeight: '600',
      color: colors.foreground.DEFAULT,
      marginBottom: 2,
      textAlign: (isRTL ? 'right' : 'left') as 'left' | 'right',
    },
    advertiserId: {
      ...typography.caption,
      fontSize: 12,
      fontFamily: 'monospace',
      color: colors.foreground.muted,
    },
    cardHeaderRight: {
      flexDirection: 'row' as const,
      alignItems: 'center',
      gap: spacing.sm,
    },
    statusBadge: {
      flexDirection: 'row' as const,
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: 999,
    },
    statusBadgeText: {
      ...typography.caption,
      fontSize: 11,
      fontWeight: '600',
    },
    statusBadgeTextSuccess: {
      color: '#22C55E',
    },
    statusBadgeTextPartial: {
      color: '#F59E0B',
    },
    statusBadgeTextNone: {
      color: colors.foreground.muted,
    },
    expandedContent: {
      padding: spacing.md,
      paddingTop: 0,
      gap: spacing.md,
    },
    inputGroup: {
      gap: spacing.xs,
    },
    badge: {
      alignSelf: 'flex-start',
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: 999,
    },
    badgePurple: {
      backgroundColor: 'rgba(124, 58, 237, 0.15)',
    },
    badgeBlue: {
      backgroundColor: 'rgba(59, 130, 246, 0.15)',
    },
    badgeGreen: {
      backgroundColor: 'rgba(34, 197, 94, 0.15)',
    },
    badgeText: {
      ...typography.caption,
      fontSize: 11,
      fontWeight: '700',
    },
    input: {
      backgroundColor: colors.input.background,
      borderWidth: 1,
      borderColor: colors.input.border,
      borderRadius: borderRadius.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      fontSize: 14,
      color: colors.foreground.DEFAULT,
      minHeight: 44,
    },
    saveButton: {
      flexDirection: 'row' as const,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      backgroundColor: colors.primary.DEFAULT,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: borderRadius.sm,
      alignSelf: 'flex-end',
      minWidth: 100,
    },
    saveButtonDisabled: {
      opacity: 0.5,
    },
    saveButtonText: {
      ...typography.body,
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary.foreground,
    },
  });
