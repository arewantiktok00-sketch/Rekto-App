import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
  Switch,
} from 'react-native';
import { HelpCircle, Plus, Edit2, Trash2, X } from 'lucide-react-native';
import { supabase } from '@/integrations/supabase/client';
import { spacing, borderRadius } from '@/theme/spacing';
import { toast } from '@/utils/toast';
import { inputStyleRTL } from '@/utils/rtl';

interface FAQ {
  id: string;
  question_en: string;
  answer_en: string;
  question_ckb: string | null;
  answer_ckb: string | null;
  question_ar: string | null;
  answer_ar: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface FAQsTabProps {
  colors: any;
  t: (key: string) => string;
}

export const FAQsTab: React.FC<FAQsTabProps> = ({ colors, t }) => {
  const [loading, setLoading] = useState(true);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [formData, setFormData] = useState({
    question_en: '',
    answer_en: '',
    question_ckb: '',
    answer_ckb: '',
    question_ar: '',
    answer_ar: '',
    display_order: 0,
    is_active: true,
  });

  useEffect(() => {
    fetchFAQs();
  }, []);

  const fetchFAQs = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('owner-content', {
        body: { type: 'faqs', action: 'list' },
      });

      if (error) throw error;
      setFaqs(data?.faqs || []);
    } catch (err: any) {
      console.error('Failed to fetch FAQs:', err);
      toast.error('Error', 'Something went wrong');
      setFaqs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingFaq(null);
    setFormData({
      question_en: '',
      answer_en: '',
      question_ckb: '',
      answer_ckb: '',
      question_ar: '',
      answer_ar: '',
      display_order: faqs.length,
      is_active: true,
    });
    setShowModal(true);
  };

  const handleEdit = (faq: FAQ) => {
    setEditingFaq(faq);
    setFormData({
      question_en: faq.question_en || '',
      answer_en: faq.answer_en || '',
      question_ckb: faq.question_ckb || '',
      answer_ckb: faq.answer_ckb || '',
      question_ar: faq.question_ar || '',
      answer_ar: faq.answer_ar || '',
      display_order: faq.display_order || 0,
      is_active: faq.is_active ?? true,
    });
    setShowModal(true);
  };

  const handleDelete = (faq: FAQ) => {
    Alert.alert(
      'Delete FAQ',
      'Are you sure you want to delete this FAQ?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data, error } = await supabase.functions.invoke('owner-content', {
                body: {
                  type: 'faqs',
                  action: 'delete',
                  id: faq.id,
                },
              });

              if (error) throw error;

