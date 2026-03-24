import { Text } from '@/components/common/Text';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabaseRead } from '@/integrations/supabase/client';
import { spacing } from '@/theme/spacing';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Bell } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, TouchableOpacity } from 'react-native';

export const NotificationBell: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [unreadCount, setUnreadCount] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    const { count } = await supabaseRead
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
    if (count !== null) {
      setUnreadCount(count);
    }
  }, [user]);

  // Refetch when screen gains focus (e.g. returning from Notifications after mark-as-read)
  useFocusEffect(
    useCallback(() => {
      fetchUnreadCount();
    }, [fetchUnreadCount])
  );

  // Pulsing animation for badge
  useEffect(() => {
    if (unreadCount > 0) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [unreadCount, pulseAnim]);

  useEffect(() => {
    if (!user) return;
    fetchUnreadCount();

    // Subscribe to real-time updates
    const channel = supabaseRead
      .channel(`user-notifs-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabaseRead.removeChannel(channel);
    };
  }, [user, fetchUnreadCount]);

  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('Notifications')}
      style={styles.container}
    >
      <Bell size={24} color={colors.foreground.DEFAULT} />
      {unreadCount > 0 && (
        <Animated.View
          style={[
            styles.badge,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <Text style={styles.badgeText}>
            {unreadCount}
          </Text>
        </Animated.View>
      )}
    </TouchableOpacity>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    position: 'relative',
    padding: spacing[2],
  },
  badge: {
    position: 'absolute',
    top: -1,
    end: -1,
    backgroundColor: colors.error, // Use semantic error color
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: colors.background.DEFAULT,
  },
  badgeText: {
    color: colors.primary.foreground,
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Poppins-Bold',
  },
});
