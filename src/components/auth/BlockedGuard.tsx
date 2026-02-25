import React, { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Navigation guard that redirects blocked users to BlockedScreen
 * Place this component in any screen that should be protected
 */
export function BlockedGuard({ children }: { children: React.ReactNode }) {
  const navigation = useNavigation();
  const { user, isBlocked, blockReason, loading } = useAuth();

  useEffect(() => {
    // Only check if auth is loaded and user exists
    if (loading) return;
    
    // If user is blocked, redirect to BlockedScreen
    if (user && isBlocked) {
      console.log('[BlockedGuard] User is blocked, redirecting to BlockedScreen');
      try {
        navigation.reset({
          index: 0,
          routes: [{ 
            name: 'Auth' as never,
            params: {
              screen: 'Blocked' as never,
              params: { reason: blockReason || null }
            }
          }],
        });
      } catch (error) {
        console.error('[BlockedGuard] Navigation error:', error);
      }
    }
  }, [user, isBlocked, blockReason, loading, navigation]);

  // Don't render children if user is blocked
  if (user && isBlocked) {
    return null;
  }

  return <>{children}</>;
}
