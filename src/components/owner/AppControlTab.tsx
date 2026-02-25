import { AppBanner } from '@/components/common/AppBanner';
import { Text } from '@/components/common/Text';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRemoteConfig } from '@/contexts/RemoteConfigContext';
import { supabase, supabaseRead } from '@/integrations/supabase/client';
import { borderRadius, spacing } from '@/theme/spacing';
import { getTypographyStyles } from '@/theme/typography';
import { AppSettings } from '@/types/remote-config';
import { inputStyleRTL } from '@/utils/rtl';
import { toast } from '@/utils/toast';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
    AlertCircle,
    BarChart,
    Bell,
    Eye,
    LayoutDashboard, Link as LinkIcon,
    Megaphone,
    MessageCircle, PhoneCall,
    Power,
    RefreshCw,
    Save,
    Settings,
    Target,
    UserCog,
    Users,
    Wallet,
    Wifi, WifiOff,
    Wrench,
    X
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, ScrollView, StyleSheet, Switch, TextInput, TouchableOpacity, View } from 'react-native';

interface AppControlTabProps {
  colors: any;
  t: (key: string) => string;
}

interface FeatureToggleProps {
  icon: React.ComponentType<any>;
  label: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  variant?: 'default' | 'danger';
  colors: any;
  typography: any;
}

function FeatureToggle({ 
  icon: Icon, 
  label, 
  description, 
  value, 
  onValueChange, 
  disabled,
  variant = 'default',
  colors,
  typography
}: FeatureToggleProps) {
  const styles = createStyles(colors, typography);
  const isDanger = variant === 'danger' && !value;

  return (
    <View style={[styles.toggleRow, isDanger && styles.dangerRow]}>
      <View style={styles.toggleLeft}>
        <View style={[styles.iconContainer, isDanger && styles.iconContainerDanger]}>
          <Icon size={20} color={isDanger ? '#EF4444' : colors.primary.DEFAULT} />
        </View>
        <View style={styles.toggleTextContainer}>
          <Text style={styles.toggleLabel}>{label}</Text>
          <Text style={styles.toggleDescription}>{description}</Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: colors.border.DEFAULT, true: colors.primary.DEFAULT }}
        thumbColor={colors.primary.foreground}
      />
    </View>
  );
}

