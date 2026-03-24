import { supabase } from '@/integrations/supabase/client';
import { getTranslation, type LocaleKey } from '@/i18n/translations';
import { clearCached } from '@/services/globalCache';
import { toast } from '@/utils/toast';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session, User } from '@supabase/supabase-js';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isLoading?: boolean; // Alias for loading
  isBlocked: boolean;
  blockReason: string | null;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; isBlocked?: boolean; blockReason?: string }>;
  signOut: () => Promise<void>;
  checkBlockedStatus: () => Promise<{ isBlocked: boolean; reason: string | null }>;
  checkBlockStatus: (userId?: string) => Promise<boolean>;
  refreshBlockStatus: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Clear all app state on logout/account switch
 * This is CRITICAL for privacy - prevents cross-user data leakage
 */
const clearAllAppState = async () => {
  console.log('[Auth] Clearing all app state for privacy...');
  
  // 1. Dismiss all pending toasts immediately
  toast.dismiss();
  
  // 2. Remove all Supabase realtime channels
  const channels = supabase.getChannels();
  console.log(`[Auth] Removing ${channels.length} realtime channels`);
  for (const channel of channels) {
    await supabase.removeChannel(channel);
  }

  // 3. Clear in-memory caches to prevent cross-user data leaks
  clearCached();
  
  console.log('[Auth] App state cleared');
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockReason, setBlockReason] = useState<string | null>(null);
  const blockChannelRef = useRef<any>(null);
  // Alias for compatibility
  const isLoading = loading;

  // Force logout blocked user
  const forceLogoutBlockedUser = useCallback(async (reason?: string) => {
    console.log('[Auth] Force logout - user blocked:', reason);
    
    // Set blocked state BEFORE clearing user (so BlockedScreen shows)
    setIsBlocked(true);
    setBlockReason(reason || 'Your account has been suspended.');
    
    // Remove realtime subscription
    if (blockChannelRef.current) {
      await supabase.removeChannel(blockChannelRef.current);
      blockChannelRef.current = null;
    }
    
    // Clear all state
    await clearAllAppState();
    
    // Sign out from Supabase
    await supabase.auth.signOut();
    
    // Clear AsyncStorage
    try {
      await AsyncStorage.clear();
    } catch (e) {
      console.warn('[Auth] Error clearing AsyncStorage:', e);
    }
    
    setSession(null);
    setUser(null);
    
    // Show alert (localized — no English in UI)
    const saved = await AsyncStorage.getItem('rekto-language');
    const locale: LocaleKey = saved === 'ckb' ? 'ckb' : 'ar';
    const title = getTranslation('accountSuspended', locale);
    const message = reason || getTranslation('accountSuspendedMessage', locale);
    Alert.alert(title, message, [{ text: 'OK' }]);
  }, []);

  // Check if user is blocked via edge function
  const checkBlockStatus = useCallback(async (userId?: string): Promise<boolean> => {
    const checkId = userId || user?.id;
    if (!checkId) return false;

    try {
      console.log('[Auth] Checking block status for:', checkId);

      const { data, error } = await supabase.functions.invoke('check-user-block', {
        body: { user_id: checkId },
      });

      if (error) {
        // Silently handle network/function errors - don't block user if check fails
        // This prevents false positives when edge function is unavailable
        console.warn('[Auth] Block check failed (non-critical):', error.message);
        return false; // Assume not blocked on error to avoid false positives
      }
      console.log('[Auth] Block check result:', data);

      if (data?.isBlocked) {
        await forceLogoutBlockedUser(data.reason);
        return true;
      }

      setIsBlocked(false);
      setBlockReason(null);
      return false;
    } catch (err: any) {
      // Silently handle exceptions - network errors shouldn't block the app
      console.warn('[Auth] Block check exception (non-critical):', err?.message || 'Unknown error');
      return false; // Assume not blocked on exception
    }
  }, [user?.id, forceLogoutBlockedUser]);

  // Initialize auth and set up realtime subscription
  useEffect(() => {
    // Skip if Supabase client is not available (SSR)
    if (!supabase) {
      setLoading(false);
      return;
    }

    // ⚡ NON-BLOCKING: Set session immediately, check block in background
    const initAuth = async () => {
      try {
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        
        // Invalid or expired refresh token — clear session and show login
        if (sessionError) {
          const msg = String(sessionError.message ?? '');
          if (msg.includes('Refresh Token') || msg.includes('refresh_token') || msg.includes('Invalid') && msg.includes('Token')) {
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
            setLoading(false);
            return;
          }
        }
        
        if (currentSession?.user) {
          // ⚡ SET USER IMMEDIATELY - don't wait for block check
          setUser(currentSession.user);
          setSession(currentSession);
          setLoading(false); // Allow UI to render immediately
          // Background operations (non-blocking)
          checkBlockStatus(currentSession.user.id).then((blocked) => {
            if (blocked) {
              // Block detected - force logout (already handled in checkBlockStatus)
              return;
            }
          });
          
          // Set up realtime subscription for instant block detection
          if (blockChannelRef.current) {
            await supabase.removeChannel(blockChannelRef.current);
          }
          
          blockChannelRef.current = supabase
            .channel(`user_block_${currentSession.user.id}`)
            .on(
              'postgres_changes',
              {
                event: 'INSERT',
                schema: 'public',
                table: 'user_blocks',
                filter: `user_id=eq.${currentSession.user.id}`
              },
              (payload) => {
                console.log('[Auth] REALTIME: Block detected!');
                forceLogoutBlockedUser(payload.new?.reason);
              }
            )
            .subscribe();
          
          console.log('[Auth] Realtime subscription set up for user:', currentSession.user.id);
        } else {
          setLoading(false);
        }
      } catch (error: any) {
        console.error('[Auth] Auth init error:', error);
        const msg = String(error?.message ?? '');
        if (msg.includes('Refresh Token') || msg.includes('refresh_token') || msg.includes('Invalid') && msg.includes('Token')) {
          try {
            await supabase.auth.signOut();
          } catch (_) {}
          setSession(null);
          setUser(null);
        }
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('[Auth] Auth state change:', event);
        
        if (event === 'SIGNED_OUT') {
          // Remove realtime subscription
          if (blockChannelRef.current) {
            await supabase.removeChannel(blockChannelRef.current);
            blockChannelRef.current = null;
          }
          
          await clearAllAppState();
          setSession(null);
          setUser(null);
          setIsBlocked(false);
          setBlockReason(null);
        } else if (event === 'SIGNED_IN' && newSession?.user) {
          // ⚡ SET USER IMMEDIATELY - don't wait for block check
          setUser(newSession.user);
          setSession(newSession);
          setLoading(false);
          // Background block check (non-blocking)
          checkBlockStatus(newSession.user.id).then((blocked) => {
            if (blocked) {
              // Block detected - force logout (already handled in checkBlockStatus)
              return;
            }
          });
          
          // Set up realtime for new session
          if (blockChannelRef.current) {
            await supabase.removeChannel(blockChannelRef.current);
          }
          
          blockChannelRef.current = supabase
            .channel(`user_block_${newSession.user.id}`)
            .on(
              'postgres_changes',
              {
                event: 'INSERT',
                schema: 'public',
                table: 'user_blocks',
                filter: `user_id=eq.${newSession.user.id}`
              },
              (payload) => {
                console.log('[Auth] REALTIME: Block detected!');
                forceLogoutBlockedUser(payload.new?.reason);
              }
            )
            .subscribe();
          
          console.log('[Auth] Realtime subscription set up for new session');
        } else if (event === 'TOKEN_REFRESHED' && newSession?.user) {
          // ⚡ Update session immediately
          setSession(newSession);
          setUser(newSession.user);
          
          // Background block check (non-blocking)
          checkBlockStatus(newSession.user.id).then((blocked) => {
            if (blocked) {
              // Block detected - force logout
              return;
            }
          });
        }
      }
    );

    return () => {
      subscription.unsubscribe();
      if (blockChannelRef.current) {
        supabase.removeChannel(blockChannelRef.current);
        blockChannelRef.current = null;
      }
    };
  }, [checkBlockStatus, forceLogoutBlockedUser]);

  // CRITICAL: Periodic block check for active sessions (every 5 minutes) - backup to realtime
  useEffect(() => {
    if (!user || isBlocked) return;

    const checkInterval = setInterval(async () => {
      console.log('[Auth] Periodic block check...');
      const blocked = await checkBlockStatus(user.id);
      if (blocked) {
        // forceLogoutBlockedUser is already called in checkBlockStatus
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(checkInterval);
  }, [user, isBlocked, checkBlockStatus]);

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('auth-signup', {
        body: { email, password, fullName },
      });
      if (error) return { error };
      if (data?.session) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }
      return { error: data?.error ? new Error(data.message || data.error) : null };
    } catch (err: any) {
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  };

  const checkBlockedStatus = async (): Promise<{ isBlocked: boolean; reason: string | null }> => {
    const currentUser = user || session?.user;
    if (!currentUser) return { isBlocked: false, reason: null };

    try {
      // Use dedicated check-user-block function (no JWT required)
      const { data, error } = await supabase.functions.invoke('check-user-block', {
        body: { user_id: currentUser.id },
      });

      if (error) {
        // Silently handle errors - network issues shouldn't block the app
        console.warn('[Auth] Block status check failed (non-critical):', error.message);
        // Return not blocked on error to avoid false positives
        return { isBlocked: false, reason: null };
      }

      // API returned block status
      if (data?.isBlocked === true) {
        return { isBlocked: true, reason: data.reason || null };
      }

      return { isBlocked: false, reason: null };
    } catch (error) {
      console.error('[Auth] Error checking blocked status:', error);
      // Return not blocked on error to avoid false positives
      return { isBlocked: false, reason: null };
    }
  };

  // Public method to refresh block status
  const refreshBlockStatus = async (): Promise<boolean> => {
    if (!user?.id) return false;
    const blockedStatus = await checkBlockedStatus();
    if (blockedStatus.isBlocked) {
      setIsBlocked(true);
      setBlockReason(blockedStatus.reason);
      return true;
    }
    setIsBlocked(false);
    setBlockReason(null);
    return false;
  };

  const signIn = async (email: string, password: string) => {
    // Clear app state in background so login is never blocked (e.g. removeChannel can hang)
    clearAllAppState().catch((e) => {
      console.warn('[Auth] clearAllAppState non-blocking error:', e);
    });

    const LOGIN_TIMEOUT_MS = 25000;

    const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> => {
      return new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('Network request timed out. Please try again.')), ms);
        promise.then(
          (v) => {
            clearTimeout(t);
            resolve(v);
          },
          (e) => {
            clearTimeout(t);
            reject(e);
          }
        );
      });
    };

    const doSignIn = async (): Promise<{ error: Error | null; isBlocked?: boolean; blockReason?: string | null }> => {
      try {
        const { data, error: edgeError } = await supabase.functions.invoke('auth-login', {
          body: { email, password },
        });

        if (data?.isBlocked || data?.message?.includes('suspended') || data?.message?.includes('blocked')) {
          setIsBlocked(true);
          setBlockReason(data.reason || null);
          await forceLogoutBlockedUser(data.reason || undefined);
          return {
            error: new Error(data.message || data.error || 'Your account has been suspended'),
            isBlocked: true,
            blockReason: data.reason || null,
          };
        }

        if (edgeError) {
          const { error: directError } = await supabase.auth.signInWithPassword({ email, password });
          if (directError) return { error: directError, isBlocked: false };
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            setUser(session.user);
            setSession(session);
            setLoading(false);
            checkBlockStatus(session.user.id).then(() => {});
          }
          return { error: null, isBlocked: false };
        }

        // Accept session from edge even if success flag is missing (legacy/different API shape)
        if (!data?.success && !data?.session?.access_token) {
          return { error: new Error(data?.message || data?.error || 'Login failed'), isBlocked: false };
        }

        let session = null;
        if (data?.session?.access_token) {
          const { data: sessionData } = await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token || '',
          });
          session = sessionData?.session ?? (await supabase.auth.getSession()).data?.session;
        } else {
          const { error: directError } = await supabase.auth.signInWithPassword({ email, password });
          if (directError) return { error: directError, isBlocked: false };
          session = (await supabase.auth.getSession()).data?.session;
        }

        if (session?.user) {
          setUser(session.user);
          setSession(session);
          setLoading(false);
          checkBlockStatus(session.user.id).then(() => {});
        }
        return { error: null, isBlocked: false };
      } catch (err: any) {
        console.error('[Auth] Login error:', err);
        const { error: directError } = await supabase.auth.signInWithPassword({ email, password });
        if (directError) return { error: directError, isBlocked: false };
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          setSession(session);
          setLoading(false);
          checkBlockStatus(session.user.id).then(() => {});
        }
        return { error: null, isBlocked: false };
      }
    };

    try {
      return await withTimeout(doSignIn(), LOGIN_TIMEOUT_MS);
    } catch (err: any) {
      console.error('[Auth] Login timeout or error:', err);
      return {
        error: err instanceof Error ? err : new Error(err?.message || 'Login failed'),
        isBlocked: false,
      };
    }
  };

  const forceSignOutBlockedUser = async (reason?: string) => {
    console.log('[Auth] User is blocked, forcing sign out');
    setIsBlocked(true);

    try {
      const { Alert } = await import('react-native');
      const saved = await AsyncStorage.getItem('rekto-language');
      const locale: LocaleKey = saved === 'ckb' ? 'ckb' : 'ar';
      const title = getTranslation('accountSuspended', locale);
      const message = reason || getTranslation('accountSuspendedMessage', locale);
      Alert.alert(title, message, [{ text: 'OK' }]);
    } catch (e) {
      // Alert not available, continue with sign out
    }

    // Clear all app state
    await clearAllAppState();

    // Sign out from Supabase
    await supabase.auth.signOut();

    setSession(null);
    setUser(null);
    setIsBlocked(false);
    setBlockReason(null);
  };

  const signOut = async () => {
    try {
      console.log('[Auth] Starting sign out...');
      // Clear all state BEFORE signing out
      await clearAllAppState();
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      // ALWAYS clear local state, regardless of Supabase response
      setSession(null);
      setUser(null);
      setIsBlocked(false);
      setBlockReason(null);
      
      if (error) {
        console.error('[Auth] Sign out error:', error);
      } else {
        console.log('[Auth] Sign out successful');
      }
    } catch (error) {
      console.error('[Auth] Sign out exception:', error);
      // Force clear local state on error
      setSession(null);
      setUser(null);
      setIsBlocked(false);
      setBlockReason(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isLoading, isBlocked, blockReason, signUp, signIn, signOut, checkBlockedStatus, checkBlockStatus, refreshBlockStatus }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

