import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRemoteConfig } from '@/contexts/RemoteConfigContext';
import { supabaseRead } from '@/integrations/supabase/client';
import { StatCard } from '@/components/common/StatCard';
import { Eye, MousePointer, DollarSign, Target, AlertCircle } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { spacing, borderRadius } from '@/theme/spacing';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { Text } from '@/components/common/Text';

type DateFilter = '7d' | '30d' | '90d';

interface CampaignStats {
  id: string;
  title: string;
  views: number;
  clicks: number;
  leads: number;
  spend: number;
  status: string;
}

export function Analytics() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { settings: config } = useRemoteConfig();
  const { t, language, isRTL } = useLanguage();
  const { colors } = useTheme();
  const styles = createStyles(colors, insets, isRTL);
  
  // Check if analytics feature is disabled
  const isDisabled = config && !config.features?.analytics_enabled;
  const [dateFilter, setDateFilter] = useState<DateFilter>('7d');
  const [campaigns, setCampaigns] = useState<CampaignStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalViews: 0,
    totalClicks: 0,
    totalLeads: 0,
    totalSpend: 0,
    ctr: '0',
  });

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user, dateFilter]);

  const fetchAnalytics = async () => {
    if (!user) return;

    try {
      const { data } = await supabaseRead
        .from('campaigns')
        .select('id, title, views, clicks, leads, spend, status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (data) {
        const processed = data.map(c => ({
          ...c,
          views: c.views || 0,
          clicks: c.clicks || 0,
          leads: c.leads || 0,
          spend: Number(c.spend) || 0,
        }));
        setCampaigns(processed);

        const totalViews = processed.reduce((sum, c) => sum + c.views, 0);
        const totalClicks = processed.reduce((sum, c) => sum + c.clicks, 0);
        const totalLeads = processed.reduce((sum, c) => sum + c.leads, 0);
        const totalSpend = processed.reduce((sum, c) => sum + c.spend, 0);
        const ctr = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(2) : '0';

        setStats({ totalViews, totalClicks, totalLeads, totalSpend, ctr });
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const weeklyData = [
    { date: 'Mon', views: Math.round(stats.totalViews * 0.1), spend: Math.round(stats.totalSpend * 0.1) },
    { date: 'Tue', views: Math.round(stats.totalViews * 0.12), spend: Math.round(stats.totalSpend * 0.12) },
    { date: 'Wed', views: Math.round(stats.totalViews * 0.11), spend: Math.round(stats.totalSpend * 0.11) },
    { date: 'Thu', views: Math.round(stats.totalViews * 0.15), spend: Math.round(stats.totalSpend * 0.15) },
    { date: 'Fri', views: Math.round(stats.totalViews * 0.18), spend: Math.round(stats.totalSpend * 0.18) },
    { date: 'Sat', views: Math.round(stats.totalViews * 0.2), spend: Math.round(stats.totalSpend * 0.2) },
    { date: 'Sun', views: Math.round(stats.totalViews * 0.14), spend: Math.round(stats.totalSpend * 0.14) },
  ];

  const chartData = {
    labels: weeklyData.map(d => d.date),
    datasets: [
      {
        data: weeklyData.map(d => d.views),
        color: (opacity = 1) => `rgba(124, 58, 237, ${opacity})`,
        strokeWidth: 2,
      },
    ],
  };

  const spendChartData = {
    labels: weeklyData.map(d => d.date),
    datasets: [
      {
        data: weeklyData.map(d => d.spend),
      },
    ],
  };

  const dateFilters: { value: DateFilter; labelKey: string }[] = [
    { value: '7d', labelKey: 'last7Days' },
    { value: '30d', labelKey: 'last30Days' },
    { value: '90d', labelKey: 'last90Days' },
  ];

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('analytics')} onBack={() => navigation.goBack()} style={{ paddingTop: insets.top + 16 }} />

      <ScrollView style={styles.scrollContent} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
      {loading && (
        <View style={styles.loadingContainer}>
          <Text style={{ textAlign: 'center' }}>{t('loading')}</Text>
        </View>
      )}
      {/* Date Filter */}
      <View style={styles.filterContainer}>
        {dateFilters.map((filter) => (
          <TouchableOpacity
            key={filter.value}
            style={[
              styles.filterButton,
              dateFilter === filter.value && styles.filterButtonActive,
            ]}
            onPress={() => setDateFilter(filter.value)}
          >
            <Text
              style={[
                styles.filterText,
                dateFilter === filter.value && styles.filterTextActive,
                isRTL && styles.textRTL,
              ]}
            >
              {t(filter.labelKey)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCardWrapper}>
          <StatCard
            title={t('totalViews')}
            value={stats.totalViews.toLocaleString()}
            icon={<Eye size={24} color={colors.primary.DEFAULT} />}
          />
        </View>
        <View style={styles.statCardWrapper}>
          <StatCard
            title={t('totalClicks')}
            value={stats.totalClicks.toLocaleString()}
            icon={<MousePointer size={24} color={colors.primary.DEFAULT} />}
          />
        </View>
        <View style={styles.statCardWrapper}>
          <StatCard
            title={t('ctr')}
            value={`${stats.ctr}%`}
            icon={<Target size={24} color={colors.primary.DEFAULT} />}
          />
        </View>
        <View style={styles.statCardWrapper}>
          <StatCard
            title={t('totalLeads')}
            value={stats.totalLeads.toLocaleString()}
            icon={<DollarSign size={24} color={colors.primary.DEFAULT} />}
          />
        </View>
      </View>

      {/* Charts */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>{t('viewsOverTime')}</Text>
        <LineChart
          data={chartData}
          width={Dimensions.get('window').width - 32}
          height={220}
          chartConfig={{
            backgroundColor: colors.card.background,
            backgroundGradientFrom: colors.card.background,
            backgroundGradientTo: colors.card.background,
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(124, 58, 237, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
            style: {
              borderRadius: 16,
            },
          }}
          bezier
          style={styles.chart}
        />
      </View>

      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>{t('dailySpend')}</Text>
        <BarChart
          data={spendChartData}
          width={Dimensions.get('window').width - 32}
          height={220}
          chartConfig={{
            backgroundColor: colors.card.background,
            backgroundGradientFrom: colors.card.background,
            backgroundGradientTo: colors.card.background,
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(124, 58, 237, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
          }}
          style={styles.chart}
        />
      </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any, insets: any, isRTL?: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.DEFAULT,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingStart: spacing.md,
    paddingEnd: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.card.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
  },
  headerRTL: {
    flexDirection: 'row',
  },
  rowReverse: {
    flexDirection: 'row',
  },
  textRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  backButtonWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    minWidth: 40,
    minHeight: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  backButtonLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.foreground.DEFAULT,
  },
  headerSpacer: {
    width: 40,
    minWidth: 40,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.foreground.DEFAULT,
    flex: 1,
    textAlign: 'center',
  },
  scrollContent: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
  },
  filterButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.badge,
    backgroundColor: colors.card.background,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  filterButtonActive: {
    backgroundColor: colors.primary.DEFAULT,
    borderColor: colors.primary.DEFAULT,
  },
  filterText: {
    fontSize: 14,
    color: colors.foreground.muted,
  },
  filterTextActive: {
    color: colors.primary.foreground,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.md,
    gap: spacing.md,
  },
  statCardWrapper: {
    width: '48%',
  },
  chartContainer: {
    padding: spacing.md,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.foreground.DEFAULT,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  chart: {
    borderRadius: borderRadius.card,
  },
  disabledContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  disabledIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  disabledTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.foreground.DEFAULT,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  disabledMessage: {
    fontSize: 16,
    color: colors.foreground.muted,
    textAlign: 'center',
    lineHeight: 24,
  },
});
