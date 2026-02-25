import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell } from 'lucide-react-native';
import { getOwnerColors } from '@/theme/colors';
import { spacing, borderRadius } from '@/theme/spacing';
import { Text } from '@/components/common/Text';
import { ScreenHeader } from '@/components/common/ScreenHeader';

export function OwnerNotifications() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const colors = getOwnerColors();
  const styles = createStyles(colors);
  return (
    <View style={styles.container}>
      <ScreenHeader title="Admin Notifications" onBack={() => navigation.goBack()} style={{ paddingTop: insets.top + 16 }} />
      <ScrollView style={styles.content} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
        <View style={styles.emptyState}>
          <Bell size={48} color={colors.foreground.muted} />
          <Text style={styles.emptyText}>No notifications yet</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.DEFAULT,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    paddingTop: spacing.lg,
    backgroundColor: colors.card.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.foreground.DEFAULT,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.foreground.DEFAULT,
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.foreground.DEFAULT,
    marginTop: spacing.md,
  },
});
