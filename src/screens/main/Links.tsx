import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus, Link2, Sparkles, AlertCircle } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRemoteConfig } from '@/contexts/RemoteConfigContext';
import { supabase, safeQuery } from '@/integrations/supabase/client';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, borderRadius } from '@/theme/spacing';
import { toast } from '@/utils/toast';
import { fetchLinkPage, createLinkPage, generateLinkMagicEmail, updateLinkPage } from '@/services/linkMagicApi';
import { LinkCard } from '@/components/links/LinkCard';
import { Text } from '@/components/common/Text';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getCached, setCached } from '@/services/globalCache';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { isRTL, rtlText, rtlRow } from '@/utils/rtl';

interface UserLink {
  id: string;
  title: string;
  slug: string;
  url?: string | null;
  linkmagic_email: string | null;
  share_code: string | null;
  call_to_action: string | null;
  created_at: string;
}

interface LinkSocialData {
  display_name?: string;
  bio?: string;
  avatar_url?: string | null;
  theme?: string;
  platform_order?: string[];
  [key: string]: any; // For platform fields (whatsapp, instagram, etc.)
}

const generateShortId = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export function Links() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { settings: config } = useRemoteConfig();
  const { t, language } = useLanguage();
  const rtl = isRTL(language);
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const styles = createStyles(colors, insets, rtl);
  const [userName, setUserName] = useState<string>('');
  const profileCache = getCached<{ full_name?: string | null } | null>('profile', null);
  useEffect(() => {
    const fromCache = profileCache?.full_name || user?.user_metadata?.full_name || '';
    if (fromCache) {
      setUserName(fromCache);
      return;
    }
    if (!user?.id) return;
    supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        const name = data?.full_name || user?.user_metadata?.full_name || '';
        if (name) setUserName(name);
      });
  }, [user?.id, user?.user_metadata?.full_name, profileCache?.full_name]);
  const displayName = userName || user?.email?.split('@')[0] || (rtl ? 'بەکارهێنەر' : 'User');
  // Check if links feature is disabled
  const isDisabled = config && !config.features?.links_enabled;
  const [creating, setCreating] = useState(false);
  const queryKey = ['user-links', user?.id];

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return () => {};
      queryClient.invalidateQueries({ queryKey });
      return () => {};
    }, [user?.id, queryClient, queryKey])
  );

  useEffect(() => {
    if (!user?.id) return () => {};

    if (!supabase) return () => {};

    const channel = supabase
      .channel(`user-links-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_links', filter: `user_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey })
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'link_social_data', filter: `user_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient, queryKey]);

  const verifyLinksInBackground = useCallback(async (linksData: UserLink[]) => {
    if (!user?.id) return;
    let hasChanges = false;

    const { data: localLinks } = await safeQuery((client) =>
      client
        .from('user_links')
        .select('*')
        .eq('user_id', user.id)
    );
    const sourceLinks =
      localLinks && localLinks.length > 0 ? localLinks : Array.isArray(linksData) ? linksData : [];

    const results = await Promise.allSettled(
      sourceLinks.map(async (link) => {
        if (!link.linkmagic_email) {
          await supabase
            .from('client_links')
            .delete()
            .eq('link_id', link.id)
            .eq('user_id', user.id);
          await supabase
            .from('link_social_data')
            .delete()
            .eq('link_id', link.id)
            .eq('user_id', user.id);
          await supabase
            .from('user_links')
            .delete()
            .eq('id', link.id)
            .eq('user_id', user.id);
          hasChanges = true;
          return;
        }

        const apiData = await fetchLinkPage(link.linkmagic_email);
        if (apiData.not_found === true || !apiData.data?.client) {
          await supabase
            .from('client_links')
            .delete()
            .eq('link_id', link.id)
            .eq('user_id', user.id);
          await supabase
            .from('link_social_data')
            .delete()
            .eq('link_id', link.id)
            .eq('user_id', user.id);
          await supabase
            .from('user_links')
            .delete()
            .eq('id', link.id)
            .eq('user_id', user.id);
          hasChanges = true;
          return;
        }

        const apiShareCode = apiData.data?.client?.share_code || apiData.client?.share_code || null;
        if (apiShareCode && apiShareCode !== link.share_code) {
          await supabase
            .from('user_links')
            .update({ share_code: apiShareCode })
            .eq('id', link.id)
            .eq('user_id', user.id);
          hasChanges = true;
        }
      })
    );

    const hadErrors = results.some((result) => result.status === 'rejected');
    if (__DEV__ && hadErrors) {
      console.warn('[Links] Background sync had failures.');
    }

    if (hasChanges) {
      queryClient.invalidateQueries({ queryKey });
    }
  }, [queryClient, queryKey, user?.id]);

  const fetchLinks = useCallback(async () => {
    if (!user?.id) {
      return { links: [], socialMap: {} };
    }

    try {
      // Fetch core data in parallel for instant rendering
      const [linksResult, socialResult, clientLinksResult] = await Promise.all([
        safeQuery((client) =>
          client
            .from('user_links')
            .select('id, title, slug, url, share_code, call_to_action, linkmagic_email, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
        ),
        safeQuery((client) =>
          client
            .from('link_social_data')
            .select('*')
            .eq('user_id', user.id)
        ),
        safeQuery((client) =>
          client
            .from('client_links')
            .select('*')
            .eq('user_id', user.id)
            .order('display_order', { ascending: true })
        ),
      ]);

      if (linksResult.error) throw linksResult.error;

      const linksData = (linksResult.data || []) as UserLink[];

      const socialMap: Record<string, LinkSocialData> = {};
      if (socialResult.data) {
        socialResult.data.forEach((social: any) => {
          socialMap[social.link_id] = social;
        });
      }

      const clientLinks = clientLinksResult.data || [];
      if (clientLinks.length > 0) {
        const byLinkId: Record<string, any[]> = {};
        clientLinks.forEach((link: any) => {
          const linkKey = link.link_id;
          if (!byLinkId[linkKey]) byLinkId[linkKey] = [];
          byLinkId[linkKey].push(link);
        });
        Object.entries(byLinkId).forEach(([linkKey, items]) => {
          setCached(`client_links_${linkKey}`, items);
        });
      }

      setCached('user_links', linksData);
      setCached('link_social_data', socialMap);
      setCached('client_links', clientLinks);

      return { links: linksData, socialMap };
    } catch (error: any) {
      if (error?.name === 'TimeoutError') {
        console.warn('Link fetch request timed out:', error.message);
      } else {
        console.error('Error fetching links:', error);
      }
      toast.error('Error', 'Failed to load links');
      return { links: [], socialMap: {} };
    }
  }, [user?.id, verifyLinksInBackground]);

  const cachedLinks = getCached<UserLink[]>('user_links', []);
  const cachedSocial = getCached<Record<string, LinkSocialData>>('link_social_data', {});

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: fetchLinks,
    enabled: !!user?.id,
    initialData: cachedLinks.length > 0 ? { links: cachedLinks, socialMap: cachedSocial } : undefined,
    initialDataUpdatedAt: cachedLinks.length > 0 ? Date.now() : undefined,
    staleTime: 60000,
    gcTime: 300000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: 1,
    retryDelay: 1000,
  });

  const links = Array.isArray(data?.links) ? data?.links : [];
  const loading = isLoading;
  const isFirstLoad = cachedLinks.length === 0 && loading;
  const maxLinksReached = links.length >= 5;

  useEffect(() => {
    if (!links.length) return;
    const timer = setTimeout(() => {
      void verifyLinksInBackground(links);
    }, 2000);
    return () => clearTimeout(timer);
  }, [links, verifyLinksInBackground]);

  const handleCreate = async () => {
    if (!user) return;
    if (maxLinksReached) {
      toast.warning('Limit reached', 'گەیشتیت بە سنووری ٥ لینک...');
      return;
    }

    setCreating(true);
    try {
      const generatedSlug = generateShortId();
      const fallbackEmail = `${generatedSlug}@${user.id.substring(0, 8)}.linkpage.rekto.net`;
      const linkmagicEmail = (await generateLinkMagicEmail(generatedSlug, user.id)) || fallbackEmail;

      const { data, error } = await supabase
        .from('user_links')
        .insert({
          user_id: user.id,
          title: generatedSlug,
          slug: generatedSlug,
          linkmagic_email: linkmagicEmail,
        })
        .select()
        .single();

      if (error) throw error;

      await supabase
        .from('link_social_data')
        .insert({
          user_id: user.id,
          link_id: data.id,
          slug: generatedSlug,
          display_name: generatedSlug,
          sync_status: 'pending',
        });

      const linkRecord = {
        ...(data as UserLink),
        linkmagic_email: linkmagicEmail,
        share_code: data.share_code || null,
      };

      queryClient.setQueryData(queryKey, (oldData: any) => {
        const existing = oldData?.links || [];
        return {
          ...oldData,
          links: [linkRecord as UserLink, ...existing],
        };
      });

      toast.success(t('linkCreated') || 'Link Created', t('addYourInfo') || 'Add your information');

      // Navigate to editor
      navigation.navigate('LinkEditor', {
        linkId: data.id,
        link: linkRecord,
        linkmagic_email: linkmagicEmail,
        isNew: true,
      });

      void (async () => {
        try {
          const apiResponse = await createLinkPage(generatedSlug, generatedSlug, '', linkmagicEmail);
          const shareCode =
            apiResponse?.share_code ||
            apiResponse?.data?.client?.share_code ||
            apiResponse?.client?.share_code ||
            null;
          const finalShareCode = shareCode || Math.random().toString(16).substring(2, 18);

          await supabase
            .from('user_links')
            .update({ share_code: finalShareCode })
            .eq('id', data.id)
            .eq('user_id', user.id);

          await supabase
            .from('link_social_data')
            .update({ sync_status: 'synced' })
            .eq('link_id', data.id)
            .eq('user_id', user.id);
        } catch {
          const fallbackShareCode = Math.random().toString(16).substring(2, 18);
          await supabase
            .from('user_links')
            .update({ share_code: fallbackShareCode })
            .eq('id', data.id)
            .eq('user_id', user.id);
          await supabase
            .from('link_social_data')
            .update({ sync_status: 'failed' })
            .eq('link_id', data.id)
            .eq('user_id', user.id);
        } finally {
          queryClient.invalidateQueries({ queryKey });
        }
      })();
    } catch (error: any) {
      toast.error(
        t('generalError') || 'Error',
        error.message || t('linkCreateFailed') || 'Failed to create link'
      );
    } finally {
      setCreating(false);
    }
  };

  const handleRetrySync = async (link: UserLink) => {
    if (!user?.id || !link.linkmagic_email) {
      toast.error('Error', 'Missing link identifier');
      return;
    }

    try {
      const [socialResult, clientResult] = await Promise.all([
        safeQuery((client) =>
          client
            .from('link_social_data')
            .select('*')
            .eq('link_id', link.id)
            .eq('user_id', user.id)
            .maybeSingle()
        ),
        safeQuery((client) =>
          client
            .from('client_links')
            .select('*')
            .eq('link_id', link.id)
            .eq('user_id', user.id)
            .order('display_order', { ascending: true })
        ),
      ]);

      if (socialResult.error) throw socialResult.error;

      const socialData = socialResult.data;
      if (socialData) {
        await updateLinkPage(
          link.linkmagic_email,
          {
            display_name: socialData.display_name,
            bio: socialData.bio,
            themeId: socialData.theme,
            avatar_url: socialData.avatar_url || undefined,
          },
          socialData.slug || link.slug || undefined
        );
      }

      const clientLinks = clientResult.data || [];
      if (clientLinks.length > 0) {
        const syncPromises = clientLinks.map((item) =>
          supabase.functions.invoke('linkmagic-proxy', {
            body: {
              action: 'add_link',
              linkmagic_email: link.linkmagic_email,
              icon: item.icon,
              value: item.value,
            },
          })
        );
        const results = await Promise.allSettled(syncPromises);
        if (results.some((res) => res.status === 'rejected')) {
          throw new Error('Failed to sync some links');
        }
      }

      const syncedAt = new Date().toISOString();
      await supabase
        .from('link_social_data')
        .update({ sync_status: 'synced', last_synced_at: syncedAt })
        .eq('link_id', link.id)
        .eq('user_id', user.id);
      await supabase
        .from('client_links')
        .update({ sync_status: 'synced', last_synced_at: syncedAt })
        .eq('link_id', link.id)
        .eq('user_id', user.id);

      toast.success(t('synced'), t('linkIsLive'));
      queryClient.invalidateQueries({ queryKey });
    } catch (error: any) {
      const failedAt = new Date().toISOString();
      await supabase
        .from('link_social_data')
        .update({ sync_status: 'failed', last_synced_at: failedAt })
        .eq('link_id', link.id)
        .eq('user_id', user.id);
      await supabase
        .from('client_links')
        .update({ sync_status: 'failed', last_synced_at: failedAt })
        .eq('link_id', link.id)
        .eq('user_id', user.id);

      toast.error('Error', error?.message || 'Failed to sync');
      queryClient.invalidateQueries({ queryKey });
    }
  };

  const handleDelete = (link: UserLink) => {
    Alert.alert(
      t('deleteLink') || 'Delete Link',
      t('deleteLinkConfirm') || `Are you sure you want to delete "${link.title}"?`,
      [
        { text: t('cancel') || 'Cancel', style: 'cancel' },
        {
          text: t('delete') || 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('user_links')
                .delete()
                .eq('id', link.id);

              if (error) throw error;
              queryClient.setQueryData(queryKey, (oldData: any) => {
                if (!oldData?.links) return oldData;
                return {
                  ...oldData,
                  links: oldData.links.filter((item: UserLink) => item.id !== link.id),
                };
              });
              toast.info(
                isRTL ? 'سڕایەوە' : t('linkDeleted') || 'Link Deleted',
                isRTL ? 'لینکەکە سڕایەوە' : undefined
              );
            } catch (error: any) {
              toast.error(t('error') || 'Error', error.message);
            }
          },
        },
      ]
    );
  };

  // Always render the screen immediately; show inline loading instead of blocking.

  // Show disabled state if feature is disabled
  if (isDisabled) {
    return (
      <View style={styles.container}>
        <ScreenHeader
          title={t('myLinks') || 'My Links'}
          onBack={() => navigation.goBack()}
          style={[styles.header, { paddingTop: Math.max(insets.top, 8) + 12, paddingBottom: 12 }]}
        />
        <View style={styles.disabledContainer}>
          <View style={styles.disabledIconContainer}>
            <AlertCircle size={48} color={colors.foreground.muted} />
          </View>
          <Text style={styles.disabledTitle}>Feature Unavailable</Text>
          <Text style={styles.disabledMessage}>
            Links feature is temporarily disabled. Please check back later or contact support for more information.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t('myLinks') || 'My Links'}
        subtitle={`${t('hi')}, ${displayName}`}
        onBack={() => navigation.goBack()}
        style={[styles.header, { paddingTop: Math.max(insets.top, 8) + 12, paddingBottom: 12 }]}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: Math.max(40, insets.bottom + 90) }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 16, width: '100%' }}>
        {isFirstLoad ? (
          <View style={styles.skeletonContainer}>
            <View style={styles.skeletonCard} />
            <View style={styles.skeletonCard} />
          </View>
        ) : links.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <View style={styles.emptyStateCard}>
              <View style={styles.emptyIconContainer}>
                <View style={styles.emptyIcon}>
                  <Link2 size={40} color={colors.primary.DEFAULT} />
                </View>
                <View style={styles.sparkleIcon}>
                  <Sparkles size={16} color="#fff" />
                </View>
              </View>
              <Text style={[styles.emptyTitle, isRTL && styles.textRTL]}>
                {isRTL ? 'هیچ لینکێکت نییە' : t('noLinksYet') || 'No links yet'}
              </Text>
              <Text style={[styles.emptySubtitle, isRTL && styles.textRTL]}>
                {isRTL
                  ? 'یەکەم لینکی خۆت دروست بکە و زانیاریەکانت لەگەڵ هەمووان بەش بکە'
                  : t('createFirstLinkDesc') || 'Create your first link page'}
              </Text>
              {!maxLinksReached ? (
                <TouchableOpacity
                  style={styles.emptyCtaButton}
                  onPress={handleCreate}
                  disabled={creating}
                  activeOpacity={0.9}
                >
                  <Plus size={18} color={colors.primary.foreground} strokeWidth={2.5} />
                  <Text style={[styles.emptyCtaButtonText, isRTL && styles.textRTL]}>
                    {t('createFirstLink') || 'Create First Link'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.limitMessage}>
                  گەیشتیت بە سنووری ٥ لینک...
                </Text>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.linksList}>
            {maxLinksReached && (
              <Text style={styles.limitMessage}>
                گەیشتیت بە سنووری ٥ لینک...
              </Text>
            )}
            {links.map((link) => {
              const socialData = data?.socialMap?.[link.id];
              const displayName = socialData?.display_name || link.title || link.slug;
              const rawUrl = socialData?.avatar_url;
              const avatarUrl = rawUrl && typeof rawUrl === 'string' && rawUrl.startsWith('https://') ? rawUrl : null;
              return (
                <LinkCard
                  key={link.id}
                  id={link.id}
                  title={displayName}
                  slug={link.slug}
                  shareCode={link.share_code}
                  cta={link.call_to_action}
                  syncStatus={socialData?.sync_status ?? null}
                  avatarUrl={avatarUrl}
                  onRetry={() => handleRetrySync(link)}
                  onEdit={() =>
                    navigation.navigate('LinkEditor', {
                      linkId: link.id,
                      link,
                      linkmagic_email: link.linkmagic_email,
                      isNew: false,
                    })
                  }
                  onDelete={() => handleDelete(link)}
                />
              );
            })}
          </View>
        )}
        </View>
      </ScrollView>

      {links.length > 0 && !maxLinksReached ? (
        <View style={[styles.createButtonContainer, { bottom: 90 + insets.bottom }]}>
          <TouchableOpacity
            style={styles.createButtonTouchable}
            onPress={handleCreate}
            disabled={creating}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#7C3AED', '#9333EA']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.createButtonGradient}
            >
              {creating ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Plus size={20} color={colors.primary.foreground} strokeWidth={2.5} />
                  <Text style={[styles.createButtonText, isRTL && styles.textRTL]}>
                    {isRTL ? 'لینکی نوێ دروست بکە' : t('createNewLink') || 'Create New Link'}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (colors: any, insets: any, isRTL: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.DEFAULT,
  },
  header: {
    minHeight: 56,
    backgroundColor: colors.background.DEFAULT,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.DEFAULT,
  },
  inlineLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  inlineLoadingText: {
    fontSize: 12,
    color: colors.foreground.muted,
  },
  skeletonContainer: {
    paddingVertical: spacing.lg,
    gap: spacing.md,
    paddingHorizontal: spacing.md,
  },
  skeletonCard: {
    height: 84,
    borderRadius: 20,
    backgroundColor: colors.background.tertiary,
  },
  textRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  headerCreateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.background.tertiary,
    minWidth: 60,
    height: 36,
  },
  headerCreateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary.DEFAULT,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingStart: spacing.lg,
    paddingEnd: spacing.lg,
    paddingTop: spacing.sm,
    width: '100%',
    maxWidth: '100%',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    minHeight: 500,
  },
  emptyStateCard: {
    backgroundColor: colors.card.background,
    borderRadius: 24, // rounded-3xl
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyIconContainer: {
    position: 'relative',
    marginBottom: spacing.xl,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: colors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sparkleIcon: {
    position: 'absolute',
    top: -8,
    end: -8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F59E0B', // amber-500
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.foreground.DEFAULT,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.foreground.muted,
    marginBottom: spacing.xl,
    textAlign: 'center',
    maxWidth: 280,
  },
  limitMessage: {
    marginTop: spacing.md,
    fontSize: 14,
    color: colors.warning,
    textAlign: 'center',
  },
  emptyCtaButton: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary.DEFAULT,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 16,
  },
  emptyCtaButtonText: {
    color: colors.primary.foreground,
    fontSize: 14,
    fontWeight: '600',
  },
  linksList: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  createButtonContainer: {
    position: 'absolute',
    start: 0,
    end: 0,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.background.DEFAULT,
    borderTopWidth: 1,
    borderTopColor: colors.border.DEFAULT,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 999,
    width: '100%',
  },
  createButtonTouchable: {
    width: '100%',
  },
  createButtonGradient: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: spacing.md,
    borderRadius: 16,
    gap: 10,
    minHeight: 56,
    width: '100%',
    backgroundColor: colors.primary.DEFAULT,
  },
  createButtonText: {
    color: colors.primary.foreground,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.1,
    textAlign: (isRTL ? 'right' : 'left') as 'left' | 'right',
  },
  disabledContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  disabledIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  disabledTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.foreground.DEFAULT,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  disabledMessage: {
    fontSize: 16,
    color: colors.foreground.muted,
    textAlign: 'center',
    lineHeight: 24,
  },
});
