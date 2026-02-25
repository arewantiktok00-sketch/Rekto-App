import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabaseRead } from '@/integrations/supabase/client';

const CACHE_KEY = 'notifications_cache';

export const syncNotifications = async (userId: string) => {
  if (!userId) return [];

  try {
    const { data, error } = await supabaseRead
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error || !data) return [];

    await AsyncStorage.setItem(
      `${CACHE_KEY}_${userId}`,
      JSON.stringify({ data, timestamp: Date.now() })
    );

    return data;
  } catch {
    return [];
  }
};
