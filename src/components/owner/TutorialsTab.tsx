import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { CenterModal } from '@/components/common/CenterModal';
import { Video, Plus, Edit2, Trash2, X, Play } from 'lucide-react-native';
import { supabase } from '@/integrations/supabase/client';
import { spacing, borderRadius } from '@/theme/spacing';
import { toast } from '@/utils/toast';
import { inputStyleRTL } from '@/utils/rtl';
import { useLanguage } from '@/contexts/LanguageContext';
import { translateErrorMessage } from '@/utils/errorTranslator';

interface Tutorial {
  id: string;
  title_en: string;
  title_ckb?: string | null;
  title_ar?: string | null;
  description_en: string;
  description_ckb?: string | null;
  description_ar?: string | null;
  video_url: string;
  display_order: number;
  is_active?: boolean;
  created_at: string;
  updated_at?: string;
}

/** Stored in app_settings key signup_tutorial. Shown as tutorial link on Sign Up page. */
interface SignupTutorialSettings {
  video_url: string;
  title_en: string;
  title_ckb: string;
  title_ar: string;
}

const defaultSignupTutorial: SignupTutorialSettings = {
  video_url: '',
  title_en: 'Watch sign-up tutorial',
  title_ckb: '',
  title_ar: '',
};

interface TutorialsTabProps {
  colors: any;
  t: (key: string) => string;
}

