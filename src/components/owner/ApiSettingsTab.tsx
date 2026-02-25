import { Text } from '@/components/common/Text';
import { ownerApi } from '@/services/ownerApi';
import { borderRadius, spacing } from '@/theme/spacing';
import { inputStyleRTL } from '@/utils/rtl';
import { toast } from '@/utils/toast';
import { Eye, EyeOff, Key, Plus, RefreshCw, Settings, Trash2, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

interface ApiSettingsTabProps {
  colors: any;
  t: (key: string) => string;
}

export const ApiSettingsTab: React.FC<ApiSettingsTabProps> = ({ colors, t }) => {
  const [loading, setLoading] = useState(true);
  const [apiConfigs, setApiConfigs] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingConfig, setAddingConfig] = useState(false);
  const [formData, setFormData] = useState({
    label: '',
    access_token: '',
    business_center_id: '',
    advertiser_id: '',
  });
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    fetchApiConfigs();
  }, []);

  const fetchApiConfigs = async () => {
    try {
      setLoading(true);
      const result = await ownerApi.listConfigs();
      
      if (result.error) {
        console.error('API returned error:', result.error);
        throw new Error(result.error);
      }
      
      setApiConfigs(result.configs || []);
    } catch (err: any) {
      console.error('Failed to fetch API configs:', err);
      const errorMessage = err?.message || err?.error || t('failedToLoadApiConfigs') || 'Failed to load API configurations';
      toast.error('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshToken = (configId: string) => {
    Alert.alert(
      t('refreshToken') || 'Refresh Token',
      t('refreshTokenConfirm') || 'This will refresh the API token for this configuration.',
      [
        { text: t('cancel') || 'Cancel', style: 'cancel' },
        {
          text: t('refresh') || 'Refresh',
          onPress: async () => {
            try {
              toast.info('Refreshing', 'Updating API token...');
              const result = await ownerApi.refreshToken(configId);
              if (result.error) {
                console.error('Refresh token error:', result.error);
                throw new Error(result.error);
              }
              toast.success('Token refreshed', 'API token updated');
              fetchApiConfigs();
            } catch (err) {
              toast.error('Error', 'Failed to refresh token');
            }
          },
        },
      ]
    );
  };

  const handleDeleteConfig = (configId: string) => {
    Alert.alert(
      t('deleteApiConfig') || 'Delete API Configuration',
      t('deleteApiConfigConfirm') || 'Are you sure you want to delete this API configuration?',
      [
        { text: t('cancel') || 'Cancel', style: 'cancel' },
        {
          text: t('delete') || 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await ownerApi.removeConfig(configId);
              if (result.error) {
                throw new Error(result.error);
              }
              toast.info('Deleted', 'API configuration removed');
              fetchApiConfigs();
            } catch (err: any) {
              console.error('Delete config error:', err);
              toast.error('Error', 'Failed to delete configuration');
            }
          },
        },
      ]
    );
  };

  const handleAddConfig = async () => {
    if (!formData.access_token.trim()) {
      toast.warning('Required', 'Please enter an access token');
      return;
    }

    if (!formData.business_center_id.trim() && !formData.advertiser_id.trim()) {
      toast.warning('Required', 'Please enter a Business Center ID or Advertiser ID');
      return;
    }

    setAddingConfig(true);
    try {
      // Prepare config params
      const configParams: {
        label: string;
        access_token: string;
        business_center_id?: string;
      } = {
        label: formData.label.trim() || 'New Config',
        access_token: formData.access_token.trim(),
      };

      if (formData.business_center_id.trim()) {
        configParams.business_center_id = formData.business_center_id.trim();
      }

      console.log('[ApiSettingsTab] Adding and syncing config:', {
        has_label: !!configParams.label,
        has_access_token: !!configParams.access_token,
        has_bc_id: !!configParams.business_center_id,
      });

      // Use the helper function that does: fetchFromTikTok → addConfig → syncFromConfig
      const result = await ownerApi.addAndSyncConfig(configParams);

      if (result.success) {
        // Build message with warnings/errors
        let message = result.message || t('configAddedAndSynced') || 'Configuration added and synced successfully';
        
        if (result.previewWarning) {
          message = `${message}\n\nNote: ${result.previewWarning}`;
        }
        
        if (result.syncError) {
          message = `${message}\n\nSync error: ${result.syncError}`;
        }
        
        if (result.syncError || result.previewWarning) {
          toast.info(t('success') || 'Success', message);
        } else {
          toast.success(t('success') || 'Success', message);
        }
        
        setShowAddModal(false);
        setFormData({
          label: '',
          access_token: '',
          business_center_id: '',
          advertiser_id: '',
        });
        fetchApiConfigs();
      } else {
        throw new Error(result.error || t('failedToAddConfig') || 'Failed to add configuration');
      }
    } catch (err: any) {
      console.error('Add config error:', err);
      toast.error('Error', 'Something went wrong');
    } finally {
      setAddingConfig(false);
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
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {t('tiktokApiSettings') || t('apiSettings') || 'TikTok API Settings'}
        </Text>
        <Text style={styles.subtitle}>
          {t('tiktokApiSettingsSubtitle') ||
            'Manage access tokens for multiple Business Centers'}
        </Text>
      </View>

      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => setShowAddModal(true)}
      >
        <Plus size={20} color={colors.primary.DEFAULT} />
        <Text style={styles.addButtonText}>
          {t('addBusinessCenter') || 'Add Business Center'}
        </Text>
      </TouchableOpacity>

      {apiConfigs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Settings size={48} color={colors.foreground.muted} />
          <Text style={styles.emptyText}>{t('noApiConfigurations') || 'No API configurations'}</Text>
          <Text style={styles.emptySubtext}>
            {t('addApiConfigToStart') || 'Add a TikTok API configuration to start managing ads'}
          </Text>
        </View>
      ) : (
        <View style={styles.configsList}>
          {apiConfigs.map((config) => (
            <View key={config.id} style={styles.configCard}>
              <View style={styles.configHeader}>
                <Key size={20} color={colors.primary.DEFAULT} />
                <View style={styles.configInfo}>
                  <Text style={styles.configName}>{config.label || config.name || t('unnamedConfig') || 'Unnamed Config'}</Text>
                  <Text style={styles.configId}>ID: {config.id.slice(0, 8)}...</Text>
                </View>
              </View>
              <View style={styles.configActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleRefreshToken(config.id)}
                >
                  <RefreshCw size={16} color={colors.primary.DEFAULT} />
                  <Text style={styles.actionButtonText}>{t('refreshToken') || 'Refresh Token'}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleDeleteConfig(config.id)}
                >
                  <Trash2 size={16} color="#EF4444" />
                  <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>{t('delete') || 'Delete'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Add API Configuration Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('addApiConfiguration') || 'Add API Configuration'}</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <X size={24} color={colors.foreground.DEFAULT} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>{t('configLabel') || 'Label (Optional)'}</Text>
                <TextInput
                  style={[styles.formInput, inputStyleRTL()]}
                  value={formData.label}
                  onChangeText={(text) => setFormData({ ...formData, label: text })}
                  placeholder={t('enterConfigLabel') || 'Enter a name for this configuration'}
                  placeholderTextColor={colors.foreground.muted}
                />
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formLabel}>{t('accessToken') || 'Access Token'} *</Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={[styles.formInput, inputStyleRTL()]}
                    value={formData.access_token}
                    onChangeText={(text) => setFormData({ ...formData, access_token: text })}
                    placeholder={t('enterAccessToken') || 'Enter TikTok access token'}
                    placeholderTextColor={colors.foreground.muted}
                    secureTextEntry={!showToken}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowToken(!showToken)}
                  >
                    {showToken ? (
                      <EyeOff size={20} color={colors.foreground.muted} />
                    ) : (
                      <Eye size={20} color={colors.foreground.muted} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formLabel}>{t('businessCenterId') || 'Business Center ID (Optional)'}</Text>
                <Text style={styles.formHint}>{t('bcIdHint') || 'If provided, all advertisers under this Business Center will be added'}</Text>
                <TextInput
                  style={[styles.formInput, inputStyleRTL()]}
                  value={formData.business_center_id}
                  onChangeText={(text) => setFormData({ ...formData, business_center_id: text })}
                  placeholder={t('enterBcId') || 'Enter Business Center ID'}
                  placeholderTextColor={colors.foreground.muted}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formLabel}>{t('orAdvertiserId') || 'OR Advertiser ID (Optional)'}</Text>
                <Text style={styles.formHint}>{t('advertiserIdHint') || 'If provided, this specific advertiser account will be added'}</Text>
                <TextInput
                  style={[styles.formInput, inputStyleRTL()]}
                  value={formData.advertiser_id}
                  onChangeText={(text) => setFormData({ ...formData, advertiser_id: text })}
                  placeholder={t('enterAdvertiserId') || 'Enter Advertiser ID'}
                  placeholderTextColor={colors.foreground.muted}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => {
                    setShowAddModal(false);
                    setFormData({
                      label: '',
                      access_token: '',
                      business_center_id: '',
                      advertiser_id: '',
                    });
                  }}
                  disabled={addingConfig}
                >
                  <Text style={styles.modalButtonText}>{t('cancel') || 'Cancel'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonSave]}
                  onPress={handleAddConfig}
                  disabled={addingConfig || !formData.access_token.trim()}
                >
                  {addingConfig ? (
                    <ActivityIndicator size="small" color={colors.primary.foreground} />
                  ) : (
                    <Text style={[styles.modalButtonText, { color: colors.primary.foreground }]}>
                      {t('addAndSync') || 'Add & Sync'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.DEFAULT,
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
    },
    configsList: {
      gap: spacing.md,
    },
    configCard: {
      backgroundColor: colors.card.background,
      borderRadius: borderRadius.card,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border.DEFAULT,
    },
    configHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    configInfo: {
      flex: 1,
    },
    configName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.foreground.DEFAULT,
      marginBottom: 2,
    },
    configId: {
      fontSize: 12,
      fontFamily: 'monospace',
      color: colors.foreground.muted,
    },
    configActions: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      padding: spacing.sm,
      borderRadius: borderRadius.sm,
      backgroundColor: colors.background.DEFAULT,
      borderWidth: 1,
      borderColor: colors.border.DEFAULT,
      flex: 1,
      justifyContent: 'center',
    },
    deleteButton: {
      borderColor: '#EF4444',
    },
    actionButtonText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.foreground.DEFAULT,
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
      padding: spacing.md,
    },
    formSection: {
      marginBottom: spacing.lg,
    },
    formLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.foreground.DEFAULT,
      marginBottom: spacing.xs,
    },
    formHint: {
      fontSize: 12,
      color: colors.foreground.muted,
      marginBottom: spacing.xs,
    },
    formInput: {
      backgroundColor: colors.background.DEFAULT,
      borderWidth: 1,
      borderColor: colors.border.DEFAULT,
      borderRadius: borderRadius.sm,
      padding: spacing.sm,
      fontSize: 14,
      color: colors.foreground.DEFAULT,
    },
    passwordInputContainer: {
      position: 'relative',
    },
    eyeButton: {
      position: 'absolute',
      end: spacing.sm,
      top: spacing.sm,
      padding: spacing.xs,
    },
    modalActions: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.lg,
      marginBottom: spacing.md,
    },
    modalButton: {
      flex: 1,
      padding: spacing.md,
      borderRadius: borderRadius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44,
    },
    modalButtonCancel: {
      backgroundColor: colors.background.DEFAULT,
      borderWidth: 1,
      borderColor: colors.border.DEFAULT,
    },
    modalButtonSave: {
      backgroundColor: colors.primary.DEFAULT,
    },
    modalButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.foreground.DEFAULT,
    },
  });

