import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Alert, FlatList, Switch, ActivityIndicator, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';
import { supabase, supabaseRead } from '@/integrations/supabase/client';
import { DiscountCode } from '@/types/pricing';
import { getOwnerColors } from '@/theme/colors';
import { useLanguage } from '@/contexts/LanguageContext';
import { getTypographyStyles } from '@/theme/typography';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/common/Text';
import { inputStyleRTL } from '@/utils/rtl';

export function DiscountManagementScreen() {
  const insets = useSafeAreaInsets();
  const colors = getOwnerColors();
  const { language } = useLanguage();
  const typography = getTypographyStyles(language as 'ckb' | 'ar');
  const styles = createStyles(colors, insets, typography);
  
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [discountEnabledTemp, setDiscountEnabledTemp] = useState(false);
  const [isSavingDiscount, setIsSavingDiscount] = useState(false);
  
  // New code form
  const [newCode, setNewCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // Broadcast
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch discount codes
      const { data: session } = await supabase.auth.getSession();
      const { data } = await supabase.functions.invoke('owner-content', {
        body: { action: 'listDiscountCodes' },
        headers: { Authorization: `Bearer ${session?.session?.access_token}` }
      });
      setCodes(data?.codes || []);

      // Fetch global settings
      const { data: globalData } = await supabaseRead
        .from('app_settings')
        .select('value')
        .eq('key', 'global')
        .single();
      
      const enabled = globalData?.value?.discount?.discount_enabled || false;
      setDiscountEnabled(enabled);
      setDiscountEnabledTemp(enabled);
    } catch (error) {
      console.error('Failed to fetch discount data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDiscountSystem = (enabled: boolean) => {
    // Only update temp state, don't save yet
    setDiscountEnabledTemp(enabled);
  };

  const saveDiscountSetting = async () => {
    setIsSavingDiscount(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        Alert.alert('Error', 'Not signed in. Please log in as an owner.');
        return;
      }

      const { data: current } = await supabaseRead
        .from('app_settings')
        .select('value')
        .eq('key', 'global')
        .single();

      const newValue = {
        ...current?.value,
        discount: { discount_enabled: discountEnabledTemp }
      };

      const { data, error } = await supabase.functions.invoke('app-settings', {
        body: { action: 'update', key: 'global', value: newValue },
        headers: { Authorization: `Bearer ${token}` },
      });

      if (error || data?.error) {
        const msg = (data?.error as string) || error?.message || 'Failed to save. Make sure you are logged in as an owner.';
        if (__DEV__) console.log('[Discount] save error:', { error, dataError: data?.error });
        Alert.alert('Error', msg);
      } else {
        setDiscountEnabled(discountEnabledTemp);
        Alert.alert('Success', 'Discount setting saved');
      }
    } catch (error) {
      if (__DEV__) console.error('Failed to save discount setting:', error);
      Alert.alert('Error', 'Failed to save discount setting');
    } finally {
      setIsSavingDiscount(false);
    }
  };

  const sendDiscountNotification = async (code: string, discountType: string, discountValue: number) => {
    try {
      // Get all user IDs for push notification
      const { data: users } = await supabaseRead
        .from('profiles')
        .select('user_id');
      
      if (!users?.length) return;
      
      const userIds = users.map(u => u.user_id).filter(Boolean);
      const discountText = discountType === 'percentage' 
        ? `${discountValue}%` 
        : `$${discountValue}`;
      
      await supabase.functions.invoke('send-onesignal-push', {
        body: {
          external_user_ids: userIds,
          title: '🎉 New Discount Available!',
          body: `Use code ${code} to get ${discountText} off your next ad!`,
          type: 'broadcast',
          data: { 
            screen: 'CreateAd',
            discount_code: code,
          },
        }
      });
      
      // Also create in-app notifications for all users
      const notifications = userIds.map(uid => ({
        user_id: uid,
        title: '🎉 New Discount Available!',
        message: `Use code ${code} to get ${discountText} off your next ad!`,
        type: 'promo',
      }));
      
      // Batch insert notifications
      await supabase.from('notifications').insert(notifications);
      
    } catch (err) {
      console.error('Failed to send discount notification:', err);
    }
  };

  const addDiscountCode = async () => {
    if (!newCode.trim() || !discountValue.trim()) {
      Alert.alert('Error', 'Please fill in code and value');
      return;
    }

    setIsAdding(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('owner-content', {
        body: {
          action: 'addDiscountCode',
          code: newCode.trim().toUpperCase(),
          discount_type: discountType,
          discount_value: Number(discountValue) || 0,
          expires_at: expiresAt?.toISOString() || null,
          budget_min: null,
          budget_max: null,
        },
        headers: { Authorization: `Bearer ${session?.session?.access_token}` }
      });

      if (error || data?.error) {
        Alert.alert('Error', data?.error || 'Failed to add code');
      } else {
        const codeValue = newCode.trim().toUpperCase();
        const discountVal = Number(discountValue) || 0;
        
        setNewCode('');
        setDiscountValue('');
        setExpiresAt(null);
        fetchData();
        Alert.alert('Success', 'Discount code added');
        
        // Send notification after successful creation
        await sendDiscountNotification(codeValue, discountType, discountVal);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add code');
    } finally {
      setIsAdding(false);
    }
  };

  const toggleCode = async (codeId: string, isActive: boolean) => {
    try {
      const { data: session } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('owner-content', {
        body: { action: 'toggleDiscountCode', codeId, is_active: isActive },
        headers: { Authorization: `Bearer ${session?.session?.access_token}` }
      });
      
      if (error || data?.error) {
        Alert.alert('Error', data?.error || 'Failed to toggle code');
        return;
      }
      
      fetchData();
      
      // Send notification when code is activated (not when deactivated)
      if (isActive) {
        const code = codes.find(c => c.id === codeId);
        if (code) {
          await sendDiscountNotification(code.code, code.discount_type, code.discount_value);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to toggle code');
    }
  };

  const deleteCode = async (codeId: string) => {
    Alert.alert('Delete Code', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const { data: session } = await supabase.auth.getSession();
            await supabase.functions.invoke('owner-content', {
              body: { action: 'deleteDiscountCode', codeId },
              headers: { Authorization: `Bearer ${session?.session?.access_token}` }
            });
            fetchData();
          } catch (error) {
            Alert.alert('Error', 'Failed to delete code');
          }
        }
      }
    ]);
  };

  const sendBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      Alert.alert('Error', 'Please fill in title and message');
      return;
    }

    setIsBroadcasting(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const { data } = await supabase.functions.invoke('owner-content', {
        body: { 
          action: 'broadcastDiscountNotification', 
          title: broadcastTitle, 
          message: broadcastMessage 
        },
        headers: { Authorization: `Bearer ${session?.session?.access_token}` }
      });

      Alert.alert('Sent', `Notification sent to ${data?.sent_count || 0} users`);
      setBroadcastTitle('');
      setBroadcastMessage('');
    } catch (error) {
      Alert.alert('Error', 'Failed to send broadcast');
    } finally {
      setIsBroadcasting(false);
    }
  };

  const renderCodeItem = ({ item }: { item: DiscountCode }) => (
    <View style={styles.codeItem}>
      <View style={styles.codeHeader}>
        <Text style={styles.codeText}>{item.code}</Text>
        <Switch
          value={item.is_active}
          onValueChange={(value) => toggleCode(item.id, value)}
          trackColor={{ false: '#2D2D3A', true: '#7C3AED' }}
        />
      </View>
      <Text style={styles.codeDetails}>
        {item.discount_type === 'percentage' ? `${item.discount_value}% off` : `$${item.discount_value} off`}
        {item.expires_at ? ` • Expires: ${new Date(item.expires_at).toLocaleDateString()}` : ''}
      </Text>
      <Text style={styles.usageText}>Used {item.usage_count} times</Text>
      <TouchableOpacity onPress={() => deleteCode(item.id)}>
        <Text style={styles.deleteText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      ListHeaderComponent={
        <>
          <Text style={styles.title}>Discount Management</Text>

          {/* Global Toggle */}
          <View style={styles.card}>
            <View style={styles.toggleCard}>
              <View style={styles.toggleContent}>
                <Text style={styles.toggleLabel}>Discount System</Text>
                <Text style={styles.toggleHint}>Enable discount codes in Create Ad</Text>
              </View>
              <Switch
                value={discountEnabledTemp}
                onValueChange={toggleDiscountSystem}
                trackColor={{ false: '#D1D5DB', true: '#7C3AED' }}
                thumbColor="#FFFFFF"
              />
            </View>
            {discountEnabledTemp !== discountEnabled && (
              <TouchableOpacity
                style={[styles.saveDiscountButton, isSavingDiscount && styles.saveDiscountButtonDisabled]}
                onPress={saveDiscountSetting}
                disabled={isSavingDiscount}
              >
                {isSavingDiscount ? (
                  <ActivityIndicator size="small" color={colors.primary.foreground} />
                ) : (
                  <Text style={styles.saveDiscountButtonText}>Save Discount Setting</Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Add New Code */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Add New Code</Text>
            <TextInput
              style={[styles.input, inputStyleRTL()]}
              placeholder="CODE123"
              placeholderTextColor="#6B7280"
              value={newCode}
              onChangeText={setNewCode}
              autoCapitalize="characters"
            />
            <View style={styles.row}>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={discountType}
                  onValueChange={setDiscountType}
                  style={styles.picker}
                  dropdownIconColor="#FAFAFA"
                >
                  <Picker.Item label="Percentage (%)" value="percentage" />
                  <Picker.Item label="Fixed ($)" value="fixed" />
                </Picker>
              </View>
              <TextInput
                style={[styles.input, { flex: 1 }, inputStyleRTL()]}
                placeholder="Value"
                placeholderTextColor="#6B7280"
                value={discountValue}
                onChangeText={setDiscountValue}
                keyboardType="numeric"
              />
            </View>
            <TouchableOpacity 
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateButtonText}>
                {expiresAt ? `Expires: ${expiresAt.toLocaleDateString()}` : 'Set Expiry Date (Optional)'}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={expiresAt || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={new Date()}
                onChange={(event, date) => {
                  setShowDatePicker(false);
                  if (event.type === 'set' && date) {
                    setExpiresAt(date);
                  }
                }}
              />
            )}
            <TouchableOpacity
              style={[styles.addButton, isAdding && styles.addButtonDisabled]}
              onPress={addDiscountCode}
              disabled={isAdding}
            >
              {isAdding ? (
                <ActivityIndicator size="small" color={colors.primary.foreground} />
              ) : (
                <Text style={styles.addButtonText}>Add Code</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Broadcast Section */}
          {discountEnabled && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Broadcast Notification</Text>
<TextInput
              style={[styles.input, inputStyleRTL()]}
              placeholder="Notification Title"
                placeholderTextColor="#6B7280"
                value={broadcastTitle}
                onChangeText={setBroadcastTitle}
              />
<TextInput
              style={[styles.input, styles.textArea, inputStyleRTL()]}
              placeholder="Message"
                placeholderTextColor="#6B7280"
                value={broadcastMessage}
                onChangeText={setBroadcastMessage}
                multiline
                numberOfLines={3}
              />
              <TouchableOpacity
                style={[styles.broadcastButton, isBroadcasting && styles.addButtonDisabled]}
                onPress={sendBroadcast}
                disabled={isBroadcasting}
              >
                {isBroadcasting ? (
                  <ActivityIndicator size="small" color={colors.primary.foreground} />
                ) : (
                  <Text style={styles.addButtonText}>Send to All Users</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.sectionTitle}>Active Codes</Text>
        </>
      }
      data={codes}
      keyExtractor={(item) => item.id}
      renderItem={renderCodeItem}
      ListEmptyComponent={
        <Text style={styles.emptyText}>No discount codes yet</Text>
      }
    />
  );
}

const createStyles = (colors: any, insets: any, typography: any) => StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.background?.DEFAULT ?? '#FFFFFF', 
    padding: 16,
    paddingTop: insets.top + 16,
  },
  loadingContainer: { 
    flex: 1, 
    backgroundColor: colors.background?.DEFAULT ?? '#FFFFFF', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  title: { 
    fontSize: 24, 
    fontFamily: 'Poppins-Bold', 
    color: colors.foreground?.DEFAULT ?? '#111827', 
    marginBottom: 24 
  },
  toggleCard: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 12,
  },
  toggleContent: {
    flex: 1,
  },
  saveDiscountButton: {
    backgroundColor: colors.primary?.DEFAULT ?? '#7C3AED',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveDiscountButtonDisabled: {
    opacity: 0.6,
  },
  saveDiscountButtonText: {
    color: colors.primary?.foreground ?? '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
  },
  toggleLabel: { 
    fontSize: 16, 
    fontFamily: 'Poppins-SemiBold', 
    color: colors.foreground?.DEFAULT ?? '#111827' 
  },
  toggleHint: { 
    fontSize: 12, 
    fontFamily: 'Poppins-Regular', 
    color: colors.foreground?.muted ?? '#6B7280', 
    marginTop: 4 
  },
  card: { 
    backgroundColor: colors.card?.background ?? '#F9FAFB', 
    borderRadius: 12, 
    padding: 16, 
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border?.DEFAULT ?? '#E5E7EB',
  },
  cardTitle: { 
    fontSize: 16, 
    fontFamily: 'Poppins-SemiBold', 
    color: colors.foreground?.DEFAULT ?? '#111827', 
    marginBottom: 16 
  },
  input: { 
    backgroundColor: colors.input?.background ?? '#FFFFFF', 
    borderRadius: 8, 
    padding: 12, 
    color: colors.foreground?.DEFAULT ?? '#111827', 
    fontFamily: 'Poppins-Regular', 
    borderWidth: 1, 
    borderColor: colors.input?.border ?? '#D1D5DB', 
    marginBottom: 12 
  },
  textArea: { 
    height: 80, 
    textAlignVertical: 'top' 
  },
  row: { 
    flexDirection: 'row', 
    gap: 12 
  },
  pickerContainer: { 
    flex: 1, 
    backgroundColor: colors.input?.background ?? '#FFFFFF', 
    borderRadius: 8, 
    borderWidth: 1, 
    borderColor: colors.border?.DEFAULT ?? '#D1D5DB', 
    marginBottom: 12 
  },
  picker: { 
    color: colors.foreground?.DEFAULT ?? '#111827' 
  },
  dateButton: { 
    backgroundColor: colors.input?.background ?? '#FFFFFF', 
    borderRadius: 8, 
    padding: 12, 
    borderWidth: 1, 
    borderColor: colors.border?.DEFAULT ?? '#D1D5DB', 
    marginBottom: 12 
  },
  dateButtonText: { 
    color: colors.foreground?.muted ?? '#6B7280', 
    fontFamily: 'Poppins-Regular' 
  },
  addButton: { 
    backgroundColor: colors.primary?.DEFAULT ?? '#7C3AED', 
    borderRadius: 8, 
    padding: 14, 
    alignItems: 'center' 
  },
  addButtonDisabled: { 
    opacity: 0.6 
  },
  addButtonText: { 
    color: colors.primary?.foreground ?? '#FFFFFF',
    fontFamily: 'Poppins-SemiBold', 
    fontSize: 14 
  },
  broadcastButton: { 
    backgroundColor: colors.success ?? '#10B981', 
    borderRadius: 8, 
    padding: 14, 
    alignItems: 'center' 
  },
  sectionTitle: { 
    fontSize: 18, 
    fontFamily: 'Poppins-SemiBold', 
    color: colors.foreground?.DEFAULT ?? '#111827', 
    marginBottom: 12, 
    marginTop: 8 
  },
  codeItem: { 
    backgroundColor: colors.card?.background ?? '#F9FAFB', 
    borderRadius: 12, 
    padding: 16, 
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border?.DEFAULT ?? '#E5E7EB',
  },
  codeHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  codeText: { 
    fontSize: 18, 
    fontFamily: 'Poppins-Bold', 
    color: colors.primary?.DEFAULT ?? '#7C3AED' 
  },
  codeDetails: { 
    fontSize: 14, 
    fontFamily: 'Poppins-Regular', 
    color: colors.foreground?.muted ?? '#6B7280', 
    marginTop: 8 
  },
  usageText: { 
    fontSize: 12, 
    fontFamily: 'Poppins-Regular', 
    color: colors.foreground?.muted ?? '#6B7280', 
    marginTop: 4 
  },
  deleteText: { 
    color: colors.error ?? '#EF4444', 
    fontFamily: 'Poppins-Medium', 
    fontSize: 14, 
    marginTop: 12 
  },
  emptyText: { 
    color: colors.foreground?.muted ?? '#6B7280', 
    fontFamily: 'Poppins-Regular', 
    textAlign: 'center', 
    marginTop: 24 
  },
});