export const TutorialsTab: React.FC<TutorialsTabProps> = ({ colors, t }) => {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [signupTutorial, setSignupTutorial] = useState<SignupTutorialSettings>(defaultSignupTutorial);
  const [signupTutorialSaving, setSignupTutorialSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingTutorial, setEditingTutorial] = useState<Tutorial | null>(null);
  const [formData, setFormData] = useState({
    title_en: '',
    title_ckb: '',
    title_ar: '',
    description_en: '',
    description_ckb: '',
    description_ar: '',
    video_url: '',
    display_order: 0,
    is_active: true,
  });

  useEffect(() => {
    fetchTutorials();
    fetchSignupTutorial();
  }, []);

  const fetchSignupTutorial = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('app-settings', {
        body: { action: 'get', key: 'signup_tutorial' },
      });
      if (error) return;
      const value = data?.settings?.value ?? data?.value;
      if (value && typeof value === 'object') {
        setSignupTutorial({
          video_url: value.video_url ?? '',
          title_en: value.title_en ?? defaultSignupTutorial.title_en,
          title_ckb: value.title_ckb ?? '',
          title_ar: value.title_ar ?? '',
        });
      }
    } catch {
      // ignore
    }
  };

  const saveSignupTutorial = async () => {
    setSignupTutorialSaving(true);
    try {
      const { error } = await supabase.functions.invoke('app-settings', {
        body: {
          action: 'set',
          key: 'signup_tutorial',
          value: {
            video_url: signupTutorial.video_url.trim(),
            title_en: signupTutorial.title_en.trim() || defaultSignupTutorial.title_en,
            title_ckb: signupTutorial.title_ckb.trim(),
            title_ar: signupTutorial.title_ar.trim(),
          },
        },
      });
      if (error) throw error;
      toast.success('Saved', 'Sign up page tutorial updated');
    } catch (err: any) {
      toast.error('Error', err?.message || 'Failed to save');
    } finally {
      setSignupTutorialSaving(false);
    }
  };

  const fetchTutorials = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('owner-content', {
        body: { type: 'tutorials', action: 'list' },
      });

      if (error) throw error;
      setTutorials(data?.tutorials || []);
    } catch (err: any) {
      console.error('Failed to fetch tutorials:', err);
      const msg = err?.message || (err?.data?.error ? translateErrorMessage(String(err.data.error), (language || 'ckb') as 'ckb' | 'ar') : (language === 'ar' ? 'حدث خطأ. يرجى المحاولة مرة أخرى.' : 'هەڵەیەک ڕویدا. تکایە دووبارە هەوڵبدە.'));
      toast.error(language === 'ckb' ? 'هەڵە' : 'خطأ', msg);
      setTutorials([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingTutorial(null);
    setFormData({
      title_en: '',
      title_ckb: '',
      title_ar: '',
      description_en: '',
      description_ckb: '',
      description_ar: '',
      video_url: '',
      display_order: tutorials.length,
      is_active: true,
    });
    setShowModal(true);
  };

  const handleEdit = (tutorial: Tutorial) => {
    setEditingTutorial(tutorial);
    setFormData({
      title_en: tutorial.title_en || '',
      title_ckb: tutorial.title_ckb || '',
      title_ar: tutorial.title_ar || '',
      description_en: tutorial.description_en || '',
      description_ckb: tutorial.description_ckb || '',
      description_ar: tutorial.description_ar || '',
      video_url: tutorial.video_url || '',
      display_order: tutorial.display_order || 0,
      is_active: tutorial.is_active ?? true,
    });
    setShowModal(true);
  };

  const handleDelete = (tutorial: Tutorial) => {
    Alert.alert(
      'Delete Tutorial',
      'Are you sure you want to delete this tutorial?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data, error } = await supabase.functions.invoke('owner-content', {
                body: {
                  type: 'tutorials',
                  action: 'delete',
                  id: tutorial.id,
                },
              });

              if (error) throw error;

              if (data?.success !== false) {
                toast.success('Success', 'Operation completed');
                fetchTutorials();
              } else {
                const msg = translateErrorMessage(data?.error ?? '', (language || 'ckb') as 'ckb' | 'ar');
                toast.error(language === 'ckb' ? 'هەڵە' : 'خطأ', msg);
                return;
              }
            } catch (err: any) {
              const msg = translateErrorMessage('', (language || 'ckb') as 'ckb' | 'ar');
              toast.error(language === 'ckb' ? 'هەڵە' : 'خطأ', msg);
            }
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    const genericError = language === 'ar' ? 'حدث خطأ. يرجى المحاولة مرة أخرى.' : 'هەڵەیەک ڕویدا. تکایە دووبارە هەوڵبدە.';
    const errorTitle = language === 'ckb' ? 'هەڵە' : 'خطأ';
    if (!formData.title_en.trim() || !formData.video_url.trim()) {
      toast.error(errorTitle, genericError);
      return;
    }

    if (!formData.description_en.trim()) {
      toast.error(errorTitle, genericError);
      return;
    }

    try {
      const payload: any = {
        title_en: formData.title_en.trim(),
        description_en: formData.description_en.trim(),
        video_url: formData.video_url.trim(),
        display_order: formData.display_order,
        is_active: formData.is_active,
      };

      // Add optional fields only if they have content
      if (formData.title_ckb.trim()) payload.title_ckb = formData.title_ckb.trim();
      if (formData.title_ar.trim()) payload.title_ar = formData.title_ar.trim();
      if (formData.description_ckb.trim()) payload.description_ckb = formData.description_ckb.trim();
      if (formData.description_ar.trim()) payload.description_ar = formData.description_ar.trim();

      if (editingTutorial) {
        const { data, error } = await supabase.functions.invoke('owner-content', {
          body: {
            type: 'tutorials',
            action: 'update',
            id: editingTutorial.id,
            data: payload,
          },
        });

        if (error) throw error;
        if (data?.success === false) {
          const msg = translateErrorMessage(data?.error ?? '', (language || 'ckb') as 'ckb' | 'ar');
          toast.error(language === 'ckb' ? 'هەڵە' : 'خطأ', msg);
          return;
        }

        toast.success('Success', 'Operation completed');
      } else {
        const { data, error } = await supabase.functions.invoke('owner-content', {
          body: {
            type: 'tutorials',
            action: 'create',
            data: payload,
          },
        });

        if (error) throw error;
        if (data?.success === false) {
          const msg = translateErrorMessage(data?.error ?? '', (language || 'ckb') as 'ckb' | 'ar');
          toast.error(language === 'ckb' ? 'هەڵە' : 'خطأ', msg);
          return;
        }

        toast.success('Success', 'Operation completed');
      }
      setShowModal(false);
      fetchTutorials();
    } catch (err: any) {
      const msg = err?.data?.error ? translateErrorMessage(String(err.data.error), (language || 'ckb') as 'ckb' | 'ar') : translateErrorMessage('', (language || 'ckb') as 'ckb' | 'ar');
      toast.error(language === 'ckb' ? 'هەڵە' : 'خطأ', msg);
    }
  };

  const styles = createStyles(colors);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('tutorials') || 'Tutorials'}</Text>
          <Text style={styles.subtitle}>Manage tutorial videos and guides</Text>
        </View>

        {/* Sign Up Page Tutorial — stored in app_settings signup_tutorial; shown on Sign Up page */}
        <View style={styles.signupTutorialCard}>
          <Text style={styles.signupTutorialCardTitle}>Sign Up Page Tutorial</Text>
          <Text style={styles.signupTutorialCardSubtitle}>
            Set a YouTube video and button text shown on the Sign Up page. If empty, nothing is shown.
          </Text>
          <Text style={styles.inputLabel}>YouTube video URL</Text>
          <TextInput
            style={[styles.input, inputStyleRTL()]}
            value={signupTutorial.video_url}
            onChangeText={(text) => setSignupTutorial((s) => ({ ...s, video_url: text }))}
            placeholder="https://www.youtube.com/watch?v=..."
            placeholderTextColor={colors.foreground.muted}
            autoCapitalize="none"
          />
          <Text style={styles.inputLabel}>Button text (English)</Text>
          <TextInput
            style={[styles.input, inputStyleRTL()]}
            value={signupTutorial.title_en}
            onChangeText={(text) => setSignupTutorial((s) => ({ ...s, title_en: text }))}
            placeholder="e.g. Watch sign-up tutorial"
            placeholderTextColor={colors.foreground.muted}
          />
          <Text style={styles.inputLabel}>Button text (Kurdish)</Text>
          <TextInput
            style={[styles.input, inputStyleRTL()]}
            value={signupTutorial.title_ckb}
            onChangeText={(text) => setSignupTutorial((s) => ({ ...s, title_ckb: text }))}
            placeholder="کوردی"
            placeholderTextColor={colors.foreground.muted}
          />
          <Text style={styles.inputLabel}>Button text (Arabic)</Text>
          <TextInput
            style={[styles.input, inputStyleRTL()]}
            value={signupTutorial.title_ar}
            onChangeText={(text) => setSignupTutorial((s) => ({ ...s, title_ar: text }))}
            placeholder="العربية"
            placeholderTextColor={colors.foreground.muted}
          />
          <TouchableOpacity
            style={[styles.signupTutorialSaveButton, signupTutorialSaving && styles.buttonDisabled]}
            onPress={saveSignupTutorial}
            disabled={signupTutorialSaving}
          >
            {signupTutorialSaving ? (
              <ActivityIndicator size="small" color={colors.primary.foreground} />
            ) : (
              <Text style={styles.signupTutorialSaveButtonText}>Save Sign Up Tutorial</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
          <Plus size={20} color={colors.primary.foreground} />
          <Text style={styles.addButtonText}>Add Tutorial</Text>
        </TouchableOpacity>

        {tutorials.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Video size={48} color={colors.foreground.muted} />
            <Text style={styles.emptyText}>No tutorials yet</Text>
            <Text style={styles.emptySubtext}>Add your first tutorial to get started</Text>
          </View>
        ) : (
          <View style={styles.tutorialsList}>
            {tutorials.map((tutorial) => (
              <View key={tutorial.id} style={styles.tutorialCard}>
                <View style={styles.tutorialHeader}>
                  <View style={styles.tutorialIcon}>
                    <Play size={20} color={colors.primary.DEFAULT} />
                  </View>
                  <View style={styles.tutorialInfo}>
                    <Text style={styles.tutorialTitle} numberOfLines={2}>
                      {tutorial.title_en || tutorial.title_ckb || tutorial.title_ar || 'Untitled'}
                    </Text>
                    <Text style={styles.tutorialDescription} numberOfLines={2}>
                      {tutorial.description_en || tutorial.description_ckb || tutorial.description_ar || 'No description'}
                    </Text>
                    <Text style={styles.tutorialMeta}>
                      Order: {tutorial.display_order ?? 0} • {tutorial.video_url ? 'Video URL set' : 'No video'}
                    </Text>
                  </View>
                  <View style={styles.tutorialActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleEdit(tutorial)}
                    >
                      <Edit2 size={16} color={colors.primary.DEFAULT} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleDelete(tutorial)}
                    >
                      <Trash2 size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add/Edit Modal — centered, keyboard-aware */}
      <CenterModal visible={showModal} onRequestClose={() => setShowModal(false)} keyboardAware>
        <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingTutorial ? 'Edit Tutorial' : 'Add Tutorial'}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <X size={24} color={colors.foreground.DEFAULT} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Text style={styles.inputLabel}>English Title *</Text>
              <TextInput
                style={[styles.input, inputStyleRTL()]}
                value={formData.title_en}
                onChangeText={(text) => setFormData({ ...formData, title_en: text })}
                placeholder="Enter tutorial title in English"
                placeholderTextColor={colors.foreground.muted}
              />

              <Text style={styles.inputLabel}>Kurdish Title</Text>
              <TextInput
                style={[styles.input, inputStyleRTL()]}
                value={formData.title_ckb}
                onChangeText={(text) => setFormData({ ...formData, title_ckb: text })}
                placeholder="Enter tutorial title in Kurdish"
                placeholderTextColor={colors.foreground.muted}
              />

              <Text style={styles.inputLabel}>Arabic Title</Text>
              <TextInput
                style={[styles.input, inputStyleRTL()]}
                value={formData.title_ar}
                onChangeText={(text) => setFormData({ ...formData, title_ar: text })}
                placeholder="Enter tutorial title in Arabic"
                placeholderTextColor={colors.foreground.muted}
              />

              <Text style={styles.inputLabel}>English Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea, inputStyleRTL()]}
                value={formData.description_en}
                onChangeText={(text) => setFormData({ ...formData, description_en: text })}
                placeholder="Enter tutorial description in English"
                placeholderTextColor={colors.foreground.muted}
                multiline
                numberOfLines={4}
              />

              <Text style={styles.inputLabel}>Kurdish Description</Text>
              <TextInput
                style={[styles.input, styles.textArea, inputStyleRTL()]}
                value={formData.description_ckb}
                onChangeText={(text) => setFormData({ ...formData, description_ckb: text })}
                placeholder="Enter tutorial description in Kurdish"
                placeholderTextColor={colors.foreground.muted}
                multiline
                numberOfLines={4}
              />

              <Text style={styles.inputLabel}>Arabic Description</Text>
              <TextInput
                style={[styles.input, styles.textArea, inputStyleRTL()]}
                value={formData.description_ar}
                onChangeText={(text) => setFormData({ ...formData, description_ar: text })}
                placeholder="Enter tutorial description in Arabic"
                placeholderTextColor={colors.foreground.muted}
                multiline
                numberOfLines={4}
              />

              <Text style={styles.inputLabel}>Video URL *</Text>
              <TextInput
                style={[styles.input, inputStyleRTL()]}
                value={formData.video_url}
                onChangeText={(text) => setFormData({ ...formData, video_url: text })}
                placeholder="Enter video URL (YouTube, Vimeo, etc.)"
                placeholderTextColor={colors.foreground.muted}
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>Display Order</Text>
              <TextInput
                style={[styles.input, inputStyleRTL()]}
                value={(formData.display_order ?? 0).toString()}
                onChangeText={(text) =>
                  setFormData({ ...formData, display_order: parseInt(text) || 0 })
                }
                placeholder="Display order"
                placeholderTextColor={colors.foreground.muted}
                keyboardType="numeric"
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSave}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
      </CenterModal>
    </View>
  );
};

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.DEFAULT,
    },
    scrollView: {
      flex: 1,
    },
    contentContainer: {
      padding: spacing.md,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    header: {
      marginBottom: spacing.lg,
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.foreground.DEFAULT,
      marginBottom: spacing.xs,
    },
    subtitle: {
      fontSize: 14,
      color: colors.foreground.muted,
    },
    signupTutorialCard: {
      backgroundColor: colors.card.background,
      borderRadius: borderRadius.card,
      padding: spacing.md,
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border.DEFAULT,
    },
    signupTutorialCardTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.foreground.DEFAULT,
      marginBottom: spacing.xs,
    },
    signupTutorialCardSubtitle: {
      fontSize: 13,
      color: colors.foreground.muted,
      marginBottom: spacing.md,
    },
    signupTutorialSaveButton: {
      backgroundColor: colors.primary.DEFAULT,
      padding: spacing.md,
      borderRadius: borderRadius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: spacing.md,
    },
    signupTutorialSaveButtonText: {
      color: colors.primary.foreground,
      fontSize: 16,
      fontWeight: '600',
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      backgroundColor: colors.primary.DEFAULT,
      padding: spacing.md,
      borderRadius: borderRadius.card,
      marginBottom: spacing.lg,
    },
    addButtonText: {
      color: colors.primary.foreground,
      fontSize: 16,
      fontWeight: '600',
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.xl * 2,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.foreground.DEFAULT,
      marginTop: spacing.md,
      marginBottom: spacing.xs,
    },
    emptySubtext: {
      fontSize: 14,
      color: colors.foreground.muted,
      textAlign: 'center',
      paddingHorizontal: spacing.lg,
    },
    tutorialsList: {
      gap: spacing.md,
    },
    tutorialCard: {
      backgroundColor: colors.card.background,
      borderRadius: borderRadius.card,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border.DEFAULT,
    },
    tutorialHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
    },
    tutorialIcon: {
      width: 40,
      height: 40,
      borderRadius: borderRadius.sm,
      backgroundColor: colors.primary.DEFAULT + '20',
      alignItems: 'center',
      justifyContent: 'center',
    },
    tutorialInfo: {
      flex: 1,
    },
    tutorialTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.foreground.DEFAULT,
      marginBottom: spacing.xs,
    },
    tutorialDescription: {
      fontSize: 14,
      color: colors.foreground.muted,
      marginBottom: spacing.xs,
    },
    tutorialMeta: {
      fontSize: 12,
      color: colors.foreground.muted,
    },
    tutorialActions: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    actionButton: {
      padding: spacing.xs,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.overlay.dark,
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.card.background,
      borderTopLeftRadius: borderRadius.card,
      borderTopRightRadius: borderRadius.card,
      maxHeight: '90%',
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
      fontSize: 20,
      fontWeight: '700',
      color: colors.foreground.DEFAULT,
    },
    modalScroll: {
      maxHeight: 500,
      padding: spacing.md,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.foreground.DEFAULT,
      marginBottom: spacing.xs,
      marginTop: spacing.sm,
    },
    input: {
      backgroundColor: colors.background.DEFAULT,
      borderRadius: borderRadius.sm,
      padding: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border.DEFAULT,
      color: colors.foreground.DEFAULT,
      fontSize: 14,
    },
    textArea: {
      minHeight: 100,
      textAlignVertical: 'top',
    },
    modalActions: {
      flexDirection: 'row',
      gap: spacing.sm,
      padding: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border.DEFAULT,
    },
    modalButton: {
      flex: 1,
      padding: spacing.md,
      borderRadius: borderRadius.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelButton: {
      backgroundColor: colors.background.DEFAULT,
      borderWidth: 1,
      borderColor: colors.border.DEFAULT,
    },
    cancelButtonText: {
      color: colors.foreground.DEFAULT,
      fontSize: 16,
      fontWeight: '600',
    },
    saveButton: {
      backgroundColor: colors.primary.DEFAULT,
    },
    saveButtonText: {
      color: colors.primary.foreground,
      fontSize: 16,
      fontWeight: '600',
    },
  });

