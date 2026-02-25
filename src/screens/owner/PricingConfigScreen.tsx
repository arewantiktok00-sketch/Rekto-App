import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase, supabaseRead } from '@/integrations/supabase/client';
import { getOwnerColors } from '@/theme/colors';
import { useLanguage } from '@/contexts/LanguageContext';
import { getTypographyStyles } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { Text } from '@/components/common/Text';
import { inputStyleRTL } from '@/utils/rtl';

export function PricingConfigScreen() {
  const insets = useSafeAreaInsets();
  const colors = getOwnerColors();
  const { language } = useLanguage();
  const typography = getTypographyStyles(language as 'ckb' | 'ar');
  const styles = createStyles(colors, insets, typography);
  
  const [exchangeRate, setExchangeRate] = useState('1450');
  const [tenDollarAdsEnabled, setTenDollarAdsEnabled] = useState(true);
  const [taxTable, setTaxTable] = useState<Record<number, number>>({
    10: 3.3,
    20: 5.4,
    30: 8.1,
    40: 8.4,
    50: 10.5,
    60: 12.6,
    70: 14.7,
    80: 16.8,
    90: 18.9,
    100: 21
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      // Fetch from app_settings key='global'
      const { data } = await supabaseRead
        .from('app_settings')
        .select('value')
        .eq('key', 'global')
        .single();
      
      if (data?.value) {
        const exchangeRateValue = data.value.pricing?.exchange_rate ?? 1450;
        const tenDollarEnabled = data.value.pricing?.ten_dollar_ads_enabled ?? true;
        const savedTaxTable = data.value.pricing?.tax_table;
        
        setExchangeRate(String(exchangeRateValue));
        setTenDollarAdsEnabled(tenDollarEnabled);
        
        // Load tax table or use defaults
        if (savedTaxTable && typeof savedTaxTable === 'object') {
          setTaxTable(savedTaxTable);
        }
      }
    } catch (error) {
      console.error('Failed to fetch pricing settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updatePricingSetting = async (key: string, value: any) => {
    try {
      // Get current global settings
      const { data: current } = await supabaseRead
        .from('app_settings')
        .select('value')
        .eq('key', 'global')
        .single();

      const currentValue = current?.value || {};
      const newPricing = {
        ...currentValue.pricing,
        [key]: value,
        tax_table: taxTable // Always include current tax table
      };

      const newValue = {
        ...currentValue,
        pricing: newPricing
      };

      await supabase
        .from('app_settings')
        .upsert({
          key: 'global',
          value: newValue,
          updated_at: new Date().toISOString()
        });

      if (key === 'ten_dollar_ads_enabled') {
        setTenDollarAdsEnabled(value);
      }
    } catch (error) {
      console.error('Failed to update pricing setting:', error);
      Alert.alert('Error', 'Failed to update setting');
    }
  };

  const savePricing = async () => {
    setIsSaving(true);
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

      const currentValue = current?.value || {};
      const newPricing = {
        exchange_rate: parseFloat(exchangeRate) || 1450,
        ten_dollar_ads_enabled: tenDollarAdsEnabled,
        tax_table: taxTable
      };

      const newValue = {
        ...currentValue,
        pricing: newPricing
      };

      const { data, error } = await supabase.functions.invoke('app-settings', {
        body: { action: 'update', key: 'global', value: newValue },
        headers: { Authorization: `Bearer ${token}` },
      });

      if (error || data?.error) {
        const msg = (data?.error as string) || error?.message || 'Failed to save. Make sure you are logged in as an owner.';
        if (__DEV__) console.log('[PricingConfig] save error:', { error, dataError: data?.error });
        Alert.alert('Error', msg);
      } else {
        Alert.alert('Success', 'Pricing settings saved');
      }
    } catch (error) {
      if (__DEV__) console.error('[PricingConfig] save failed:', error);
      Alert.alert('Error', 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
      <Text style={styles.title}>Pricing Configuration</Text>
      
      <View style={styles.card}>
        <Text style={styles.label}>IQD per 1 USD</Text>
        <TextInput
          style={[styles.input, inputStyleRTL()]}
          value={exchangeRate}
          onChangeText={setExchangeRate}
          keyboardType="numeric"
          placeholder="1450"
          placeholderTextColor="#6B7280"
        />
        <Text style={styles.hint}>Current: 1 USD = {exchangeRate} IQD</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.rowContent}>
            <Text style={styles.label}>$10 Ads Enabled</Text>
            <Text style={styles.hint}>
              {tenDollarAdsEnabled 
                ? '✅ Users can select $10/day budget' 
                : '🚫 Minimum budget is $20/day'}
            </Text>
          </View>
          <Switch
            value={tenDollarAdsEnabled}
            onValueChange={(val) => updatePricingSetting('ten_dollar_ads_enabled', val)}
            trackColor={{ false: '#2D2D3A', true: '#7C3AED' }}
          />
        </View>
      </View>

      {/* Tax Table Editor */}
      <View style={styles.card}>
        <Text style={styles.label}>Tax Table</Text>
        <Text style={styles.hint}>
          Set tax amounts for specific budget values. Amounts not listed use automatic calculation (33% for ≤$10, 27% for $11-$20, linear for $21+).
        </Text>
        
        <View style={styles.taxTableContainer}>
          {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((amount) => (
            <View key={amount} style={styles.taxTableRow}>
              <Text style={styles.taxTableLabel}>${amount}</Text>
              <Text style={styles.taxTableArrow}>→</Text>
              <TextInput
                style={[styles.taxTableInput, inputStyleRTL()]}
                value={taxTable[amount]?.toString() || ''}
                onChangeText={(text) => {
                  const numValue = parseFloat(text);
                  if (!isNaN(numValue) || text === '') {
                    setTaxTable(prev => ({
                      ...prev,
                      [amount]: text === '' ? 0 : numValue
                    }));
                  }
                }}
                keyboardType="numeric"
                placeholder="0.0"
                placeholderTextColor="#6B7280"
              />
              <Text style={styles.taxTableUnit}>USD</Text>
            </View>
          ))}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
        onPress={savePricing}
        disabled={isSaving}
      >
        {isSaving ? (
          <ActivityIndicator size="small" color={colors.primary.foreground} />
        ) : (
          <Text style={styles.saveButtonText}>Save Changes</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
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
  card: { 
    backgroundColor: colors.card?.background ?? '#F9FAFB', 
    borderRadius: 12, 
    padding: 16, 
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border?.DEFAULT ?? '#E5E7EB',
  },
  label: { 
    fontSize: 14, 
    fontFamily: 'Poppins-Medium', 
    color: colors.foreground?.DEFAULT ?? '#111827', 
    marginBottom: 8 
  },
  input: { 
    backgroundColor: colors.input?.background ?? '#FFFFFF', 
    borderRadius: 8, 
    padding: 12, 
    color: colors.foreground?.DEFAULT ?? '#111827', 
    fontFamily: 'Poppins-Regular', 
    borderWidth: 1, 
    borderColor: colors.input?.border ?? '#D1D5DB', 
    fontSize: 16 
  },
  hint: { 
    fontSize: 12, 
    fontFamily: 'Poppins-Regular', 
    color: colors.foreground?.muted ?? '#6B7280', 
    marginTop: 8 
  },
  saveButton: { 
    backgroundColor: colors.primary?.DEFAULT ?? '#7C3AED', 
    borderRadius: 12, 
    padding: 16, 
    alignItems: 'center', 
    marginTop: 24 
  },
  saveButtonDisabled: { 
    opacity: 0.6 
  },
  saveButtonText: { 
    color: colors.primary?.foreground ?? '#FFFFFF',
    fontFamily: 'Poppins-SemiBold', 
    fontSize: 16 
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowContent: {
    flex: 1,
    marginEnd: 16,
  },
  taxTableContainer: {
    marginTop: 16,
    gap: 12,
  },
  taxTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.input?.background ?? '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border?.DEFAULT ?? '#D1D5DB',
  },
  taxTableLabel: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: colors.foreground?.DEFAULT ?? '#111827',
    width: 50,
  },
  taxTableArrow: {
    fontSize: 14,
    color: colors.foreground?.muted ?? '#6B7280',
    marginHorizontal: 8,
  },
  taxTableInput: {
    flex: 1,
    backgroundColor: colors.card?.background ?? '#F9FAFB',
    borderRadius: 6,
    padding: 8,
    color: colors.foreground?.DEFAULT ?? '#111827',
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.border?.DEFAULT ?? '#D1D5DB',
    textAlign: 'right',
  },
  taxTableUnit: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: colors.foreground?.muted ?? '#6B7280',
    marginStart: 8,
    width: 40,
  },
});
