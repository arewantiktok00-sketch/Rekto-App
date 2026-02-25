import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Megaphone, Save } from 'lucide-react-native';
import { getOwnerColors } from '@/theme/colors';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getTypographyStyles } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';
import { supabase } from '@/integrations/supabase/client';
import { Text } from '@/components/common/Text';
import { toast } from '@/utils/toast';
import { inputStyleRTL } from '@/utils/rtl';
import { useAppSettingsRealtime } from '@/hooks/useAppSettingsRealtime';

interface AnnouncementData {
  enabled: boolean;
  title_en: string;
  title_ckb: string;
  title_ar: string;
  message_en: string;
  message_ckb: string;
  message_ar: string;
  button_text_en: string;
  button_text_ckb: string;
  button_text_ar: string;
  button_link: string | null;
  show_close: boolean;
}

const defaultAnnouncement: AnnouncementData = {
  enabled: false,
  title_en: 'New Feature',
  title_ckb: 'تایبەتمەندی نوێ',
  title_ar: 'ميزة جديدة',
  message_en: 'We just shipped something exciting!',
  message_ckb: 'ئێمە شتێکی تایبەت دروست کردووە!',
  message_ar: 'لقد أطلقنا شيئًا مميزًا!',
  button_text_en: 'Learn more',
  button_text_ckb: 'زیاتر بزانە',
  button_text_ar: 'اعرف أكثر',
  button_link: '/create',
  show_close: true,
};