export function AppControlTab({ colors, t }: AppControlTabProps) {
  const { settings, realtimeStatus, refetch } = useRemoteConfig();
  const { language } = useLanguage();
  const typography = getTypographyStyles(language as 'ckb' | 'ar');
  const styles = createStyles(colors, typography);
  
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showBannerPreview, setShowBannerPreview] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [connectedDevices, setConnectedDevices] = useState(0);

  useEffect(() => {
    setLocalSettings(settings);
    fetchSettings();
  }, [settings]);

  useEffect(() => {
    // Count connected devices (users with active sessions)
    const countConnectedDevices = async () => {
      try {
        // This is a placeholder - you might want to track active sessions differently
        // For now, we'll use a simple approach
        const { count } = await supabaseRead
          .from('profiles')
          .select('*', { count: 'exact', head: true });
        
        if (count !== null) {
          setConnectedDevices(count);
        }
      } catch (error) {
        console.warn('[AppControl] Could not count devices:', error);
      }
    };

    countConnectedDevices();
    const interval = setInterval(countConnectedDevices, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('app-settings', {
        body: { action: 'get', key: 'global' }
      });

      if (error) throw error;

      if (data?.settings?.value) {
        setLocalSettings(data.settings.value);
        if (data.settings.updated_at) {
          setLastUpdated(new Date(data.settings.updated_at));
        }
      }
    } catch (error: any) {
      console.error('[AppControl] Fetch error:', error);
      toast.error('Error', 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!supabase) return;

    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('app-settings', {
        body: { 
          action: 'update', 
          key: 'global', 
          value: localSettings 
        }
      });

      if (error) throw error;

      setLastUpdated(new Date());
      toast.success('Success', 'Operation completed');
    } catch (error: any) {
      console.error('[AppControl] Save error:', error);
      Alert.alert('Error', error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateFeature = (feature: keyof AppSettings['features'], value: boolean) => {
    setLocalSettings({
      ...localSettings,
      features: {
        ...localSettings.features,
        [feature]: value,
      },
    });
  };

  const updateMaintenance = (updates: Partial<AppSettings['maintenance']>) => {
    setLocalSettings({
      ...localSettings,
      maintenance: {
        ...localSettings.maintenance,
        ...updates,
      },
    });
  };

  const updateBanner = (updates: Partial<AppSettings['ui_text']>) => {
    setLocalSettings({
      ...localSettings,
      ui_text: {
        ...localSettings.ui_text,
        ...updates,
      },
    });
  };

  const updateSetting = (path: string, value: any) => {
    const newSettings = JSON.parse(JSON.stringify(localSettings)); // Deep clone
    
    // Helper to set nested value
    const setNested = (obj: any, path: string, val: any) => {
      const parts = path.split('.');
      let current = obj;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) current[parts[i]] = {};
        current = current[parts[i]];
      }
      current[parts[parts.length - 1]] = val;
    };

    setNested(newSettings, path, value);
    setLocalSettings(newSettings);
  };

  const isRealtimeActive = realtimeStatus === 'SUBSCRIBED';
  const disabledFeaturesCount = Object.values(localSettings.features).filter(v => !v).length;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.titleRow}>
            <Settings size={24} color={colors.primary.DEFAULT} />
            <Text style={styles.title}>App Control Panel</Text>
          </View>
          <Text style={styles.subtitle}>
            Remote config & feature flags • Changes apply instantly
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={fetchSettings}
          disabled={saving}
        >
          <RefreshCw size={18} color={colors.foreground.DEFAULT} />
        </TouchableOpacity>
      </View>

      {/* Live Sync Badge */}
      <View style={styles.liveSyncContainer}>
        <View style={styles.liveSyncBadge}>
          {isRealtimeActive ? (
            <>
              <Wifi size={14} color="#22C55E" />
              <Text style={styles.liveSyncText}>Live Sync Enabled</Text>
            </>
          ) : (
            <>
              <WifiOff size={14} color="#F97316" />
              <Text style={styles.liveSyncTextInactive}>Realtime Offline</Text>
            </>
          )}
        </View>
        <View style={styles.devicesCounter}>
          <Users size={14} color={colors.foreground.muted} />
          <Text style={styles.devicesText}>{connectedDevices} Active Users</Text>
        </View>
      </View>

      {/* Status Alerts */}
      {!localSettings.features.ads_enabled && (
        <View style={[styles.alert, styles.alertDestructive]}>
          <AlertCircle size={20} color="#EF4444" />
          <Text style={styles.alertText}>Ads Service Paused</Text>
        </View>
      )}

      {localSettings.maintenance.enabled && (
        <View style={[styles.alert, styles.alertWarning]}>
          <Wrench size={20} color="#F59E0B" />
          <Text style={styles.alertText}>Maintenance Mode Active</Text>
        </View>
      )}

      {disabledFeaturesCount > 0 && !localSettings.maintenance.enabled && (
        <View style={[styles.alert, styles.alertInfo]}>
          <AlertCircle size={20} color="#3B82F6" />
          <Text style={styles.alertText}>{disabledFeaturesCount} Feature(s) Disabled</Text>
        </View>
      )}

      {/* Core Features Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Power size={20} color={colors.primary.DEFAULT} />
            <Text style={styles.cardTitle}>Core Features</Text>
          </View>
          <Text style={styles.cardDescription}>
            Master switches for major app functionality
          </Text>
        </View>

        <FeatureToggle
          icon={Power}
          label="Ads Service"
          description="Global kill switch for all ads functionality"
          value={localSettings.features.ads_enabled}
          onValueChange={(v) => updateFeature('ads_enabled', v)}
          variant="danger"
          colors={colors}
          typography={typography}
        />

        <FeatureToggle
          icon={LayoutDashboard}
          label="Ad Creation"
          description="Allow users to create new ad campaigns"
          value={localSettings.features.ad_creation_enabled}
          onValueChange={(v) => updateFeature('ad_creation_enabled', v)}
          colors={colors}
          typography={typography}
        />

        <FeatureToggle
          icon={LayoutDashboard}
          label="Campaigns"
          description="Allow users to view and manage their campaigns"
          value={localSettings.features.campaigns_enabled}
          onValueChange={(v) => updateFeature('campaigns_enabled', v)}
          colors={colors}
          typography={typography}
        />
      </View>

      {/* Secondary Features Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <LinkIcon size={20} color="#3B82F6" />
            <Text style={styles.cardTitle}>Secondary Features</Text>
          </View>
          <Text style={styles.cardDescription}>
            Toggle additional app features
          </Text>
        </View>

        <FeatureToggle
          icon={LinkIcon}
          label="Links"
          description="Enable bio links feature for users"
          value={localSettings.features.links_enabled}
          onValueChange={(v) => updateFeature('links_enabled', v)}
          colors={colors}
          typography={typography}
        />

        <FeatureToggle
          icon={Wallet}
          label="Wallet"
          description="Enable wallet and payment functionality"
          value={localSettings.features.wallet_enabled}
          onValueChange={(v) => updateFeature('wallet_enabled', v)}
          colors={colors}
          typography={typography}
        />

        <FeatureToggle
          icon={Bell}
          label="Notifications"
          description="Enable push and in-app notifications"
          value={localSettings.features.notifications_enabled}
          onValueChange={(v) => updateFeature('notifications_enabled', v)}
          colors={colors}
          typography={typography}
        />

        <FeatureToggle
          icon={BarChart}
          label="Analytics"
          description="Show analytics and performance data to users"
          value={localSettings.features.analytics_enabled}
          onValueChange={(v) => updateFeature('analytics_enabled', v)}
          colors={colors}
          typography={typography}
        />

        <FeatureToggle
          icon={UserCog}
          label="Profile Editing"
          description="Allow users to edit their profile information"
          value={localSettings.features.profile_editing_enabled}
          onValueChange={(v) => updateFeature('profile_editing_enabled', v)}
          colors={colors}
          typography={typography}
        />
      </View>

      {/* Ad Objectives Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Target size={20} color="#7C3AED" />
            <Text style={styles.cardTitle}>Ad Objectives</Text>
          </View>
          <Text style={styles.cardDescription}>
            Control which objectives users can see
          </Text>
        </View>

        <FeatureToggle
          icon={MessageCircle}
          label="Contacts & Messages (Website)"
          description="Website conversions - destination link"
          value={localSettings.objectives?.conversions_enabled ?? true}
          onValueChange={(v) => updateSetting('objectives.conversions_enabled', v)}
          disabled={saving}
          colors={colors}
          typography={typography}
        />

        <FeatureToggle
          icon={Eye}
          label="Video Views"
          description="Maximize video plays and engagement"
          value={localSettings.objectives?.views_enabled ?? true}
          onValueChange={(v) => updateSetting('objectives.views_enabled', v)}
          disabled={saving}
          colors={colors}
          typography={typography}
        />

        <FeatureToggle
          icon={PhoneCall}
          label="Contacts & Messages (Lead Gen)"
          description="Lead generation via website"
          value={localSettings.objectives?.lead_generation_enabled ?? true}
          onValueChange={(v) => updateSetting('objectives.lead_generation_enabled', v)}
          disabled={saving}
          colors={colors}
          typography={typography}
        />
      </View>

      {/* Maintenance Mode Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Wrench size={20} color="#F59E0B" />
            <Text style={styles.cardTitle}>Maintenance Mode</Text>
          </View>
          <Text style={styles.cardDescription}>
            Show a maintenance message to all users
          </Text>
        </View>

        <View style={styles.switchRow}>
          <View style={styles.switchLeft}>
            <Text style={styles.switchLabel}>Enable Maintenance Mode</Text>
            <Text style={styles.switchDescription}>Users will see a maintenance screen</Text>
          </View>
          <Switch
            value={localSettings.maintenance.enabled}
            onValueChange={(enabled) => updateMaintenance({ enabled })}
            disabled={saving}
            trackColor={{ false: colors.border.DEFAULT, true: colors.primary.DEFAULT }}
            thumbColor={colors.primary.foreground}
          />
        </View>

        {localSettings.maintenance.enabled && (
          <>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Maintenance Message</Text>
              <TextInput
                style={[styles.textInput, inputStyleRTL()]}
                value={localSettings.maintenance.message}
                onChangeText={(text) => updateMaintenance({ message: text })}
                placeholder="Enter maintenance message..."
                placeholderTextColor={colors.foreground.muted}
                multiline
                numberOfLines={3}
              />
            </View>

            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateButtonText}>
                {localSettings.maintenance.until
                  ? `Expected End: ${new Date(localSettings.maintenance.until).toLocaleString()}`
                  : 'Set Expected End Time (Optional)'}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={localSettings.maintenance.until ? new Date(localSettings.maintenance.until) : new Date()}
                mode="datetime"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, date) => {
                  // CRITICAL: Hide picker FIRST before any state updates
                  setShowDatePicker(false);
                  
                  // Only update if date was selected (not dismissed)
                  if (event && event.type === 'set' && date) {
                    updateMaintenance({ until: date.toISOString() });
                  }
                  // Do NOT call any .dismiss() methods here
                }}
                minimumDate={new Date()}
              />
            )}
          </>
        )}
      </View>

      {/* App Banner Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Megaphone size={20} color="#3B82F6" />
            <Text style={styles.cardTitle}>App Banner</Text>
          </View>
          <Text style={styles.cardDescription}>
            Display an announcement banner in the app
          </Text>
        </View>

        <View style={styles.switchRow}>
          <View style={styles.switchLeft}>
            <Text style={styles.switchLabel}>Show Banner</Text>
            <Text style={styles.switchDescription}>Display a promotional or info banner</Text>
          </View>
          <Switch
            value={localSettings.ui_text.banner_enabled}
            onValueChange={(enabled) => updateBanner({ banner_enabled: enabled })}
            disabled={saving}
            trackColor={{ false: colors.border.DEFAULT, true: colors.primary.DEFAULT }}
            thumbColor={colors.primary.foreground}
          />
        </View>

        {localSettings.ui_text.banner_enabled && (
          <>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Banner Text</Text>
              <TextInput
                style={[styles.textInput, inputStyleRTL()]}
                value={localSettings.ui_text.banner_text}
                onChangeText={(text) => updateBanner({ banner_text: text })}
                placeholder="Enter banner message..."
                placeholderTextColor={colors.foreground.muted}
                multiline
                numberOfLines={2}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Banner Link (Optional)</Text>
              <TextInput
                style={[styles.textInput, inputStyleRTL()]}
                value={localSettings.ui_text.banner_link}
                onChangeText={(text) => updateBanner({ banner_link: text })}
                placeholder="https://example.com"
                placeholderTextColor={colors.foreground.muted}
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity
              style={styles.previewButton}
              onPress={() => setShowBannerPreview(true)}
            >
              <Eye size={16} color={colors.primary.DEFAULT} />
              <Text style={styles.previewButtonText}>Preview Banner</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.lastUpdated}>
          {lastUpdated
            ? `Last updated: ${lastUpdated.toLocaleString()}`
            : 'Not updated yet'}
        </Text>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={saveSettings}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.primary.foreground} />
          ) : (
            <>
              <Save size={18} color={colors.primary.foreground} />
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Banner Preview Modal */}
      <Modal
        visible={showBannerPreview}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBannerPreview(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Banner Preview</Text>
              <TouchableOpacity onPress={() => setShowBannerPreview(false)}>
                <X size={24} color={colors.foreground.DEFAULT} />
              </TouchableOpacity>
            </View>
            <View style={styles.previewContainer}>
              <AppBanner />
              <Text style={styles.previewNote}>
                This is how the banner will appear to users
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const createStyles = (colors: any, typography: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.DEFAULT,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.h1,
    fontSize: 24,
    fontWeight: '700',
    color: colors.foreground.DEFAULT,
  },
  subtitle: {
    ...typography.bodySmall,
    fontSize: 14,
    color: colors.foreground.muted,
    marginTop: spacing.xs,
  },
  refreshButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.card.background,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  liveSyncContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  liveSyncBadge: {
    backgroundColor: 'rgba(34,197,94,0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  liveSyncText: {
    ...typography.caption,
    color: '#22C55E',
    fontSize: 12,
    fontWeight: '600',
  },
  liveSyncTextInactive: {
    ...typography.caption,
    color: '#F97316',
    fontSize: 12,
    fontWeight: '600',
  },
  devicesCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.card.background,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  devicesText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.foreground.muted,
  },
  alert: {
    padding: spacing.md,
    borderRadius: borderRadius.card,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  alertDestructive: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.5)',
  },
  alertWarning: {
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.5)',
  },
  alertInfo: {
    backgroundColor: 'rgba(59,130,246,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.5)',
  },
  alertText: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '600',
    color: colors.foreground.DEFAULT,
  },
  card: {
    backgroundColor: colors.card.background,
    borderRadius: borderRadius.card,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  cardHeader: {
    marginBottom: spacing.md,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  cardTitle: {
    ...typography.h3,
    fontSize: 18,
    fontWeight: '600',
    color: colors.foreground.DEFAULT,
  },
  cardDescription: {
    ...typography.bodySmall,
    fontSize: 14,
    color: colors.foreground.muted,
    marginTop: spacing.xs,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
    minHeight: 60,
  },
  dangerRow: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary.DEFAULT + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  iconContainerDanger: {
    backgroundColor: 'rgba(239,68,68,0.2)',
  },
  toggleTextContainer: {
    flex: 1,
  },
  toggleLabel: {
    ...typography.body,
    fontSize: 16,
    fontWeight: '500',
    color: colors.foreground.DEFAULT,
    marginBottom: spacing.xs / 2,
  },
  toggleDescription: {
    ...typography.bodySmall,
    fontSize: 14,
    color: colors.foreground.muted,
    lineHeight: 20,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  switchLeft: {
    flex: 1,
  },
  switchLabel: {
    ...typography.body,
    fontSize: 16,
    fontWeight: '500',
    color: colors.foreground.DEFAULT,
    marginBottom: spacing.xs / 2,
  },
  switchDescription: {
    ...typography.bodySmall,
    fontSize: 14,
    color: colors.foreground.muted,
  },
  inputContainer: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  inputLabel: {
    ...typography.label,
    fontSize: 14,
    color: colors.foreground.muted,
    marginBottom: spacing.xs,
  },
  textInput: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    color: colors.foreground.DEFAULT,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dateButton: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    marginTop: spacing.sm,
  },
  dateButtonText: {
    ...typography.body,
    fontSize: 14,
    color: colors.foreground.DEFAULT,
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary.DEFAULT + '20',
    borderWidth: 1,
    borderColor: colors.primary.DEFAULT,
    marginTop: spacing.sm,
  },
  previewButtonText: {
    ...typography.body,
    fontSize: 14,
    color: colors.primary.DEFAULT,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.DEFAULT,
  },
  lastUpdated: {
    ...typography.bodySmall,
    fontSize: 14,
    color: colors.foreground.muted,
  },
  saveButton: {
    backgroundColor: colors.primary.DEFAULT,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.button,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minWidth: 150,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    ...typography.body,
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary.foreground,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay.dark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.card.background,
    borderRadius: borderRadius.card,
    width: '90%',
    maxWidth: 400,
    padding: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    ...typography.h3,
    fontSize: 18,
    fontWeight: '700',
    color: colors.foreground.DEFAULT,
  },
  previewContainer: {
    backgroundColor: colors.background.DEFAULT,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
  },
  previewNote: {
    ...typography.bodySmall,
    fontSize: 12,
    color: colors.foreground.muted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});

