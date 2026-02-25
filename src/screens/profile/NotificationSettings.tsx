import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Switch, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Bell } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing, borderRadius } from '@/theme/spacing';
import { toast } from '@/utils/toast';
import { Text } from '@/components/common/Text';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { isRTL, rtlText, rtlRow } from '@/utils/rtl';

export function NotificationSettings() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const rtl = isRTL(language);
  const { colors } = useTheme();
  const styles = createStyles(colors, insets, rtl);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [campaignUpdates, setCampaignUpdates] = useState(true);
  const [budgetAlerts, setBudgetAlerts] = useState(true);
  const [performanceAlerts, setPerformanceAlerts] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setPushEnabled(data.push_enabled ?? true);
        setCampaignUpdates(data.campaign_updates ?? true);
        setBudgetAlerts(data.budget_alerts ?? true);
        setPerformanceAlerts(data.performance_alerts ?? true);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from('notification_preferences')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      const payload = {
        user_id: user.id,
        push_enabled: pushEnabled,
        campaign_updates: campaignUpdates,
        budget_alerts: budgetAlerts,
        performance_alerts: performanceAlerts,
      };

      if (existing?.id) {
        const { error } = await supabase
          .from('notification_preferences')
          .update(payload)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('notification_preferences')
          .insert(payload);
        if (error) throw error;
      }

      toast.success('Saved', 'Notification settings updated');
    } catch (error: any) {
      toast.error('Error', error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
        </View>
      )}
      <ScreenHeader
        title={t('notificationSettings')}
        onBack={() => navigation.goBack()}
        style={{ paddingTop: insets.top + 8 }}
      />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 16, width: '100%' }}>
        <View style={styles.section}>
          <View style={[styles.settingRow, rtlRow(rtl)]}>
            <View style={[styles.settingLeft, rtlRow(rtl)]}>
              <Bell size={20} color={colors.primary.DEFAULT} />
              <View style={styles.settingText}>
                <Text style={[styles.settingTitle, rtlText(rtl)]}>{t('pushNotifications')}</Text>
                <Text style={[styles.settingDescription, rtlText(rtl)]}>{t('pushDescription')}</Text>
              </View>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={setPushEnabled}
              trackColor={{ false: colors.border.DEFAULT, true: colors.primary.DEFAULT }}
              thumbColor="#fff"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('alertTypes')}</Text>

          <View style={[styles.settingRow, rtlRow(rtl)]}>
            <View style={[styles.settingLeft, rtlRow(rtl)]}>
              <Text style={[styles.settingTitle, rtlText(rtl)]}>{t('campaignUpdates')}</Text>
              <Text style={[styles.settingDescription, rtlText(rtl)]}>{t('campaignUpdatesDesc')}</Text>
            </View>
            <Switch
              value={campaignUpdates}
              onValueChange={setCampaignUpdates}
              disabled={!pushEnabled}
              trackColor={{ false: colors.border.DEFAULT, true: colors.primary.DEFAULT }}
              thumbColor="#fff"
            />
          </View>

          <View style={[styles.settingRow, rtlRow(rtl)]}>
            <View style={[styles.settingLeft, rtlRow(rtl)]}>
              <Text style={[styles.settingTitle, rtlText(rtl)]}>{t('budgetAlerts')}</Text>
              <Text style={[styles.settingDescription, rtlText(rtl)]}>{t('budgetAlertsDesc')}</Text>
            </View>
            <Switch
              value={budgetAlerts}
              onValueChange={setBudgetAlerts}
              disabled={!pushEnabled}
              trackColor={{ false: colors.border.DEFAULT, true: colors.primary.DEFAULT }}
              thumbColor="#fff"
            />
          </View>

          <View style={[styles.settingRow, rtlRow(rtl)]}>
            <View style={[styles.settingLeft, rtlRow(rtl)]}>
              <Text style={[styles.settingTitle, rtlText(rtl)]}>{t('performanceAlerts')}</Text>
              <Text style={[styles.settingDescription, rtlText(rtl)]}>{t('performanceAlertsDesc')}</Text>
            </View>
            <Switch
              value={performanceAlerts}
              onValueChange={setPerformanceAlerts}
              disabled={!pushEnabled}
              trackColor={{ false: colors.border.DEFAULT, true: colors.primary.DEFAULT }}
              thumbColor="#fff"
            />
          </View>
        </View>

        <Text style={[styles.infoText, rtlText(rtl)]}>{t('systemAlertsInfo')}</Text>

        <TouchableOpacity
          style={[styles.saveButtonContainer, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <LinearGradient
            colors={['#7C3AED', '#9333EA']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.saveButton, rtlRow(rtl)]}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={[styles.saveButtonText, rtlText(rtl)]}>{t('saveChanges')}</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any, insets: { top: number; bottom: number }, rtl?: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.DEFAULT,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingStart: spacing.md,
    paddingEnd: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.card.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
  },
  headerLeftSlot: {
    minWidth: 100,
    maxWidth: 100,
    alignItems: rtl ? 'flex-end' : 'flex-start',
    justifyContent: 'center',
  },
  headerRightSlot: {
    minWidth: 100,
    maxWidth: 100,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: colors.foreground.DEFAULT,
    textAlign: 'center',
    marginHorizontal: spacing.sm,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingStart: spacing.lg,
    paddingEnd: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: insets.bottom + spacing.xl * 2,
    width: '100%',
    maxWidth: '100%',
  },
  section: {
    backgroundColor: colors.card.background,
    borderRadius: borderRadius.card,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.card.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.foreground.DEFAULT,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  settingRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
  },
  settingLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginEnd: spacing.md,
  },
  settingText: {
    flex: 1,
    minWidth: 0,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.foreground.DEFAULT,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 12,
    color: colors.foreground.muted,
    lineHeight: 16,
  },
  infoText: {
    fontSize: 12,
    color: colors.foreground.muted,
    lineHeight: 18,
    marginBottom: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.card.background,
    borderRadius: borderRadius.card,
    borderWidth: 1,
    borderColor: colors.card.border,
  },
  saveButtonContainer: {
    width: '100%',
  },
  saveButton: {
    height: 56,
    borderRadius: borderRadius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: colors.primary.foreground,
    fontSize: 17,
    fontWeight: '600',
  },
});