export const AnnouncementManager: React.FC = () => {
  const colors = getOwnerColors();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const typography = getTypographyStyles(language as 'ckb' | 'ar');
  const styles = createStyles(colors, insets, typography);

  const [announcement, setAnnouncement] = useState<AnnouncementData>(defaultAnnouncement);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('app-settings', {
        body: { action: 'get', key: 'global' },
      });
      if (error) throw error;
      const incoming = data?.settings?.value?.announcement as AnnouncementData | undefined;
      if (incoming) {
        setAnnouncement({
          ...defaultAnnouncement,
          ...incoming,
          button_link: incoming.button_link ?? null,
          show_close: incoming.show_close ?? true,
        });
      }
    } catch (err: any) {
      console.error('[AnnouncementManager] fetch error:', err);
      toast.error('Error', 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useAppSettingsRealtime({
    enabled: true,
    settingsKey: 'global',
    onUpdate: (payload) => {
      const updated = (payload?.new as any)?.value?.announcement as AnnouncementData | undefined;
      if (updated) {
        setAnnouncement((prev) => ({
          ...prev,
          ...updated,
          button_link: updated.button_link ?? null,
          show_close: updated.show_close ?? true,
        }));
      }
    },
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: currentData, error: currentError } = await supabase.functions.invoke(
        'app-settings',
        {
          body: { action: 'get', key: 'global' },
        }
      );
      if (currentError) throw currentError;
      const currentSettings = currentData?.settings?.value || {};
      const { error } = await supabase.functions.invoke('app-settings', {
        body: {
          action: 'update',
          key: 'global',
          value: {
            ...currentSettings,
            announcement: {
              ...announcement,
              button_link: announcement.button_link ? announcement.button_link.trim() : null,
            },
          },
        },
      });
      if (error) throw error;
      toast.success('Success', 'Operation completed');
    } catch (err: any) {
      console.error('[AnnouncementManager] save error:', err);
      Alert.alert('Error', err.message || 'Failed to save announcement');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
      </View>
    );
  }

  const isRTL = language === 'ckb' || language === 'ar';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Megaphone size={24} color={colors.primary.DEFAULT} />
        <Text style={styles.headerTitle}>Popup Announcement</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.switchRow}>
          <View style={styles.switchLabel}>
            <Text style={styles.switchTitle}>Enable Popup</Text>
            <Text style={styles.switchDescription}>
              Show announcement popup on user dashboard
            </Text>
          </View>
          <Switch
            value={announcement.enabled}
            onValueChange={(value) =>
              setAnnouncement((prev) => ({ ...prev, enabled: value }))
            }
            trackColor={{ false: colors.border.DEFAULT, true: colors.primary.DEFAULT }}
            thumbColor="#FAFAFA"
          />
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.switchRow}>
          <View style={styles.switchLabel}>
            <Text style={styles.switchTitle}>Allow Close Button</Text>
            <Text style={styles.switchDescription}>
              Show an X button so users can dismiss without clicking CTA
            </Text>
          </View>
          <Switch
            value={announcement.show_close}
            onValueChange={(value) =>
              setAnnouncement((prev) => ({ ...prev, show_close: value }))
            }
            trackColor={{ false: colors.border.DEFAULT, true: colors.primary.DEFAULT }}
            thumbColor="#FAFAFA"
          />
        </View>
      </View>

      <Text style={styles.sectionTitle}>Titles</Text>
      <View style={styles.card}>
        <Text style={styles.inputSubLabel}>English</Text>
        <TextInput
          value={announcement.title_en}
          onChangeText={(text) => setAnnouncement((prev) => ({ ...prev, title_en: text }))}
          placeholder="Title (EN)"
          placeholderTextColor={colors.foreground.muted}
          style={[styles.input, inputStyleRTL()]}
        />
      </View>
      <View style={styles.card}>
        <Text style={styles.inputSubLabel}>Kurdish (کوردی)</Text>
        <TextInput
          value={announcement.title_ckb}
          onChangeText={(text) => setAnnouncement((prev) => ({ ...prev, title_ckb: text }))}
          placeholder="ناونیشان (CKB)"
          placeholderTextColor={colors.foreground.muted}
          style={[styles.input, inputStyleRTL()]}
        />
      </View>
      <View style={styles.card}>
        <Text style={styles.inputSubLabel}>Arabic (العربية)</Text>
        <TextInput
          value={announcement.title_ar}
          onChangeText={(text) => setAnnouncement((prev) => ({ ...prev, title_ar: text }))}
          placeholder="العنوان (AR)"
          placeholderTextColor={colors.foreground.muted}
          style={[styles.input, inputStyleRTL()]}
        />
      </View>

      <Text style={styles.sectionTitle}>Messages</Text>
      <View style={styles.card}>
        <Text style={styles.inputSubLabel}>English</Text>
        <TextInput
          value={announcement.message_en}
          onChangeText={(text) => setAnnouncement((prev) => ({ ...prev, message_en: text }))}
          placeholder="Message (EN)"
          placeholderTextColor={colors.foreground.muted}
          style={[styles.input, styles.textArea, inputStyleRTL()]}
          multiline
        />
      </View>
      <View style={styles.card}>
        <Text style={styles.inputSubLabel}>Kurdish (کوردی)</Text>
        <TextInput
          value={announcement.message_ckb}
          onChangeText={(text) => setAnnouncement((prev) => ({ ...prev, message_ckb: text }))}
          placeholder="پەیام (CKB)"
          placeholderTextColor={colors.foreground.muted}
          style={[styles.input, styles.textArea, inputStyleRTL()]}
          multiline
        />
      </View>
      <View style={styles.card}>
        <Text style={styles.inputSubLabel}>Arabic (العربية)</Text>
        <TextInput
          value={announcement.message_ar}
          onChangeText={(text) => setAnnouncement((prev) => ({ ...prev, message_ar: text }))}
          placeholder="رسالة (AR)"
          placeholderTextColor={colors.foreground.muted}
          style={[styles.input, styles.textArea, inputStyleRTL()]}
          multiline
        />
      </View>

      <Text style={styles.sectionTitle}>Button Text</Text>
      <View style={styles.card}>
        <Text style={styles.inputSubLabel}>English</Text>
        <TextInput
          value={announcement.button_text_en}
          onChangeText={(text) =>
            setAnnouncement((prev) => ({ ...prev, button_text_en: text }))
          }
          placeholder="Button text (EN)"
          placeholderTextColor={colors.foreground.muted}
          style={[styles.input, inputStyleRTL()]}
        />
      </View>
      <View style={styles.card}>
        <Text style={styles.inputSubLabel}>Kurdish (کوردی)</Text>
        <TextInput
          value={announcement.button_text_ckb}
          onChangeText={(text) =>
            setAnnouncement((prev) => ({ ...prev, button_text_ckb: text }))
          }
          placeholder="دەقەی دوگمە (CKB)"
          placeholderTextColor={colors.foreground.muted}
          style={[styles.input, inputStyleRTL()]}
        />
      </View>
      <View style={styles.card}>
        <Text style={styles.inputSubLabel}>Arabic (العربية)</Text>
        <TextInput
          value={announcement.button_text_ar}
          onChangeText={(text) =>
            setAnnouncement((prev) => ({ ...prev, button_text_ar: text }))
          }
          placeholder="نص الزر (AR)"
          placeholderTextColor={colors.foreground.muted}
          style={[styles.input, inputStyleRTL()]}
        />
      </View>

      <Text style={styles.sectionTitle}>Button Link</Text>
      <View style={styles.card}>
        <Text style={styles.inputSubLabel}>Internal route or URL</Text>
        <TextInput
          value={announcement.button_link || ''}
          onChangeText={(text) =>
            setAnnouncement((prev) => ({ ...prev, button_link: text }))
          }
          placeholder="/create or https://example.com"
          placeholderTextColor={colors.foreground.muted}
          style={[styles.input, inputStyleRTL()]}
          autoCapitalize="none"
        />
      </View>

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
            <Text style={styles.saveButtonText}>Save Announcement</Text>
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
    sectionTitle: {
      ...typography.h3,
      color: colors.foreground.DEFAULT,
      fontFamily: 'Poppins-SemiBold',
      marginBottom: spacing.sm,
      marginTop: spacing.xs,
    },
    inputSubLabel: {
      ...typography.caption,
      color: colors.foreground.muted,
      marginBottom: spacing.xs / 2,
      fontSize: 12,
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
    textArea: {
      minHeight: 90,
      textAlignVertical: 'top',
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

