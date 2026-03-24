import { Text } from '@/components/common/Text';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { getOwnerColors } from '@/theme/colors';
import { borderRadius, spacing } from '@/theme/spacing';
import { getTypographyStyles } from '@/theme/typography';
import { iconTransformRTL, inputStyleRTL } from '@/utils/rtl';
import { toast } from '@/utils/toast';
import { translateErrorMessage } from '@/utils/errorTranslator';
import { Picker } from '@react-native-picker/picker';
import LinearGradient from 'react-native-linear-gradient';
import { ArrowRight, Gift, Save, Sparkles } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface PromoBannerSettings {
  enabled: boolean;
  text_en: string;
  text_ckb: string;
  text_ar: string;
  target_budget: number | null;
  display_price_iqd: number | null;
}

export const PromoBannerManager: React.FC = () => {
  const colors = getOwnerColors();
  const { language, t } = useLanguage();
  const lang = (language || 'ckb') as 'ckb' | 'ar';
  const insets = useSafeAreaInsets();
  const typography = getTypographyStyles(language as 'ckb' | 'ar');
  const styles = createStyles(colors, insets, typography);

  const [settings, setSettings] = useState<PromoBannerSettings>({
    enabled: false,
    text_en: '🔥 Special Offer!',
    text_ckb: '🔥 ئۆفەری تایبەت!',
    text_ar: '🔥 عرض خاص!',
    target_budget: 10,
    display_price_iqd: 15000,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('app-settings', {
        body: { action: 'get', key: 'global' }
      });

      if (!error && data?.settings?.value) {
        const promoData = data.settings.value.promo_banner || {};
        setSettings({
          enabled: promoData.enabled ?? false,
          text_en: promoData.text_en ?? '🔥 Special Offer!',
          text_ckb: promoData.text_ckb ?? '🔥 ئۆفەری تایبەت!',
          text_ar: promoData.text_ar ?? '🔥 عرض خاص!',
          target_budget: promoData.target_budget ?? 10,
          display_price_iqd: promoData.display_price_iqd ?? 15000,
        });
      }
    } catch (err) {
      console.error('Failed to fetch promo data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Get current settings first
      const { data: currentData } = await supabase.functions.invoke('app-settings', {
        body: { action: 'get', key: 'global' }
      });

      const currentSettings = currentData?.settings?.value || {};
      const newSettings = {
        ...currentSettings,
        promo_banner: settings
      };

      const { data, error } = await supabase.functions.invoke('app-settings', {
        body: { action: 'update', key: 'global', value: newSettings }
      });

      if (error) throw error;
      if (data?.success === false) {
        const msg = translateErrorMessage(data?.error ?? '', lang);
        Alert.alert(lang === 'ckb' ? 'هەڵە' : 'خطأ', msg);
        return;
      }

      if (settings.enabled) {
        try {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('user_id');
          const allProfiles = profilesData ?? [];
          if (allProfiles.length > 0) {
            const userIds = allProfiles.map((p: { user_id: string }) => p.user_id);
            await supabase.functions.invoke('send-onesignal-push', {
              body: {
                user_ids: userIds,
                title: settings.text_ckb || '✨ ئۆفەری تایبەت!',
                body: settings.text_ar || 'عرض خاص متاح الآن!',
                data: {
                  type: 'promo',
                  screen: 'CreateAd',
                  target_budget: settings.target_budget,
                  display_price_iqd: settings.display_price_iqd,
                },
                tag: 'promo-banner',
              },
            });
          }
        } catch (pushErr) {
          console.error('Failed to send promo push:', pushErr);
        }
      }

      toast.success('Success', 'Operation completed');
    } catch (err: any) {
      console.error('Save failed:', err);
      const msg = err?.data?.error ? translateErrorMessage(String(err.data.error), lang) : translateErrorMessage('', lang);
      Alert.alert(lang === 'ckb' ? 'هەڵە' : 'خطأ', msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  const previewText = language === 'ckb' ? settings.text_ckb : language === 'ar' ? settings.text_ar : settings.text_en;
  const isRTL = language === 'ckb' || language === 'ar';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Gift size={24} color="#7C3AED" />
        <Text style={styles.headerTitle}>Promo Banner</Text>
      </View>

      {/* Enable Toggle */}
      <View style={styles.card}>
        <View style={styles.switchRow}>
          <View style={styles.switchLabel}>
            <Text style={styles.switchTitle}>Enable Promo Banner</Text>
            <Text style={styles.switchDescription}>
              Show promotional banner on user dashboard
            </Text>
          </View>
          <Switch
            value={settings.enabled}
            onValueChange={(value) => setSettings(prev => ({ ...prev, enabled: value }))}
            trackColor={{ false: colors.border.DEFAULT, true: colors.primary.DEFAULT }}
            thumbColor="#FAFAFA"
          />
        </View>
      </View>

      {/* Status */}
      <View style={[styles.statusCard, settings.enabled && styles.statusCardEnabled]}>
        <Text style={[styles.statusText, settings.enabled && styles.statusTextEnabled]}>
          {settings.enabled ? '✅ Banner is visible to users' : '🚫 Banner is hidden'}
        </Text>
      </View>

      {/* Target Budget Picker */}
      <View style={styles.card}>
        <Text style={styles.inputLabel}>Target Budget ($)</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={settings.target_budget}
            onValueChange={(value) => setSettings(prev => ({ ...prev, target_budget: value }))}
            style={styles.picker}
            dropdownIconColor={colors.foreground.DEFAULT}
          >
            <Picker.Item label="$10" value={10} color={colors.foreground.DEFAULT} />
            <Picker.Item label="$20" value={20} color={colors.foreground.DEFAULT} />
            <Picker.Item label="$30" value={30} color={colors.foreground.DEFAULT} />
            <Picker.Item label="$50" value={50} color={colors.foreground.DEFAULT} />
            <Picker.Item label="$100" value={100} color={colors.foreground.DEFAULT} />
          </Picker>
        </View>
      </View>

      {/* Display Price IQD */}
      <View style={styles.card}>
        <Text style={styles.inputLabel}>Display Price (IQD)</Text>
        <TextInput
          value={String(settings.display_price_iqd || '')}
          onChangeText={(text) => setSettings(prev => ({ 
            ...prev, 
            display_price_iqd: text ? Number(text) : null 
          }))}
          keyboardType="numeric"
          placeholder="e.g. 15000"
          placeholderTextColor={colors.foreground.muted}
          style={[styles.input, inputStyleRTL()]}
        />
        <Text style={styles.inputHint}>
          The exact IQD amount to show (e.g., 15,000)
        </Text>
      </View>

      {/* Localized Text Inputs */}
      <Text style={styles.sectionTitle}>Banner Text (Localized)</Text>

      {/* English */}
      <View style={styles.card}>
        <Text style={styles.inputSubLabel}>English</Text>
        <TextInput
          value={settings.text_en}
          onChangeText={(text) => setSettings(prev => ({ ...prev, text_en: text }))}
          placeholder="🔥 Special Offer!"
          placeholderTextColor={colors.foreground.muted}
          style={[styles.input, inputStyleRTL()]}
        />
      </View>

      {/* Kurdish - RTL */}
      <View style={styles.card}>
        <Text style={styles.inputSubLabel}>Kurdish (کوردی)</Text>
        <TextInput
          value={settings.text_ckb}
          onChangeText={(text) => setSettings(prev => ({ ...prev, text_ckb: text }))}
          placeholder="🔥 ئۆفەری تایبەت!"
          placeholderTextColor={colors.foreground.muted}
          style={[styles.input, inputStyleRTL()]}
        />
      </View>

      {/* Arabic - RTL */}
      <View style={styles.card}>
        <Text style={styles.inputSubLabel}>Arabic (العربية)</Text>
        <TextInput
          value={settings.text_ar}
          onChangeText={(text) => setSettings(prev => ({ ...prev, text_ar: text }))}
          placeholder="🔥 عرض خاص!"
          placeholderTextColor={colors.foreground.muted}
          style={[styles.input, inputStyleRTL()]}
        />
      </View>

      {/* Live Preview */}
      <Text style={styles.sectionTitle}>{t('livePreview')}</Text>
      <View style={styles.previewCard}>
        <LinearGradient
          colors={['#7C3AED', '#A855F7', '#EC4899']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.previewBanner}
        >
          <View style={styles.previewContent}>
            <View style={styles.previewLeft}>
              <View style={styles.previewIconContainer}>
                <Sparkles size={20} color="#FFF" />
              </View>
              <Text style={styles.previewText}>{previewText}</Text>
            </View>
          </View>
          <Text style={styles.previewPrice}>
            ${settings.target_budget} = {(settings.display_price_iqd || 0).toLocaleString()} IQD
          </Text>
          <View style={styles.previewFooter}>
            <Text style={styles.previewFooterText}>{t('tapToCreateYourAdNow')}</Text>
            <ArrowRight size={16} color="#FFF" style={iconTransformRTL()} />
          </View>
        </LinearGradient>
      </View>

      {/* Save Button */}
      <TouchableOpacity
        onPress={handleSave}
        disabled={saving}
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
      >
        {saving ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <>
            <Save size={20} color="#FFF" />
            <Text style={styles.saveButtonText}>Save Promo Settings</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const createStyles = (colors: any, insets: any, typography: any) =>
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
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    headerTitle: {
      fontSize: 24,
      fontFamily: 'Poppins-Bold',
      color: colors.foreground.DEFAULT,
      marginStart: spacing.sm,
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
    },
    switchDescription: {
      ...typography.caption,
      color: colors.foreground.muted,
      fontSize: 12,
    },
    statusCard: {
      padding: spacing.sm,
      borderRadius: borderRadius.input,
      backgroundColor: colors.border.DEFAULT,
      marginBottom: spacing.md,
    },
    statusCardEnabled: {
      backgroundColor: 'rgba(34, 197, 94, 0.1)',
    },
    statusText: {
      color: colors.foreground.muted,
      fontSize: 14,
    },
    statusTextEnabled: {
      color: '#22c55e',
    },
    inputLabel: {
      ...typography.label,
      color: colors.foreground.DEFAULT,
      fontFamily: 'Poppins-SemiBold',
      marginBottom: spacing.xs,
    },
    inputSubLabel: {
      ...typography.caption,
      color: colors.foreground.muted,
      marginBottom: spacing.xs / 2,
      fontSize: 12,
    },
    inputHint: {
      ...typography.caption,
      color: colors.foreground.muted,
      fontSize: 12,
      marginTop: spacing.xs / 2,
    },
    input: {
      backgroundColor: colors.background.DEFAULT,
      borderRadius: borderRadius.input,
      padding: spacing.md,
      color: colors.foreground.DEFAULT,
      fontFamily: 'Poppins-Regular',
      borderWidth: 1,
      borderColor: colors.border.DEFAULT,
      fontSize: 16,
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
    sectionTitle: {
      ...typography.h3,
      color: colors.foreground.DEFAULT,
      fontFamily: 'Poppins-SemiBold',
      marginBottom: spacing.sm,
      marginTop: spacing.xs,
    },
    previewCard: {
      marginBottom: spacing.lg,
    },
    previewBanner: {
      borderRadius: borderRadius.card,
      padding: spacing.lg,
    },
    previewContent: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    previewContentRTL: {
      flexDirection: 'row',
    },
    previewLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    previewIconContainer: {
      padding: spacing.xs,
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderRadius: 20,
      marginEnd: spacing.sm,
    },
    previewText: {
      color: '#FFF',
      fontFamily: 'Poppins-Bold',
      fontSize: 18,
      flex: 1,
    },
    previewPrice: {
      color: '#FFF',
      fontFamily: 'Poppins-Bold',
      fontSize: 20,
      marginBottom: spacing.sm,
    },
    previewFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      opacity: 0.8,
    },
    previewFooterText: {
      color: '#FFF',
      fontSize: 14,
      marginEnd: spacing.xs / 2,
    },
    saveButton: {
      backgroundColor: colors.primary.DEFAULT,
      padding: spacing.md,
      borderRadius: borderRadius.button,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.xl,
    },
    saveButtonDisabled: {
      opacity: 0.7,
    },
    saveButtonText: {
      color: '#FFF',
      fontFamily: 'Poppins-SemiBold',
      fontSize: 16,
      marginStart: spacing.xs,
    },
  });

