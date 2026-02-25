import { ScreenHeader } from '@/components/common/ScreenHeader';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase, supabaseRead } from '@/integrations/supabase/client';
import { getOwnerColors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { getFontFamilyByLanguage } from '@/utils/fonts';
import { inputStyleRTL } from '@/utils/rtl';
import { FileText, Save, Tag, Type } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const LANGUAGES = [
  { code: 'ckb', label: 'Kurdish' },
  { code: 'ar', label: 'Arabic' },
];

interface Slide {
  title_en: string;
  title_ckb: string;
  title_ar: string;
  subtitle_en: string;
  subtitle_ckb: string;
  subtitle_ar: string;
  tag_en: string;
  tag_ckb: string;
  tag_ar: string;
}

export const BannerContentManager: React.FC = () => {
  const insets = useSafeAreaInsets();
  const colors = getOwnerColors();
  const { language } = useLanguage();
  const fontFamily = getFontFamilyByLanguage(language || 'ckb');
  const styles = createStyles(colors, insets, fontFamily);
  const navigation = require('@react-navigation/native').useNavigation();

  const [slides, setSlides] = useState<Slide[]>([
    {
      title_en: '',
      title_ckb: '',
      title_ar: '',
      subtitle_en: '',
      subtitle_ckb: '',
      subtitle_ar: '',
      tag_en: '',
      tag_ckb: '',
      tag_ar: '',
    },
    {
      title_en: '',
      title_ckb: '',
      title_ar: '',
      subtitle_en: '',
      subtitle_ckb: '',
      subtitle_ar: '',
      tag_en: '',
      tag_ckb: '',
      tag_ar: '',
    },
    {
      title_en: '',
      title_ckb: '',
      title_ar: '',
      subtitle_en: '',
      subtitle_ckb: '',
      subtitle_ar: '',
      tag_en: '',
      tag_ckb: '',
      tag_ar: '',
    },
  ]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadBannerContent();
  }, []);

  const loadBannerContent = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabaseRead
        .from('app_settings')
        .select('value')
        .eq('key', 'banner_content')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data?.value?.slides) {
        setSlides(data.value.slides);
      }
    } catch (error) {
      console.error('Failed to load banner content:', error);
      Alert.alert('Error', 'Failed to load banner content');
    } finally {
      setLoading(false);
    }
  };

  const saveBannerContent = async () => {
    setSaving(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('owner-content', {
        body: {
          action: 'update-banner-content',
          slides,
        },
        headers: {
          Authorization: `Bearer ${session?.session?.access_token}`,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      Alert.alert('Success', 'Banner content updated successfully');
    } catch (error: any) {
      console.error('Failed to save banner content:', error);
      Alert.alert('Error', error.message || 'Failed to save banner content');
    } finally {
      setSaving(false);
    }
  };

  const updateSlide = (index: number, field: string, value: string) => {
    const updated = [...slides];
    updated[index] = { ...updated[index], [field]: value };
    setSlides(updated);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background.DEFAULT} />
      <ScreenHeader
        title="Banner Content"
        subtitle="Edit the 3 rotating slides on the user dashboard"
        onBack={() => navigation.goBack()}
        style={{ paddingTop: insets.top + 16, backgroundColor: colors.background.DEFAULT, borderBottomColor: colors.border.DEFAULT }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: 16, paddingBottom: 40 }]}
      >
        {slides.map((slide, slideIndex) => (
          <View key={slideIndex} style={styles.slideCard}>
            <View style={styles.slideHeader}>
              <View style={styles.slideBadge}>
                <Text style={styles.slideBadgeText}>Slide {slideIndex + 1}</Text>
              </View>
            </View>
            {LANGUAGES.map((lang) => (
              <View key={lang.code} style={styles.langSection}>
                <Text style={styles.langLabel}>{lang.label}</Text>

                {/* Tag */}
                <View style={styles.inputGroup}>
                  <Tag color="#A1A1AA" size={16} />
                  <TextInput
                    style={[styles.input, inputStyleRTL()]}
                    placeholder={`Tag (${lang.label})`}
                    placeholderTextColor="#71717A"
                    value={slide[`tag_${lang.code}` as keyof Slide] as string}
                    onChangeText={(v) =>
                      updateSlide(slideIndex, `tag_${lang.code}`, v)
                    }
                  />
                </View>
                {/* Title */}
                <View style={styles.inputGroup}>
                  <Type color="#A1A1AA" size={16} />
                  <TextInput
                    style={[styles.input, inputStyleRTL()]}
                    placeholder={`Title (${lang.label})`}
                    placeholderTextColor="#71717A"
                    value={slide[`title_${lang.code}` as keyof Slide] as string}
                    onChangeText={(v) =>
                      updateSlide(slideIndex, `title_${lang.code}`, v)
                    }
                  />
                </View>
                {/* Subtitle */}
                <View style={styles.inputGroup}>
                  <FileText color="#A1A1AA" size={16} />
                  <TextInput
                    style={[styles.input, styles.textArea, inputStyleRTL()]}
                    placeholder={`Subtitle (${lang.label})`}
                    placeholderTextColor="#71717A"
                    multiline
                    numberOfLines={2}
                    value={slide[`subtitle_${lang.code}` as keyof Slide] as string}
                    onChangeText={(v) =>
                      updateSlide(slideIndex, `subtitle_${lang.code}`, v)
                    }
                  />
                </View>
              </View>
            ))}
          </View>
        ))}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={saveBannerContent}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.primary.foreground} />
          ) : (
            <>
              <Save color={colors.primary.foreground} size={20} />
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const createStyles = (colors: any, insets: any, fontFamily: string) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.DEFAULT,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#0A0A0F',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: insets.top + spacing.md,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
      backgroundColor: colors.card.background || '#1A1A2E',
      borderBottomWidth: 1,
      borderBottomColor: colors.border.DEFAULT,
    },
    backButton: {
      marginEnd: spacing.md,
    },
    headerContent: {
      flex: 1,
    },
    title: {
      fontSize: 24,
      fontFamily: fontFamily === 'Rabar_021' ? 'Rabar_021' : 'Poppins-Bold',
      color: colors.foreground.DEFAULT,
    },
    subtitle: {
      fontSize: 14,
      fontFamily: fontFamily === 'Rabar_021' ? 'Rabar_021' : 'Poppins-Regular',
      color: colors.foreground.muted,
      marginTop: 4,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: spacing.md,
      paddingBottom: insets.bottom + spacing.xl,
    },
    slideCard: {
      backgroundColor: colors.card.background,
      borderRadius: 16,
      marginBottom: spacing.md,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border.DEFAULT,
    },
    slideHeader: {
      marginBottom: spacing.md,
    },
    slideBadge: {
      backgroundColor: colors.primary.DEFAULT + '30',
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
      alignSelf: 'flex-start',
    },
    slideBadgeText: {
      fontSize: 12,
      fontFamily: 'Poppins-SemiBold',
      color: colors.primary.DEFAULT,
    },
    langSection: {
      marginBottom: spacing.md,
      paddingBottom: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    langLabel: {
      fontSize: 12,
      fontFamily: 'Poppins-SemiBold',
      color: colors.foreground.muted,
      marginBottom: spacing.sm,
      textTransform: 'uppercase',
    },
    inputGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.input.background,
      borderRadius: 8,
      paddingHorizontal: 12,
      marginBottom: spacing.sm,
      gap: spacing.xs,
      borderWidth: 1,
      borderColor: colors.input.border,
    },
    input: {
      flex: 1,
      paddingVertical: 12,
      fontSize: 14,
      fontFamily: 'Poppins-Regular',
      color: colors.foreground.DEFAULT,
    },
    textArea: {
      minHeight: 60,
      textAlignVertical: 'top',
    },
    rtlInput: {
      textAlign: 'right',
      fontFamily: 'Rabar_021',
    },
    saveButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#7C3AED',
      marginTop: spacing.md,
      paddingVertical: 16,
      borderRadius: 12,
      gap: spacing.xs,
    },
    saveButtonDisabled: {
      opacity: 0.6,
    },
    saveButtonText: {
      fontSize: 16,
      fontFamily: 'Poppins-SemiBold',
    color: colors.primary.foreground,
    },
  });