              if (data?.success !== false) {
                toast.success('Success', 'Operation completed');
                fetchFAQs();
              } else {
                throw new Error(data?.error || 'Failed to delete FAQ');
              }
            } catch (err: any) {
              toast.error('Error', 'Something went wrong');
            }
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    if (!formData.question_en.trim() || !formData.answer_en.trim()) {
      toast.error('Error', 'Something went wrong');
      return;
    }

    try {
      const payload: any = {
        question_en: formData.question_en.trim(),
        answer_en: formData.answer_en.trim(),
        display_order: formData.display_order,
        is_active: formData.is_active,
      };

      // Add optional fields only if they have content
      if (formData.question_ckb.trim()) payload.question_ckb = formData.question_ckb.trim();
      if (formData.answer_ckb.trim()) payload.answer_ckb = formData.answer_ckb.trim();
      if (formData.question_ar.trim()) payload.question_ar = formData.question_ar.trim();
      if (formData.answer_ar.trim()) payload.answer_ar = formData.answer_ar.trim();

      if (editingFaq) {
        const { data, error } = await supabase.functions.invoke('owner-content', {
          body: {
            type: 'faqs',
            action: 'update',
            id: editingFaq.id,
            data: payload,
          },
        });

        if (error) throw error;

        toast.success('Success', 'Operation completed');
      } else {
        const { data, error } = await supabase.functions.invoke('owner-content', {
          body: {
            type: 'faqs',
            action: 'create',
            data: payload,
          },
        });

        if (error) throw error;

        toast.success('Success', 'Operation completed');
      }
      setShowModal(false);
      fetchFAQs();
    } catch (err: any) {
      toast.error('Error', 'Something went wrong');
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
          <Text style={styles.title}>{t('faq') || 'FAQs'}</Text>
          <Text style={styles.subtitle}>Manage FAQ content</Text>
        </View>

        <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
          <Plus size={20} color={colors.primary.foreground} />
          <Text style={styles.addButtonText}>Add FAQ</Text>
        </TouchableOpacity>

        {faqs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <HelpCircle size={48} color={colors.foreground.muted} />
            <Text style={styles.emptyText}>No FAQs yet</Text>
            <Text style={styles.emptySubtext}>Add your first FAQ to get started</Text>
          </View>
        ) : (
          <View style={styles.faqsList}>
            {faqs.map((faq) => (
              <View key={faq.id} style={styles.faqCard}>
                <View style={styles.faqHeader}>
                  <View style={styles.faqInfo}>
                    <View style={styles.faqTitleRow}>
                      <Text style={styles.faqQuestion} numberOfLines={2}>
                        {faq.question_en || faq.question_ckb || faq.question_ar || 'Untitled'}
                      </Text>
                      {!faq.is_active && (
                        <View style={styles.inactiveBadge}>
                          <Text style={styles.inactiveText}>Inactive</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.faqOrder}>Order: {faq.display_order}</Text>
                  </View>
                  <View style={styles.faqActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleEdit(faq)}
                    >
                      <Edit2 size={16} color={colors.primary.DEFAULT} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleDelete(faq)}
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

      {/* Add/Edit Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingFaq ? 'Edit FAQ' : 'Add FAQ'}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <X size={24} color={colors.foreground.DEFAULT} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Text style={styles.inputLabel}>English Question *</Text>
              <TextInput
                style={[styles.input, inputStyleRTL()]}
                value={formData.question_en}
                onChangeText={(text) => setFormData({ ...formData, question_en: text })}
                placeholder="Enter question in English"
                placeholderTextColor={colors.foreground.muted}
              />

              <Text style={styles.inputLabel}>English Answer *</Text>
              <TextInput
                style={[styles.input, styles.textArea, inputStyleRTL()]}
                value={formData.answer_en}
                onChangeText={(text) => setFormData({ ...formData, answer_en: text })}
                placeholder="Enter answer in English"
                placeholderTextColor={colors.foreground.muted}
                multiline
                numberOfLines={4}
              />

              <Text style={styles.inputLabel}>Kurdish Question</Text>
              <TextInput
                style={[styles.input, inputStyleRTL()]}
                value={formData.question_ckb}
                onChangeText={(text) => setFormData({ ...formData, question_ckb: text })}
                placeholder="Enter question in Kurdish"
                placeholderTextColor={colors.foreground.muted}
              />

              <Text style={styles.inputLabel}>Kurdish Answer</Text>
              <TextInput
                style={[styles.input, styles.textArea, inputStyleRTL()]}
                value={formData.answer_ckb}
                onChangeText={(text) => setFormData({ ...formData, answer_ckb: text })}
                placeholder="Enter answer in Kurdish"
                placeholderTextColor={colors.foreground.muted}
                multiline
                numberOfLines={4}
              />

              <Text style={styles.inputLabel}>Arabic Question</Text>
              <TextInput
                style={[styles.input, inputStyleRTL()]}
                value={formData.question_ar}
                onChangeText={(text) => setFormData({ ...formData, question_ar: text })}
                placeholder="Enter question in Arabic"
                placeholderTextColor={colors.foreground.muted}
              />

              <Text style={styles.inputLabel}>Arabic Answer</Text>
              <TextInput
                style={[styles.input, styles.textArea, inputStyleRTL()]}
                value={formData.answer_ar}
                onChangeText={(text) => setFormData({ ...formData, answer_ar: text })}
                placeholder="Enter answer in Arabic"
                placeholderTextColor={colors.foreground.muted}
                multiline
                numberOfLines={4}
              />

              <Text style={styles.inputLabel}>Display Order</Text>
              <TextInput
                style={[styles.input, inputStyleRTL()]}
                value={formData.display_order.toString()}
                onChangeText={(text) =>
                  setFormData({ ...formData, display_order: parseInt(text) || 0 })
                }
                placeholder="Display order"
                placeholderTextColor={colors.foreground.muted}
                keyboardType="numeric"
              />

              <View style={styles.switchContainer}>
                <Text style={styles.inputLabel}>Active</Text>
                <Switch
                  value={formData.is_active}
                  onValueChange={(value) => setFormData({ ...formData, is_active: value })}
                  trackColor={{ false: colors.border.DEFAULT, true: colors.primary.DEFAULT }}
                  thumbColor={colors.primary.foreground}
                />
              </View>
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
        </View>
      </Modal>
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
    faqsList: {
      gap: spacing.md,
    },
    faqCard: {
      backgroundColor: colors.card.background,
      borderRadius: borderRadius.card,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border.DEFAULT,
    },
    faqHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    faqInfo: {
      flex: 1,
      marginEnd: spacing.sm,
    },
    faqTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginBottom: spacing.xs,
    },
    faqQuestion: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.foreground.DEFAULT,
      flex: 1,
    },
    inactiveBadge: {
      backgroundColor: '#EF4444' + '20',
      paddingHorizontal: spacing.xs,
      paddingVertical: 2,
      borderRadius: borderRadius.badge,
    },
    inactiveText: {
      fontSize: 10,
      fontWeight: '600',
      color: '#EF4444',
    },
    faqOrder: {
      fontSize: 12,
      color: colors.foreground.muted,
    },
    faqActions: {
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
    switchContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: spacing.md,
      marginBottom: spacing.sm,
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

