import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  FlatList,
  Image,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Switch,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, Trophy, Star, StarOff, X, Save, Eye } from 'lucide-react-native';
import { supabase } from '@/integrations/supabase/client';
import { Text } from '@/components/common/Text';
import { useAppSettingsRealtime } from '@/hooks/useAppSettingsRealtime';
import { getOwnerColors } from '@/theme/colors';
import { inputStyleRTL } from '@/utils/rtl';

interface Campaign {
  id: string;
  title: string;
  thumbnail_url: string | null;
  spend: number;
  views: number;
  user_name: string;
  is_featured: boolean;
  excluded_from_top_results: boolean;
  manual_rank: number | null;
}

const RANK_OPTIONS = [
  { label: 'Auto', value: 'auto' },
  { label: '#1', value: '1' },
  { label: '#2', value: '2' },
  { label: '#3', value: '3' },
  { label: '#4', value: '4' },
  { label: '#5', value: '5' },
  { label: '#6', value: '6' },
  { label: '#7', value: '7' },
  { label: '#8', value: '8' },
  { label: '#9', value: '9' },
  { label: '#10', value: '10' },
  { label: '#15', value: '15' },
  { label: '#20', value: '20' },
];

export const FeaturedAdManager: React.FC = () => {
  const colors = getOwnerColors();
  const styles = createStyles(colors);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [settingFeatured, setSettingFeatured] = useState<string | null>(null);
  const [settingRank, setSettingRank] = useState<string | null>(null);
  const [togglingExclusion, setTogglingExclusion] = useState<string | null>(null);
  const [rankModalCampaign, setRankModalCampaign] = useState<Campaign | null>(null);
  const [search, setSearch] = useState('');
  const [topResultsEnabled, setTopResultsEnabled] = useState(true);
  const [savingTopResults, setSavingTopResults] = useState(false);
  const [dirtyTopResults, setDirtyTopResults] = useState(false);

  useEffect(() => {
    fetchCampaigns();
    fetchGlobalSettings();
  }, []);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('featured-campaign', {
        body: { action: 'list' },
      });
      if (!error) {
        setCampaigns(data?.campaigns || []);
      }
    } catch (err) {
      console.error('[FeaturedAdManager] fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGlobalSettings = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('app-settings', {
        body: { action: 'get', key: 'global' },
      });
      if (!error && data?.settings?.value?.features) {
        const enabled = data.settings.value.features.featured_story_enabled ?? true;
        setTopResultsEnabled(Boolean(enabled));
        setDirtyTopResults(false);
      }
    } catch (err) {
      console.error('[FeaturedAdManager] global settings fetch error:', err);
    }
  };

  useAppSettingsRealtime({
    enabled: true,
    settingsKey: 'global',
    onUpdate: (payload) => {
      const settings = (payload?.new as any)?.value;
      const enabled = settings?.features?.featured_story_enabled ?? true;
      setTopResultsEnabled(Boolean(enabled));
      setDirtyTopResults(false);
    },
  });

  const handleSaveTopResults = async () => {
    setSavingTopResults(true);
    try {
      const { data: currentData, error: currentError } = await supabase.functions.invoke(
        'app-settings',
        {
          body: { action: 'get', key: 'global' },
        }
      );
      if (currentError) throw currentError;
      const currentSettings = currentData?.settings?.value || {};
      await supabase.functions.invoke('app-settings', {
        body: {
          action: 'update',
          key: 'global',
          value: {
            ...currentSettings,
            features: {
              ...(currentSettings.features || {}),
              featured_story_enabled: topResultsEnabled,
            },
          },
        },
      });
      setDirtyTopResults(false);
    } catch (err) {
      console.error('[FeaturedAdManager] save top results error:', err);
    } finally {
      setSavingTopResults(false);
    }
  };

  const handleSetFeatured = async (campaignId: string | null) => {
    setSettingFeatured(campaignId || 'clear');
    try {
      await supabase.functions.invoke('featured-campaign', {
        body: { action: 'set', campaignId },
      });
      setCampaigns((prev) =>
        prev.map((c) => ({
          ...c,
          is_featured: c.id === campaignId,
        }))
      );
    } catch (err) {
      console.error('[FeaturedAdManager] set error:', err);
    } finally {
      setSettingFeatured(null);
    }
  };

  const handleSetRank = async (campaignId: string, rankValue: string) => {
    setSettingRank(campaignId);
    try {
      const rank = rankValue === 'auto' ? null : parseInt(rankValue, 10);
      const { data, error } = await supabase.functions.invoke('featured-campaign', {
        body: { action: 'set_rank', campaignId, rank },
      });
      if (error) throw error;
      setCampaigns((prev) =>
        prev.map((c) =>
          c.id === campaignId
            ? { ...c, manual_rank: data?.manual_rank ?? rank }
            : c
        )
      );
    } catch (err) {
      console.error('[FeaturedAdManager] rank error:', err);
    } finally {
      setSettingRank(null);
      setRankModalCampaign(null);
    }
  };

  const handleToggleExclusion = async (campaignId: string) => {
    setTogglingExclusion(campaignId);
    try {
      const { data, error } = await supabase.functions.invoke('featured-campaign', {
        body: { action: 'toggle_exclusion', campaignId },
      });
      if (error) throw error;
      setCampaigns((prev) =>
        prev.map((c) =>
          c.id === campaignId
            ? { ...c, excluded_from_top_results: data?.excluded ?? !c.excluded_from_top_results }
            : c
        )
      );
    } catch (err) {
      console.error('[FeaturedAdManager] exclusion error:', err);
    } finally {
      setTogglingExclusion(null);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const filtered = useMemo(
    () =>
      campaigns.filter(
        (c) =>
          c.title.toLowerCase().includes(search.toLowerCase()) ||
          c.user_name.toLowerCase().includes(search.toLowerCase())
      ),
    [campaigns, search]
  );

  const featured = campaigns.find((c) => c.is_featured);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.toggleCard}>
        <View style={styles.toggleHeader}>
          <View style={styles.toggleTitleWrap}>
            <Eye size={18} color="#7C3AED" />
            <Text style={styles.toggleTitle}>Top Results Section</Text>
          </View>
          <Switch
            value={topResultsEnabled}
            onValueChange={(value) => {
              setTopResultsEnabled(value);
              setDirtyTopResults(true);
            }}
            trackColor={{ false: '#E5E7EB', true: '#7C3AED' }}
            thumbColor="#FAFAFA"
          />
        </View>
        <Text style={styles.toggleDescription}>
          Users can see Top Results on dashboard and leaderboard
        </Text>
        <TouchableOpacity
          style={[
            styles.saveToggleButton,
            (savingTopResults || !dirtyTopResults) && styles.saveButtonDisabled,
          ]}
          onPress={handleSaveTopResults}
          disabled={savingTopResults || !dirtyTopResults}
        >
          {savingTopResults ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Save size={16} color="#FFF" />
              <Text style={styles.saveToggleText}>Save Top Results Setting</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
      <LinearGradient
        colors={['rgba(124, 58, 237, 0.15)', 'rgba(124, 58, 237, 0.05)']}
        style={styles.featuredCard}
      >
        <View style={styles.cardHeader}>
          <Trophy size={20} color="#7C3AED" />
          <Text style={styles.cardTitle}>Current Featured Ad</Text>
        </View>
        {featured ? (
          <View style={styles.featuredContent}>
            {featured.thumbnail_url ? (
              <Image source={{ uri: featured.thumbnail_url }} style={styles.featuredThumb} />
            ) : (
              <View style={[styles.featuredThumb, styles.thumbPlaceholder]} />
            )}
            <View style={styles.featuredInfo}>
              <Text style={styles.featuredName} numberOfLines={1}>
                {featured.title}
              </Text>
              <Text style={styles.featuredUser}>By {featured.user_name}</Text>
            </View>
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={() => handleSetFeatured(null)}
              disabled={settingFeatured === 'clear'}
            >
              <X size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.noFeatured}>No featured ad selected</Text>
        )}
      </LinearGradient>

      <View style={styles.searchContainer}>
        <Search size={18} color="#A1A1AA" />
        <TextInput
          style={[styles.searchInput, inputStyleRTL()]}
          placeholder="Search campaigns..."
          placeholderTextColor="#A1A1AA"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.campaignItem, item.is_featured && styles.campaignFeatured]}>
            {item.thumbnail_url ? (
              <Image source={{ uri: item.thumbnail_url }} style={styles.campaignThumb} />
            ) : (
              <View style={[styles.campaignThumb, styles.thumbPlaceholder]} />
            )}
            <View style={styles.campaignInfo}>
              <Text style={styles.campaignTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.campaignUser}>{item.user_name}</Text>
              <View style={styles.campaignStats}>
                <Text style={styles.stat}>👁 {formatNumber(item.views)}</Text>
                <Text style={styles.stat}>💰 ${item.spend?.toFixed(0)}</Text>
              </View>
              <View style={styles.rankRow}>
                <TouchableOpacity
                  style={[
                    styles.rankSelector,
                    item.excluded_from_top_results && styles.rankSelectorDisabled,
                  ]}
                  onPress={() => setRankModalCampaign(item)}
                  disabled={settingRank === item.id || item.excluded_from_top_results}
                >
                  <Text style={styles.rankSelectorText}>
                    {item.manual_rank ? `#${item.manual_rank}` : 'Auto'}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.rankLabel}>
                  {item.manual_rank ? `Rank ${item.manual_rank}` : 'By Views'}
                </Text>
              </View>
              <View style={styles.visibilityRow}>
                <Text
                  style={[
                    styles.visibilityLabel,
                    item.excluded_from_top_results && styles.visibilityLabelHidden,
                  ]}
                >
                  {item.excluded_from_top_results ? 'Hidden' : 'Visible'}
                </Text>
                <Switch
                  value={!item.excluded_from_top_results}
                  onValueChange={() => handleToggleExclusion(item.id)}
                  disabled={togglingExclusion === item.id}
                  trackColor={{ false: '#6B7280', true: '#10B981' }}
                  thumbColor={colors.primary.foreground}
                />
              </View>
            </View>
            <TouchableOpacity
              style={[styles.featureBtn, item.is_featured && styles.featureBtnActive]}
              onPress={() => handleSetFeatured(item.is_featured ? null : item.id)}
              disabled={settingFeatured === item.id}
            >
              {settingFeatured === item.id ? (
                <ActivityIndicator size="small" color={colors.primary.foreground} />
              ) : (
                <>
                  {item.is_featured ? (
                    <StarOff size={14} color={colors.primary.foreground} />
                  ) : (
                    <Star size={14} color={colors.primary.foreground} />
                  )}
                  <Text style={styles.featureBtnText}>
                    {item.is_featured ? 'Remove' : 'Feature'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
        contentContainerStyle={styles.listContent}
      />

      <Modal
        visible={!!rankModalCampaign}
        transparent
        animationType="fade"
        onRequestClose={() => setRankModalCampaign(null)}
      >
        <View style={styles.rankModalBackdrop}>
          <View style={styles.rankModalCard}>
            <Text style={styles.rankModalTitle}>Select Rank</Text>
            <ScrollView contentContainerStyle={styles.rankOptions}>
              {RANK_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={styles.rankOption}
                  onPress={() =>
                    rankModalCampaign && handleSetRank(rankModalCampaign.id, option.value)
                  }
                >
                  <Text style={styles.rankOptionText}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.rankModalClose}
              onPress={() => setRankModalCampaign(null)}
            >
              <Text style={styles.rankModalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  featuredCard: {
    margin: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.3)',
  },
  toggleCard: {
    margin: 16,
    marginBottom: 0,
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.3)',
  },
  toggleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FAFAFA',
  },
  toggleDescription: {
    marginTop: 8,
    color: '#A1A1AA',
    fontSize: 12,
  },
  saveToggleButton: {
    marginTop: 12,
    backgroundColor: '#7C3AED',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveToggleText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 13,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#FAFAFA' },
  featuredContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featuredThumb: { width: 56, height: 56, borderRadius: 12, backgroundColor: '#1A1A2E' },
  thumbPlaceholder: { backgroundColor: 'rgba(161, 161, 170, 0.2)' },
  featuredInfo: { flex: 1 },
  featuredName: { fontSize: 14, fontWeight: '600', color: '#FAFAFA' },
  featuredUser: { fontSize: 12, color: '#A1A1AA' },
  clearBtn: { padding: 8, backgroundColor: 'rgba(239, 68, 68, 0.2)', borderRadius: 8 },
  noFeatured: { textAlign: 'center', color: '#A1A1AA', paddingVertical: 20 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A2E',
    marginHorizontal: 16,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchInput: { flex: 1, paddingVertical: 12, color: '#FAFAFA' },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  campaignItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  campaignFeatured: { borderWidth: 1, borderColor: '#7C3AED' },
  campaignThumb: { width: 48, height: 48, borderRadius: 10, backgroundColor: '#1A1A2E' },
  campaignInfo: { flex: 1 },
  campaignTitle: { fontSize: 13, fontWeight: '600', color: '#FAFAFA' },
  campaignUser: { fontSize: 11, color: '#A1A1AA' },
  campaignStats: { flexDirection: 'row', gap: 12, marginTop: 4 },
  stat: { fontSize: 11, color: '#A1A1AA' },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  rankSelector: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.4)',
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
  },
  rankSelectorDisabled: {
    opacity: 0.5,
  },
  rankSelectorText: {
    fontSize: 12,
    color: '#FAFAFA',
    fontWeight: '600',
  },
  rankLabel: {
    fontSize: 11,
    color: '#A1A1AA',
  },
  visibilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  visibilityLabel: {
    fontSize: 11,
    color: '#10B981',
  },
  visibilityLabelHidden: {
    color: '#EF4444',
  },
  featureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#7C3AED',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  featureBtnActive: { backgroundColor: '#6B7280' },
  featureBtnText: { fontSize: 12, color: colors.primary.foreground, fontWeight: '600' },
  rankModalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay.dark,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  rankModalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.3)',
  },
  rankModalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FAFAFA',
    marginBottom: 12,
  },
  rankOptions: {
    gap: 8,
  },
  rankOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.25)',
  },
  rankOptionText: {
    color: '#FAFAFA',
    fontSize: 13,
    fontWeight: '600',
  },
  rankModalClose: {
    marginTop: 12,
    alignSelf: 'flex-end',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  rankModalCloseText: {
    color: '#A1A1AA',
    fontSize: 12,
  },
});
