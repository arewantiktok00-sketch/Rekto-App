import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { TransactionHistory } from '@/screens/profile/TransactionHistory';
import { InvoiceHistory } from '@/screens/main/InvoiceHistory';
import { spacing, borderRadius } from '@/theme/spacing';
import { Text } from '@/components/common/Text';

export function BillingHistory() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { language, isRTL } = useLanguage();
  const { colors } = useTheme();
  const styles = createStyles(colors, isRTL);
  const [activeTab, setActiveTab] = useState<'transactions' | 'invoices'>('transactions');

  if (!user) {
    return (
      <View style={styles.container}>
        <ScreenHeader
          title={language === 'ar' ? 'پسووڵەکان' : 'پسووڵەکان'}
          onBack={() => navigation.goBack()}
          style={{ paddingTop: insets.top + 8 }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={language === 'ar' ? 'پسووڵەکان' : 'پسووڵەکان'}
        onBack={() => navigation.goBack()}
        style={{ paddingTop: insets.top + 8 }}
      />

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'transactions' && styles.tabButtonActive,
          ]}
          onPress={() => setActiveTab('transactions')}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'transactions' && styles.tabTextActive,
            ]}
          >
            {language === 'ar' ? 'مامەڵەکان' : 'مامەڵەکان'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'invoices' && styles.tabButtonActive,
          ]}
          onPress={() => setActiveTab('invoices')}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'invoices' && styles.tabTextActive,
            ]}
          >
            {language === 'ar' ? 'پسووڵەکان' : 'پسووڵەکان'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: Math.max(40, insets.bottom + 40) }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {activeTab === 'transactions' ? (
            <TransactionHistory embedded />
          ) : (
            <InvoiceHistory embedded />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any, isRTL?: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.DEFAULT,
    },
    tabRow: {
      flexDirection: 'row',
      marginHorizontal: spacing.md,
      marginTop: spacing.sm,
      marginBottom: spacing.md,
      backgroundColor: colors.card.background,
      borderRadius: borderRadius.full,
      padding: 2,
    },
    tabButton: {
      flex: 1,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tabButtonActive: {
      backgroundColor: colors.primary.DEFAULT,
    },
    tabText: {
      fontSize: 14,
      color: colors.foreground.muted,
    },
    tabTextActive: {
      color: colors.primary.foreground,
      fontWeight: '600',
    },
    content: {
      paddingHorizontal: spacing.md,
    },
  });

