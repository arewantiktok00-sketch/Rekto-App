import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Alert, Switch, ActivityIndicator, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { supabase } from '@/integrations/supabase/client';
import { getOwnerColors } from '@/theme/colors';
import { useLanguage } from '@/contexts/LanguageContext';
import { getTypographyStyles } from '@/theme/typography';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, borderRadius } from '@/theme/spacing';
import { toast } from '@/utils/toast';
import { Gift } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/common/Text';
import { inputStyleRTL } from '@/utils/rtl';

interface PromoBannerSettings {
  enabled: boolean;
  text_en: string;
  text_ckb: string;
  text_ar: string;
  target_budget: number;      // USD budget tier (10, 20, 30, 50, 100)
  display_price_iqd: number;  // Direct IQD price to show (e.g., 15000)
}

// Default values
const defaultSettings: PromoBannerSettings = {
  enabled: false,
  text_en: '🔥 Special Offer!',
  text_ckb: '🔥 ئۆفەری تایبەت!',
  text_ar: '🔥 عرض خاص!',
  target_budget: 10,
  display_price_iqd: 15000,
};

export function PromoBannerManagementScreen() {
  const insets = useSafeAreaInsets();
  const colors = getOwnerColors();
  const { language, t, isRTL } = useLanguage();
  const typography = getTypographyStyles(language as 'ckb' | 'ar');
  const styles = createStyles(colors, insets, typography, isRTL);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<PromoBannerSettings>(defaultSettings);

  const budgetOptions = [10, 20, 30, 50, 100];

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('app-settings', {
        body: { action: 'get', key: 'global' }
      });

      if (error) {
        console.error('Failed to fetch promo settings:', error);
        // Use defaults if fetch fails
        return;
      }

      if (data?.settings?.value?.promo_banner) {
        setSettings({
          enabled: data.settings.value.promo_banner.enabled ?? defaultSettings.enabled,
          text_en: data.settings.value.promo_banner.text_en ?? defaultSettings.text_en,
          text_ckb: data.settings.value.promo_banner.text_ckb ?? defaultSettings.text_ckb,
          text_ar: data.settings.value.promo_banner.text_ar ?? defaultSettings.text_ar,
          target_budget: data.settings.value.promo_banner.target_budget ?? defaultSettings.target_budget,
          display_price_iqd: data.settings.value.promo_banner.display_price_iqd ?? defaultSettings.display_price_iqd,
        });
      }
    } catch (error) {
      console.error('Error fetching promo settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Get current global settings
      const { data: currentData, error: fetchError } = await supabase.functions.invoke('app-settings', {
        body: { action: 'get', key: 'global' }
      });

      if (fetchError) {
        console.error('Failed to fetch current settings:', fetchError);
        Alert.alert('Error', 'Failed to load current settings');
        return;
      }

      const currentSettings = currentData?.settings?.value || {};
      
      // Merge promo_banner into global settings
      const newSettings = {
        ...currentSettings,
        promo_banner: settings
      };

      const { error } = await supabase.functions.invoke('app-settings', {
        body: { action: 'update', key: 'global', value: newSettings }
      });

      if (error) {
        Alert.alert('Error', 'Failed to save promo banner settings');
        return;
      }

      toast.success('Saved', 'Promo banner updated');
    } catch (error) {
      console.error('Failed to save promo settings:', error);
      Alert.alert('Error', 'Failed to save promo banner settings');
    } finally {
      setIsSaving(false);
    }
  };

  const calculatePreviewIQD = () => {
    return settings.display_price_iqd * 3; // 3 days example
  };

  const isRTL = language === 'ckb' || language === 'ar';
  const previewText = language === 'ckb' ? settings.text_ckb : language === 'ar' ? settings.text_ar : settings.text_en;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Promo Banner Settings</Text>
        <Text style={styles.sectionDescription}>
          Configure the promotional banner that appears on user dashboards. Users will see direct IQD prices for specific budget tiers.
        </Text>
      </View>

      {/* Enable Toggle */}
      <View style={styles.card}>
        <View style={styles.switchRow}>
          <View style={styles.switchLabel}>
            <Text style={styles.switchTitle}>Show Banner</Text>
            <Text style={styles.switchDescription}>
              Display the promo banner on user dashboard
            </Text>
          </View>
          <Switch
            value={settings.enabled}
            onValueChange={(value) => setSettings({ ...settings, enabled: value })}
            trackColor={{ false: colors.border.DEFAULT, true: colors.primary.DEFAULT }}
            thumbColor={colors.primary.foreground}
          />
        </View>
      </View>

      {/* Banner Text Inputs */}
      <View style={styles.card}>
        <Text style={styles.inputLabel}>Banner Text (English)</Text>
        <TextInput
          style={[styles.input, inputStyleRTL()]}
          value={settings.text_en}
          onChangeText={(text) => setSettings({ ...settings, text_en: text })}
          placeholder="Special Offer: $10/day"
          placeholderTextColor={colors.foreground.muted}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.inputLabel}>Banner Text (Kurdish)</Text>
        <TextInput
          style={[styles.input, inputStyleRTL()]}
          value={settings.text_ckb}
          onChangeText={(text) => setSettings({ ...settings, text_ckb: text })}
          placeholder="ئۆفەری تایبەت: $10/ڕۆژ"
          placeholderTextColor={colors.foreground.muted}
          textAlign="right"
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.inputLabel}>Banner Text (Arabic)</Text>
        <TextInput
          style={[styles.input, inputStyleRTL()]}
          value={settings.text_ar}
          onChangeText={(text) => setSettings({ ...settings, text_ar: text })}
          placeholder="عرض خاص: $10/يوم"
          placeholderTextColor={colors.foreground.muted}
          textAlign="right"
        />
      </View>

      {/* Target Budget */}
      <View style={styles.card}>
        <Text style={styles.inputLabel}>Target Budget (USD)</Text>
        <Text style={styles.inputDescription}>
          The USD budget tier this promo applies to
        </Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={settings.target_budget}
            onValueChange={(value) => setSettings({ ...settings, target_budget: value })}
            style={styles.picker}
            dropdownIconColor={colors.foreground.DEFAULT}
          >
            {budgetOptions.map((budget) => (
              <Picker.Item
                key={budget}
                label={`$${budget}`}
                value={budget}
                color={colors.foreground.DEFAULT}
              />
            ))}
          </Picker>
        </View>
      </View>

      {/* Display Price IQD */}
      <View style={styles.card}>
        <Text style={styles.inputLabel}>Display Price (IQD per day)</Text>
        <Text style={styles.inputDescription}>
          The direct IQD price users will see for this budget tier
        </Text>
        <TextInput
          style={[styles.input, inputStyleRTL()]}
          value={settings.display_price_iqd.toString()}
          onChangeText={(text) => {
            const numValue = parseInt(text) || 0;
            setSettings({ ...settings, display_price_iqd: numValue });
          }}
          placeholder="15000"
          placeholderTextColor={colors.foreground.muted}
          keyboardType="numeric"
        />
      </View>

      {/* Live Preview */}
      {settings.enabled && (
        <View style={styles.previewCard}>
          <View style={styles.previewHeader}>
            <Gift size={20} color="#7C3AED" />
            <Text style={styles.previewTitle}>Preview</Text>
          </View>
          <LinearGradient
            colors={['#7C3AED', '#A855F7', '#EC4899']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.previewBanner}
          >
            <View style={[styles.previewContent, isRTL && styles.previewContentRTL]}>
              <Text style={styles.previewText}>{previewText}</Text>
              <View style={styles.previewPriceContainer}>
                <Text style={styles.previewPrice}>
                  ${settings.target_budget} = {settings.display_price_iqd.toLocaleString()} IQD
                </Text>
              </View>
            </View>
          </LinearGradient>
          <Text style={styles.previewNote}>
            Example: {calculatePreviewIQD().toLocaleString()} IQD for 3 days
          </Text>
        </View>
      )}

      {/* Save Button - Always visible */}
      <TouchableOpacity
        style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={isSaving}
      >
        {isSaving ? (
          <ActivityIndicator color={colors.primary.foreground} />
        ) : (
          <Text style={styles.saveButtonText}>Save Settings</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const createStyles = (colors: any, insets: any, typography: any, isRTL?: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.DEFAULT,
    },
    content: {
      padding: spacing.md,
      paddingBottom: insets.bottom + spacing.xl,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background.DEFAULT,
    },
    section: {
      marginBottom: spacing.lg,
    },
    sectionTitle: {
      ...typography.h2,
      color: colors.foreground.DEFAULT,
      marginBottom: spacing.xs,
      fontFamily: 'Poppins-Bold',
      textAlign: isRTL ? 'right' : 'left',
    },
    sectionDescription: {
      ...typography.body,
      color: colors.foreground.muted,
      fontSize: 14,
      lineHeight: 20,
      textAlign: isRTL ? 'right' : 'left',
    },
    card: {
      backgroundColor: colors.card.background,
      borderRadius: borderRadius.card,
      padding: spacing.md,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.border.DEFAULT,
    },
    switchRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    switchLabel: {
      flex: 1,
      marginEnd: spacing.md,
    },
    switchTitle: {
      ...typography.label,
      color: colors.foreground.DEFAULT,
      fontFamily: 'Poppins-SemiBold',
      marginBottom: spacing.xs / 2,
      textAlign: isRTL ? 'right' : 'left',
    },
    switchDescription: {
      ...typography.caption,
      color: colors.foreground.muted,
      fontSize: 12,
      textAlign: isRTL ? 'right' : 'left',
    },
    inputLabel: {
      ...typography.label,
      color: colors.foreground.DEFAULT,
      fontFamily: 'Poppins-SemiBold',
      marginBottom: spacing.xs,
      textAlign: isRTL ? 'right' : 'left',
    },
    inputDescription: {
      ...typography.caption,
      color: colors.foreground.muted,
      fontSize: 12,
      marginBottom: spacing.sm,
      textAlign: isRTL ? 'right' : 'left',
    },
    input: {
      backgroundColor: colors.background.DEFAULT,
      borderRadius: borderRadius.input,
      padding: spacing.md,
      color: colors.foreground.DEFAULT,
      fontFamily: 'Poppins-Regular',
      borderWidth: 1,
      borderColor: colors.border.DEFAULT,
      fontSize: 14,
      textAlign: isRTL ? 'right' : 'left',
    },
    inputRTL: {
      textAlign: 'right',
      fontFamily: 'Rabar_021',
    },
    pickerContainer: {
      backgroundColor: colors.background.DEFAULT,
      borderRadius: borderRadius.input,
      borderWidth: 1,
      borderColor: colors.border.DEFAULT,
      overflow: 'hidden',
    },
    picker: {
      color: colors.foreground.DEFAULT,
      backgroundColor: 'transparent',
    },
    previewCard: {
      backgroundColor: colors.card.background,
      borderRadius: borderRadius.card,
      padding: spacing.md,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.primary.DEFAULT,
    },
    previewHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginBottom: spacing.md,
    },
    previewTitle: {
      ...typography.label,
      color: colors.foreground.DEFAULT,
      fontFamily: 'Poppins-SemiBold',
    },
    previewBanner: {
      borderRadius: borderRadius.card,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    previewContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    previewContentRTL: {
      flexDirection: 'row',
    },
    previewText: {
      color: colors.primary.foreground,
      fontFamily: 'Poppins-Bold',
      fontSize: 18,
      flex: 1,
    },
    previewPriceContainer: {
      alignItems: 'flex-end',
    },
    previewPrice: {
      color: colors.primary.foreground,
      fontFamily: 'Poppins-Bold',
      fontSize: 20,
    },
    previewNote: {
      ...typography.caption,
      color: colors.foreground.muted,
      fontSize: 12,
      fontStyle: 'italic',
    },
    saveButton: {
      backgroundColor: colors.primary.DEFAULT,
      borderRadius: borderRadius.button,
      padding: spacing.md,
      alignItems: 'center',
      marginTop: spacing.lg,
    },
    saveButtonDisabled: {
      opacity: 0.6,
    },
    saveButtonText: {
      color: colors.primary.foreground,
      fontFamily: 'Poppins-SemiBold',
      fontSize: 16,
    },
  });

