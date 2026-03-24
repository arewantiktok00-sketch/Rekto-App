import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import {
    Check,
    GripVertical,
    Palette,
    Save,
    Upload,
    X
} from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// Removed DraggableFlatList to prevent screen freeze - using ScrollView instead
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { Text } from '@/components/common/Text';
import { ThemeBottomSheet, ThemeBottomSheetRef } from '@/components/links/ThemeBottomSheet';
import { CTA_OPTIONS, ICON_MAP, PLATFORMS, PLATFORM_FIELDS, REVERSE_ICON_MAP, THEMES } from '@/constants/platforms';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { safeQuery, supabase } from '@/integrations/supabase/client';
import { getCached, setCached } from '@/services/globalCache';
import { generateLinkMagicEmail, updateLinkPage } from '@/services/linkMagicApi';
import { spacing } from '@/theme/spacing';
import { getTypographyStyles } from '@/theme/typography';
import { isRTL, rtlInput, rtlText } from '@/utils/rtl';
import { toast } from '@/utils/toast';
import { launchImageLibrary } from 'react-native-image-picker';

const postLinksApi = async (payload: Record<string, any>) => {
  console.log('[Links API] Request:', payload);
  const { data, error } = await supabase.functions.invoke('links-api', {
    body: payload,
  });
  console.log('[Links API] Response:', error ? 'error' : 'success', data);
  if (error || data?.error) {
    throw new Error(data?.error || data?.message || 'Links API request failed');
  }
  return data;
};

interface PlatformData {
  id: string;
  value: string;
  enabled: boolean;
}

interface PlatformEntry {
  id: string;
  platformId: string;
  value: string;
  title?: string;
  dbLinkId?: string;
}

export function LinkEditor() {
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const isRtl = isRTL(language);
  const { colors } = useTheme();
  // Null guards: avoid reading from undefined route.params (prevents layout/containerHeight-style crashes)
  const routeParams = route?.params ?? {};
  const { linkId, link, linkmagic_email: paramEmail, isNew } = routeParams as {
    linkId?: string;
    link?: { id: string; slug?: string | null; linkmagic_email?: string | null };
    linkmagic_email?: string | null;
    isNew?: boolean;
  };
  const typography = getTypographyStyles(language as 'ckb' | 'ar');
  const styles = createStyles(colors, insets, isRtl, typography);

  const themeBottomSheetRef = useRef<ThemeBottomSheetRef>(null);
  const hasLoadedRef = useRef(false);

  // Form state
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [platformData, setPlatformData] = useState<Record<string, string>>({});
  const [platformOrder, setPlatformOrder] = useState<string[]>([]);
  const [platformDbLinkIds, setPlatformDbLinkIds] = useState<Record<string, string>>({});
  const [callToAction, setCallToAction] = useState<string | null>(
    link?.call_to_action === 'CONTACT_US'
      ? 'contact_us'
      : link?.call_to_action === 'SEND_MESSAGE'
      ? 'send_message'
      : null
  );
  const [selectedTheme, setSelectedTheme] = useState('pearl');
  const [showThemeSheet, setShowThemeSheet] = useState(false);
  const [linkmagicEmail, setLinkmagicEmail] = useState<string | null>(paramEmail || link?.linkmagic_email || null);
  const [linkSlug, setLinkSlug] = useState<string | null>(link?.slug || null);
  const [syncStatus, setSyncStatus] = useState<'pending' | 'synced' | 'failed' | null>(null);
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const [avatarRetryCount, setAvatarRetryCount] = useState(0);

  const MAX_AVATAR_RETRIES = 2;

  useEffect(() => {
    if (__DEV__) console.log('[LinkEditor] Theme state updated:', selectedTheme);
  }, [selectedTheme]);

  useEffect(() => {
    setAvatarLoadError(false);
    setAvatarRetryCount(0);
  }, [avatarUrl]);

  /** Only allow public HTTPS URLs for DB; never save file://, content://, or data: */
  const avatarUrlForDb = (url: string | null): string | null => {
    if (!url || typeof url !== 'string') return null;
    const u = url.trim();
    if (u.startsWith('file://') || u.startsWith('content://') || u.startsWith('data:')) return null;
    return u.startsWith('https://') ? u : null;
  };

  const isLocalAvatarUrl = (url: string | null): boolean => {
    if (!url || typeof url !== 'string') return false;
    const u = url.trim();
    return u.startsWith('file://') || u.startsWith('content://') || u.startsWith('data:');
  };

  const validateSupabaseStorageUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      if (!urlObj.hostname.includes('supabase.co')) return false;
      if (!urlObj.pathname.includes('/storage/v1/object/public/link-avatars/')) return false;
      if (urlObj.protocol !== 'https:') return false;
      return true;
    } catch {
      return false;
    }
  };

  const isValidAvatarUrl = (url: string | null | undefined): boolean => {
    if (!url) return false;
    if (url.startsWith('file://') || url.startsWith('content://') || url.startsWith('data:')) return false;
    return validateSupabaseStorageUrl(url);
  };

  const isNetworkError = (error: any): boolean => {
    const msg = String(error?.nativeEvent?.error?.message ?? error?.message ?? '').toLowerCase();
    return msg.includes('network') || msg.includes('timeout') || msg.includes('failed to fetch') || msg.includes('connection');
  };

  // Upload avatar to Supabase; base64 from react-native-image-picker when picking from gallery.
  const uploadAvatarToStorage = async (imageUri: string, mimeType?: string | null, base64FromPicker?: string): Promise<string> => {
    if (!user?.id) throw new Error('Missing user session');

    const activeLinkId = await resolveActiveLinkId();
    if (!activeLinkId) throw new Error('Missing link_id');

    if (imageUri.startsWith('https://') && imageUri.includes('supabase.co/storage/v1/object/public/link-avatars')) {
      return imageUri;
    }

    const mimeToExt: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/heic': 'heic',
      'image/webp': 'webp',
    };

    const extension = (mimeType && mimeToExt[mimeType]) || 'jpg';
    const contentType = mimeType || 'image/jpeg';
    const timestamp = Date.now();
    const fileName = `${user.id}/${activeLinkId}-${timestamp}.${extension}`;

    let base64Data = base64FromPicker;
    if (!base64Data && (imageUri.startsWith('file://') || imageUri.startsWith('content://'))) {
      try {
        const response = await fetch(imageUri);
        const blob = await response.blob();
        base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result ? result.split(',')[1] || '' : '');
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (e) {
        if (__DEV__) console.warn('[Upload] fetch+base64 fallback failed:', e);
        throw new Error('Failed to read image data');
      }
    }

    if (!base64Data || base64Data.length === 0) {
      throw new Error('Failed to read image data — base64 is empty');
    }

    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    if (__DEV__) console.log('[Upload] Uploading', bytes.length, 'bytes to Supabase Storage...');

    const { error: uploadError } = await supabase.storage
      .from('link-avatars')
      .upload(fileName, bytes.buffer, {
        contentType,
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.error('[Upload] Upload error:', uploadError);
      throw new Error(uploadError.message || 'Upload failed');
    }

    const { data } = supabase.storage.from('link-avatars').getPublicUrl(fileName);
    const publicUrl = data.publicUrl;

    if (__DEV__) console.log('[Upload] SUCCESS! Public URL:', publicUrl);

    if (!publicUrl || !publicUrl.includes('supabase.co')) {
      throw new Error('Failed to get public URL');
    }

    return publicUrl;
  };

  const cleanPlatformValue = (value: string) => {
    if (!value) return value;
    const trimmed = value.trim();
    if (trimmed.startsWith('viber://chat?number=')) {
      return trimmed.replace('viber://chat?number=', '').replace('%2B', '+');
    }
    if (trimmed.startsWith('tel:')) {
      return trimmed.replace('tel:', '');
    }
    if (trimmed.startsWith('https://wa.me/')) {
      const match = trimmed.match(/wa\.me\/(\+?\d+)/);
      return match ? match[1] : trimmed.replace('https://wa.me/', '');
    }
    if (trimmed.startsWith('https://instagram.com/')) {
      return trimmed.replace('https://instagram.com/', '');
    }
    if (trimmed.startsWith('https://facebook.com/')) {
      return trimmed.replace('https://facebook.com/', '');
    }
    if (trimmed.startsWith('https://t.me/')) {
      return trimmed.replace('https://t.me/', '');
    }
    if (trimmed.startsWith('https://snapchat.com/add/')) {
      return trimmed.replace('https://snapchat.com/add/', '');
    }
    if (trimmed.startsWith('https://www.snapchat.com/add/')) {
      return trimmed.replace('https://www.snapchat.com/add/', '');
    }
    if (trimmed.startsWith('https://tiktok.com/@')) {
      return trimmed.replace('https://tiktok.com/@', '');
    }
    if (trimmed.startsWith('https://www.tiktok.com/@')) {
      return trimmed.replace('https://www.tiktok.com/@', '');
    }
    if (trimmed.startsWith('https://youtube.com/@')) {
      return trimmed.replace('https://youtube.com/@', '');
    }
    if (trimmed.startsWith('https://www.youtube.com/@')) {
      return trimmed.replace('https://www.youtube.com/@', '');
    }
    if (trimmed.startsWith('https://youtube.com/c/')) {
      return trimmed.replace('https://youtube.com/c/', '');
    }
    if (trimmed.startsWith('https://www.youtube.com/c/')) {
      return trimmed.replace('https://www.youtube.com/c/', '');
    }
    return trimmed;
  };

  const normalizePhone = (value: string) => {
    let digits = value.replace(/\D/g, '');
    if (digits.startsWith('964')) digits = digits.slice(3);
    if (digits.startsWith('0')) digits = digits.slice(1);
    return digits;
  };

  const ensureHttps = (value: string) => {
    if (!value) return value;
    const trimmed = value.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    return `https://${trimmed}`;
  };

  const buildUrlForPlatform = (platformId: string, value: string) => {
    const normalized = normalizePhone(value);
    if (platformId === 'whatsapp') return `https://wa.me/${normalized}`;
    if (platformId === 'viber') return `viber://chat?number=${normalized}`;
    if (platformId === 'korek_phone' || platformId === 'asiacell_phone' || platformId === 'zain_phone') {
      return `tel:${normalized}`;
    }
    if (platformId === 'instagram') return `https://instagram.com/${value}`;
    if (platformId === 'facebook') return `https://facebook.com/${value}`;
    if (platformId === 'telegram') return `https://t.me/${value}`;
    if (platformId === 'website') return ensureHttps(value);
    if (platformId === 'snapchat') return `https://snapchat.com/add/${value.replace(/^@/, '')}`;
    if (platformId === 'tiktok') return `https://www.tiktok.com/@${value.replace(/^@/, '')}`;
    if (platformId === 'youtube') return value.startsWith('http') ? ensureHttps(value) : `https://www.youtube.com/@${value.replace(/^@/, '')}`;
    return value;
  };

  const mapClientLinksToPlatforms = (clientLinks: any[]) => {
    const iconToPlatformId = Object.keys(ICON_MAP).reduce<Record<string, string>>((acc, key) => {
      acc[ICON_MAP[key]] = key;
      return acc;
    }, { ...REVERSE_ICON_MAP });
    const orderedLinks = [...clientLinks].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
    const mappedPlatformData: Record<string, string> = {};
    const mappedPlatforms: string[] = [];
    const mappedDbLinkIds: Record<string, string> = {};

    orderedLinks.forEach((item) => {
      const platformId = iconToPlatformId[item.icon];
      if (!platformId) return;
      const value = cleanPlatformValue(item.value || '');
      if (!value) return;
      mappedPlatformData[platformId] = value;
      if (!mappedDbLinkIds[platformId] && item.id) {
        mappedDbLinkIds[platformId] = item.id;
      }
      mappedPlatforms.push(platformId);
    });

    const uniquePlatforms = Array.from(new Set(mappedPlatforms));
    return { mappedPlatformData, uniquePlatforms, mappedDbLinkIds };
  };

  const PLATFORM_COLUMNS = [
    'whatsapp',
    'viber',
    'instagram',
    'snapchat',
    'tiktok',
    'youtube',
    'facebook',
    'telegram',
    'website',
    'korek_phone',
    'asiacell_phone',
    'zain_phone',
    'app_store',
    'google_play',
  ] as const;

  const resolveActiveLinkId = async () => {
    if (linkId) return linkId;
    if (!user?.id) return null;
    const lookup = linkmagicEmail
      ? { column: 'linkmagic_email', value: linkmagicEmail }
      : linkSlug
      ? { column: 'slug', value: linkSlug }
      : null;
    if (!lookup) return null;
    const { data, error } = await supabase
      .from('user_links')
      .select('id')
      .eq('user_id', user.id)
      .eq(lookup.column, lookup.value)
      .maybeSingle();
    if (error) {
      if (__DEV__) {
        console.warn('⚠️ Failed to resolve link_id:', error.message);
      }
      return null;
    }
    return data?.id || null;
  };

  const deleteClientLinkLocal = async (icon: string) => {
    if (!user?.id) return;
    try {
      const activeLinkId = await resolveActiveLinkId();
      if (!activeLinkId) return;
      const { error } = await supabase
        .from('client_links')
        .delete()
        .eq('user_id', user.id)
        .eq('link_id', activeLinkId)
        .eq('icon', icon);

      if (error && __DEV__) {
        console.warn('⚠️ client_links delete failed:', error.message);
      }
    } catch (error) {
      if (__DEV__) {
        console.warn('⚠️ client_links delete error:', error);
      }
    }
  };

  // Load data on mount and reload when screen gains focus (so avatar stays up-to-date)
  useFocusEffect(
    useCallback(() => {
      if (isNew || !user || !linkId) return;
      if (!hasLoadedRef.current) {
        hasLoadedRef.current = true;
        loadLinkData().catch((err) => console.error('[LinkEditor] Failed to load link data:', err));
      } else {
        loadLinkData().catch((err) => console.error('[LinkEditor] Failed to reload link data:', err));
      }
    }, [user, linkId, isNew])
  );

  const loadLinkData = async () => {
    if (!user) return;

    try {
      // Fetch link data in parallel (single round-trip)
      const [socialResult, clientLinksResult, linkResult] = await Promise.all([
        safeQuery((client) =>
          client
            .from('link_social_data')
            .select('*')
            .eq('link_id', linkId)
            .eq('user_id', user.id)
            .maybeSingle()
        ),
        safeQuery((client) =>
          client
            .from('client_links')
            .select('*')
            .eq('link_id', linkId)
            .eq('user_id', user.id)
            .order('display_order', { ascending: true })
        ),
        safeQuery((client) =>
          client
            .from('user_links')
            .select('slug, linkmagic_email, created_at, call_to_action')
            .eq('id', linkId)
            .eq('user_id', user.id)
            .single()
        ),
      ]);

      if (socialResult.error) throw socialResult.error;
      if (clientLinksResult.error) throw clientLinksResult.error;
      if (linkResult.error) throw linkResult.error;
      if (!linkResult.data) {
        throw new Error('Link not found');
      }

      const linkData = linkResult.data;

      const socialData = socialResult.data;

      // Batch set all state at once
      const nextDisplayName = socialData?.display_name || '';
      const nextBio = socialData?.bio || '';
      // Only load avatar if it's a valid https URL (never file://, content://, or invalid)
      const rawUrl = socialData?.avatar_url;
      const nextAvatarUrl = rawUrl && typeof rawUrl === 'string' && rawUrl.startsWith('https://') ? rawUrl : null;
      const nextTheme = socialData?.theme || 'pearl';
      const nextSyncStatus = socialData?.sync_status || null;
      const nextLinkSlug = linkData.slug || link?.slug || null;
      const nextCallToAction = linkData.call_to_action
        ? linkData.call_to_action === 'CONTACT_US'
          ? 'contact_us'
          : 'send_message'
        : callToAction;
      const nextLinkmagicEmail = linkData.linkmagic_email || null;

      let nextPlatformData: Record<string, string> = {};
      let nextSelectedPlatforms: string[] = [];
      let nextPlatformOrder: string[] = [];
      let nextPlatformDbLinkIds: Record<string, string> = {};

      if (!isNew) {
        const clientLinks = clientLinksResult.data || [];
        if (clientLinks.length > 0) {
          const { mappedPlatformData, uniquePlatforms, mappedDbLinkIds } = mapClientLinksToPlatforms(clientLinks);
          nextPlatformData = mappedPlatformData;
          nextSelectedPlatforms = uniquePlatforms;
          nextPlatformOrder = uniquePlatforms;
          nextPlatformDbLinkIds = mappedDbLinkIds;
        } else if (socialData) {
          const fallbackFields = [
            'whatsapp',
            'viber',
            'instagram',
            'facebook',
            'telegram',
            'website',
            'korek_phone',
            'asiacell_phone',
            'zain_phone',
            'app_store',
            'google_play',
          ];
          const fallbackPlatforms: string[] = [];
          fallbackFields.forEach((field) => {
            const rawValue = socialData?.[field];
            if (!rawValue) return;
            const cleanValue = cleanPlatformValue(rawValue, field);
            if (!cleanValue) return;
            nextPlatformData[field] = cleanValue;
            fallbackPlatforms.push(field);
          });
          const savedOrder = Array.isArray(socialData?.platform_order) ? socialData.platform_order : [];
          const sortedFallback = savedOrder.length
            ? [
                ...savedOrder.filter((id) => fallbackPlatforms.includes(id)),
                ...fallbackPlatforms.filter((id) => !savedOrder.includes(id)),
              ]
            : fallbackPlatforms;
          nextSelectedPlatforms = sortedFallback;
          nextPlatformOrder = sortedFallback;
        }
      }

      setDisplayName(nextDisplayName);
      setBio(nextBio);
      setAvatarUrl(nextAvatarUrl);
      setSelectedTheme(nextTheme);
      setSyncStatus(nextSyncStatus);
      setLinkSlug(nextLinkSlug);
      if (nextCallToAction) {
        setCallToAction(nextCallToAction);
      }
      if (nextLinkmagicEmail) {
        setLinkmagicEmail(nextLinkmagicEmail);
      }
      if (!isNew) {
        setPlatformData(nextPlatformData);
        setSelectedPlatforms(nextSelectedPlatforms);
        setPlatformOrder(nextPlatformOrder);
        setPlatformDbLinkIds(nextPlatformDbLinkIds);
      }
      
    } catch (error: any) {
      if (error?.name === 'TimeoutError') {
        console.warn('Link data request timed out:', error.message);
      } else {
        console.error('Error loading link data:', error);
      }
      toast.error(t('error'), t('networkError'));
    }
  };

  const handleSave = async () => {
    if (!user) {
      Alert.alert(t('error') || 'Error', t('pleaseLoginAgain') || 'Please log in again');
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      Alert.alert(t('error') || 'Error', t('pleaseLoginAgain') || 'Please log in again');
      return;
    }
    let emailForSave = linkmagicEmail;
    if (!emailForSave) {
      const slugCandidate =
        linkSlug ||
        link?.slug ||
        (linkId ? linkId.substring(0, 6) : '') ||
        Math.random().toString(36).substring(2, 8);
      emailForSave = await generateLinkMagicEmail(slugCandidate, user.id);
      await supabase
        .from('user_links')
        .update({ linkmagic_email: emailForSave })
        .eq('id', linkId)
        .eq('user_id', user.id);
      setLinkmagicEmail(emailForSave);
      setLinkSlug(slugCandidate);
    }

    if (!callToAction) {
      toast.warning(
        isRtl ? 'دوگمەی سەرەکی پێویستە' : 'Required',
        isRtl ? 'تکایە یەکێک لە دوگمەکان هەڵبژێرە' : 'Please select a call to action'
      );
      return;
    }

    setSaving(true);
    try {
      const activeLinkId = await resolveActiveLinkId();
      if (!activeLinkId) {
        throw new Error('Missing link_id for platform save');
      }
      // Ensure slug is never null for link_social_data: prefer existing slug state, then initial link, then link_id.
      const safeSlug = linkSlug || link?.slug || activeLinkId;

      // STEP 1: Collect platform entries (only those with values)
      const platformEntries: PlatformEntry[] = [];
      const baseOrder = platformOrder.length > 0 ? platformOrder : selectedPlatforms;
      const uniqueOrder = Array.from(new Set(baseOrder));

      const isPhonePlatform = (id: string) =>
        ['whatsapp', 'viber', 'korek_phone', 'asiacell_phone', 'zain_phone'].includes(id);
      for (const platformId of uniqueOrder) {
        let value = (platformData[platformId] || '').trim();
        if (!value) continue;
        if (isPhonePlatform(platformId)) {
          value = value.replace(/[\s\-+()]/g, '');
        }
        if (value) {
          platformEntries.push({
            id: `${platformId}_${platformEntries.length + 1}`,
            platformId,
            value,
            title: platformId,
            dbLinkId: platformDbLinkIds[platformId],
          });
        }
      }

      // STEP 2: Build platformValues object for link_social_data columns
      // Map React Native platform IDs to database column names (from PLATFORM_FIELDS)
      const platformIdToDbColumn: Record<string, string> = { ...PLATFORM_FIELDS };
      const platformValues: Record<string, string | null> = {};
      const platformOrderArray: string[] = [];
      platformEntries.forEach((entry) => {
        const dbColumn = platformIdToDbColumn[entry.platformId] || entry.platformId;
        if (!platformValues[dbColumn]) {
          platformValues[dbColumn] = entry.value.trim();
        }
        if (!platformOrderArray.includes(entry.platformId)) {
          platformOrderArray.push(entry.platformId);
        }
      });
      PLATFORM_COLUMNS.forEach((column) => {
        if (!platformValues.hasOwnProperty(column)) {
          platformValues[column] = null;
        }
      });
      const ALL_PLATFORM_FIELDS = [
        'whatsapp',
        'viber',
        'instagram',
        'facebook',
        'telegram',
        'snapchat',
        'tiktok',
        'youtube',
        'website',
        'korek_phone',
        'asiacell_phone',
        'zain_phone',
        'app_store',
        'google_play',
      ] as const;
      const nullFields: Record<string, null> = {};
      ALL_PLATFORM_FIELDS.forEach((field) => {
        if (!platformValues[field]) {
          nullFields[field] = null;
        }
      });

      // STEP 3: Upload avatar if needed - NEVER save local file paths to DB
      let finalAvatarUrl = avatarUrl;
      if (finalAvatarUrl && (finalAvatarUrl.startsWith('file://') || finalAvatarUrl.startsWith('content://') || finalAvatarUrl.startsWith('data:'))) {
        try {
          finalAvatarUrl = await uploadAvatarToStorage(finalAvatarUrl);
          setAvatarUrl(finalAvatarUrl);
        } catch (e) {
          console.error('Avatar upload failed:', e);
          finalAvatarUrl = null;
          setAvatarUrl(null);
        }
      } else if (finalAvatarUrl && !finalAvatarUrl.includes('supabase.co/storage/v1/object/public/link-avatars')) {
        finalAvatarUrl = null;
        setAvatarUrl(null);
      }

      // Never save local or invalid URIs to database
      let saveAvatarUrl = finalAvatarUrl;
      if (saveAvatarUrl && !saveAvatarUrl.startsWith('https://')) {
        saveAvatarUrl = null;
      }

      // STEP 4: Save to link_social_data — NEVER use .upsert() or onConflict (table has no matching unique constraint). Only .select() then .update() or .insert().
      const socialUpdate = {
        display_name: displayName,
        bio: bio,
        theme: selectedTheme,
        avatar_url: saveAvatarUrl,
        platform_order: platformOrderArray,
        sync_status: 'pending' as const,
        updated_at: new Date().toISOString(),
        slug: safeSlug,
        ...nullFields,
        ...platformValues,
      };

      // Check if row exists
      const { data: existingSocial, error: checkError } = await supabase
        .from('link_social_data')
        .select('id')
        .eq('link_id', activeLinkId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking existing social data:', checkError);
      }

      // Update or insert (NO UPSERT)
      if (existingSocial) {
        const { error: updateError } = await supabase
          .from('link_social_data')
          .update(socialUpdate)
          .eq('id', existingSocial.id);

        if (updateError) {
          throw updateError;
        }
      } else {
        const { error: insertError } = await supabase
          .from('link_social_data')
          .insert({
            user_id: user.id,
            link_id: activeLinkId,
            ...socialUpdate,
          });

        if (insertError) {
          throw insertError;
        }
      }

      setSyncStatus('pending');

      // STEP 5: Read existing client_links and reconcile by icon/value
      const { data: existingLinks, error: existingLinksError } = await supabase
        .from('client_links')
        .select('id, icon, value, url, title, display_order')
        .eq('user_id', user.id)
        .eq('link_id', activeLinkId);

      if (existingLinksError) {
        console.error('Error loading existing client_links:', existingLinksError);
      }

      const allEntries = platformEntries
        .filter((entry) => entry.value.trim())
        .map((entry, index) => {
        const icon = ICON_MAP[entry.platformId] || entry.platformId;
        const url = buildUrlForPlatform(entry.platformId, entry.value);
        return {
          ...entry,
          icon,
          url,
          title: entry.title || entry.platformId || '',
          display_order: index + 1,
        };
      });
      const currentIcons = new Set(allEntries.map((entry) => entry.icon));
      const currentRemotePairs = new Set(allEntries.map((entry) => `${entry.icon}::${entry.url}`));
      const existingById = new Map((existingLinks || []).map((link) => [link.id, link]));
      const linksToUpdate = allEntries.filter((entry) => {
        if (!entry.dbLinkId) return false;
        const existing = existingById.get(entry.dbLinkId);
        if (!existing) return false;
        return existing.value !== entry.value;
      });
      const normalizeForCompare = (icon: string, value: string) => {
        const normalizedValue = cleanPlatformValue(value || '');
        if (['whatsapp', 'viber', 'korek', 'asiacell', 'zain'].includes(icon)) {
          return normalizePhone(normalizedValue);
        }
        return normalizedValue.toLowerCase();
      };
      const linksToInsert = allEntries.filter((entry) => {
        if (entry.dbLinkId) return false;
        const alreadyExists = (existingLinks || []).some((link) => {
          if (link.icon !== entry.icon) return false;
          return normalizeForCompare(link.icon, link.value) === normalizeForCompare(entry.icon, entry.value);
        });
        return !alreadyExists;
      });
      const linksToDelete = (existingLinks || []).filter((link) => !currentIcons.has(link.icon));
      for (const link of linksToDelete) {
        await supabase
          .from('client_links')
          .delete()
          .eq('id', link.id)
          .eq('user_id', user.id);
        if (emailForSave) {
          await supabase.functions.invoke('links-api', {
            method: 'POST',
            body: {
              action: 'delete_by_icon_value',
              user_email: emailForSave,
              icon: link.icon,
              value: link.value,
            },
          });
        }
      }
      for (const entry of linksToUpdate) {
        const icon = ICON_MAP[entry.platformId] || entry.platformId;
        const url = buildUrlForPlatform(entry.platformId, entry.value);
        await supabase
          .from('client_links')
          .update({
            value: entry.value,
            url,
            title: entry.title || null,
            display_order: entry.display_order,
            sync_status: 'pending',
            updated_at: new Date().toISOString(),
          })
          .eq('id', entry.dbLinkId!)
          .eq('user_id', user.id);
        console.log('[LinkEditor] UPDATED existing client_link:', entry.dbLinkId, 'new value:', entry.value);
      }
      if (linksToInsert.length > 0) {
        let nextOrder = (existingLinks || []).reduce((max, link) => {
          const order = Number(link.display_order ?? 0);
          return order > max ? order : max;
        }, 0) + 1;
        for (const entry of linksToInsert) {
          const url = buildUrlForPlatform(entry.platformId, entry.value);
          const { error: insertLinkError } = await supabase
            .from('client_links')
            .insert({
              user_id: user.id,
              link_id: activeLinkId,
              icon: entry.icon,
              value: entry.value,
              url,
              title: entry.title || null,
              display_order: nextOrder++,
              sync_status: 'pending',
            });
          if (insertLinkError) {
            throw insertLinkError;
          }
          console.log('[LinkEditor] INSERTED new client_link:', entry.icon, entry.value);
        }
      }
      if (emailForSave) {
        for (const entry of linksToUpdate) {
          const oldLink = entry.dbLinkId ? existingById.get(entry.dbLinkId) : undefined;
          if (!oldLink) continue;
          try {
            await supabase.functions.invoke('links-api', {
              body: {
                action: 'delete_by_icon_value',
                user_email: emailForSave,
                icon: oldLink.icon,
                value: oldLink.value,
              },
            });
            console.log('[LinkEditor] Remote deleted old value:', oldLink.icon, oldLink.value);
          } catch (err) {
            console.warn('[LinkEditor] Remote delete failed:', err);
          }
          try {
            await supabase.functions.invoke('linkmagic-proxy', {
              body: {
                action: 'add_link',
                linkmagic_email: emailForSave,
                icon: entry.icon,
                value: entry.value,
              },
            });
            console.log('[LinkEditor] Remote added new value:', entry.icon, entry.value);
          } catch (err) {
            console.warn('[LinkEditor] Remote add failed:', err);
          }
        }
      }

      // STEP 7: Update user_links
      const { error: updateUserLinksError } = await supabase
        .from('user_links')
        .update({
          linkmagic_email: emailForSave,
          call_to_action: callToAction === 'contact_us' ? 'CONTACT_US' : 'SEND_MESSAGE',
          title: displayName || link?.slug || linkSlug || undefined,
        })
        .eq('id', activeLinkId)
        .eq('user_id', user.id);

      if (updateUserLinksError) {
        throw updateUserLinksError;
      }

      // Update cache
      const existingUserLinks = getCached<any[]>('user_links', []);
      if (existingUserLinks.length > 0) {
        setCached(
          'user_links',
          existingUserLinks.map((item) =>
            item?.id === activeLinkId
              ? {
                  ...item,
                  linkmagic_email: emailForSave,
                  call_to_action: callToAction === 'contact_us' ? 'CONTACT_US' : 'SEND_MESSAGE',
                  title: displayName || item?.title || link?.slug || linkSlug || item?.slug,
                }
              : item
          )
        );
      }

      const existingSocialCache = getCached<Record<string, any>>('link_social_data', {});
      setCached('link_social_data', {
        ...existingSocialCache,
        [activeLinkId]: {
          ...(existingSocialCache?.[activeLinkId] || {}),
          display_name: displayName,
          bio,
          theme: selectedTheme,
          avatar_url: saveAvatarUrl,
          platform_order: platformOrderArray,
          sync_status: 'pending',
          ...platformValues,
        },
      });

      toast.success(
        isRtl ? 'پاشەکەوت کرا!' : 'Saved',
        isRtl
          ? 'زانیاریەکانت نوێ کرایەوە'
          : platformEntries.length > 0
          ? `${platformEntries.length} platform${platformEntries.length > 1 ? 's' : ''} saved`
          : (t('yourInfoUpdated'))
      );
      navigation.goBack();

      // STEP 8: Background sync to LinkMagic API (including theme)
      void (async () => {
        let syncFailed = false;
        try {
          if (__DEV__) console.log('💾 Saving theme to LinkMagic API:', selectedTheme);
          const profilePayload = {
            display_name: displayName,
            bio: bio,
            themeId: selectedTheme,
            avatar_url: saveAvatarUrl || undefined,
          };
          if (__DEV__) console.log('[Linkmagic] PATCH profile request:', profilePayload);
          await updateLinkPage(emailForSave, profilePayload, linkSlug || undefined);
          if (__DEV__) console.log('[Linkmagic] PATCH profile success - theme saved:', selectedTheme);
        } catch (error) {
          console.error('[Linkmagic] PATCH profile error:', error);
          syncFailed = true;
        }

        if (platformEntries.length > 0) {
          const syncPromises = platformEntries.map((entry) => {
            const icon = ICON_MAP[entry.platformId] || entry.platformId;
            const formattedUrl = buildUrlForPlatform(entry.platformId, entry.value);
            return supabase.functions.invoke('linkmagic-proxy', {
              body: {
                action: 'add_link',
                linkmagic_email: emailForSave,
                icon: icon,
                value: formattedUrl,
              },
            });
          });
          const syncResults = await Promise.allSettled(syncPromises);
          if (syncResults.some((result) => result.status === 'rejected')) {
            syncFailed = true;
          }
        }
        try {
          const { data: remoteData } = await supabase.functions.invoke('linkmagic-proxy', {
            method: 'POST',
            body: { action: 'get', user_email: emailForSave },
          });
          const remoteLinks = remoteData?.data?.links || remoteData?.links || [];
          for (const remoteLink of remoteLinks) {
            const remoteValue = remoteLink.url || remoteLink.value;
            const pairKey = `${remoteLink.icon}::${remoteValue}`;
            if (!currentIcons.has(remoteLink.icon) || !currentRemotePairs.has(pairKey)) {
              await supabase.functions.invoke('links-api', {
                method: 'POST',
                body: {
                  action: 'delete_by_icon_value',
                  user_email: emailForSave,
                  icon: remoteLink.icon,
                  value: remoteLink.value,
                },
              });
            }
          }
        } catch (_) {
          syncFailed = true;
        }

        const nextStatus: 'synced' | 'failed' = syncFailed ? 'failed' : 'synced';
        const syncedAt = new Date().toISOString();
        try {
          // Update by primary key only — no upsert/onConflict
          const { data: socialRow } = await supabase
            .from('link_social_data')
            .select('id')
            .eq('link_id', activeLinkId)
            .eq('user_id', user.id)
            .maybeSingle();
          if (socialRow?.id) {
            await supabase
              .from('link_social_data')
              .update({ sync_status: nextStatus, last_synced_at: syncedAt })
              .eq('id', socialRow.id);
          }
          await supabase
            .from('client_links')
            .update({ sync_status: nextStatus, last_synced_at: syncedAt })
            .eq('link_id', activeLinkId)
            .eq('user_id', user.id);
        } catch {
          // ignore background sync status update errors
        }
        setSyncStatus(nextStatus);
      })();
    } catch (error: any) {
      console.error('Save failed:', error);
      toast.error(t('error'), t('somethingWentWrong'));
    } finally {
      setSaving(false);
    }
  };

  const togglePlatform = (platformId: string) => {
    if (selectedPlatforms.includes(platformId)) {
      const platformValue = platformData[platformId];
      const basePlatformId = platformId.split('_')[0];
      const iconName = ICON_MAP[platformId] || ICON_MAP[basePlatformId];

      if (!linkmagicEmail) {
        console.warn('⚠️ Missing linkmagic_email. Skipping delete API call.');
      } else if (iconName && platformValue) {
        void (async () => {
          const activeLinkIdForDelete = await resolveActiveLinkId();
          let rawValue = buildUrlForPlatform(platformId, platformValue);
          if (activeLinkIdForDelete) {
            const { data: existingLink } = await supabase
              .from('client_links')
              .select('value')
              .eq('user_id', user.id)
              .eq('link_id', activeLinkIdForDelete)
              .eq('icon', iconName)
              .maybeSingle();
            if (existingLink?.value) {
              rawValue = existingLink.value;
            }
          }
          await postLinksApi({
            action: 'delete_by_icon_value',
            user_email: linkmagicEmail,
            icon: iconName,
            value: rawValue,
          });
        })().catch(() => {
          toast.error(t('error'), t('somethingWentWrong'));
        });
        void deleteClientLinkLocal(iconName);
      }
      if (user?.id) {
        void (async () => {
          const activeLinkId = await resolveActiveLinkId();
          if (!activeLinkId) return;
          if (PLATFORM_COLUMNS.includes(platformId as (typeof PLATFORM_COLUMNS)[number])) {
            await supabase
              .from('link_social_data')
              .update({
                [platformId]: null,
                sync_status: 'pending',
                updated_at: new Date().toISOString(),
              })
              .eq('link_id', activeLinkId)
              .eq('user_id', user.id);
          }
        })();
      }
      setSelectedPlatforms(selectedPlatforms.filter((id) => id !== platformId));
      setPlatformOrder(platformOrder.filter((id) => id !== platformId));
      if (platformDbLinkIds[platformId]) {
        const nextDbLinkIds = { ...platformDbLinkIds };
        delete nextDbLinkIds[platformId];
        setPlatformDbLinkIds(nextDbLinkIds);
      }
      if (platformData[platformId]) {
        delete platformData[platformId];
        setPlatformData({ ...platformData });
      }
    } else {
      setSelectedPlatforms([...selectedPlatforms, platformId]);
      // Only add if not already in the order
      if (!platformOrder.includes(platformId)) {
        setPlatformOrder([...platformOrder, platformId]);
      }
      setPlatformData({ ...platformData, [platformId]: '' });
    }
  };

  const LINK_AVATARS_BUCKET = 'link-avatars';

  const handleImagePicker = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        includeBase64: true,
      });

      if (result.didCancel || !result.assets?.[0]) return;

      const asset = result.assets[0];
      const imageUri = asset.uri ?? '';
      if (result.errorCode === 'permission') {
        toast.warning(
          isRtl ? 'دەسەڵات' : 'Permission',
          isRtl ? 'دەسەڵاتی وێنە پێویستە' : 'Media library permission is required'
        );
        return;
      }
      if (result.errorMessage) {
        toast.error(t('error'), t('somethingWentWrong'));
        return;
      }

      if (imageUri.startsWith('https://') && imageUri.includes('supabase')) {
        setAvatarRetryCount(0);
        setAvatarLoadError(false);
        setAvatarUrl(imageUri);
      } else if (!imageUri.startsWith('http')) {
        if (!user?.id) {
          toast.error(t('error'), t('pleaseLoginAgain'));
          return;
        }
        let uploadedUrl: string;
        try {
          uploadedUrl = await uploadAvatarToStorage(imageUri, asset.type ?? null, asset.base64 ?? undefined);
        } catch {
          const activeLinkId = await resolveActiveLinkId();
          const linkIdForPath = activeLinkId || `new-${Date.now()}`;
          const timestamp = Date.now();
          const storagePath = `${user.id}/${linkIdForPath}-${timestamp}.jpg`;
          const response = await fetch(imageUri);
          const blob = await response.blob();
          const { error: uploadError } = await supabase.storage
            .from(LINK_AVATARS_BUCKET)
            .upload(storagePath, blob, { contentType: 'image/jpeg', upsert: true });
          if (uploadError) {
            console.error('Avatar upload error:', uploadError);
            toast.error(t('error'), t('somethingWentWrong'));
            return;
          }
          const { data: urlData } = supabase.storage.from(LINK_AVATARS_BUCKET).getPublicUrl(storagePath);
          uploadedUrl = urlData.publicUrl;
        }
        setAvatarRetryCount(0);
        setAvatarLoadError(false);
        setAvatarUrl(uploadedUrl);
      } else {
        setAvatarRetryCount(0);
        setAvatarLoadError(false);
        setAvatarUrl(imageUri);
      }
      toast.success(
        isRtl ? 'سەرکەوتوو' : 'Success',
        isRtl ? 'وێنە هەڵگیرا' : 'Image selected'
      );
    } catch (error: any) {
      console.error('Image picker error:', error);
      toast.error(t('error'), t('somethingWentWrong'));
    }
  };

  // Remove duplicates from platformOrder and create ordered platforms
  const uniquePlatformOrder = Array.from(new Set(platformOrder));
  const orderedPlatforms = uniquePlatformOrder
    .map((id) => PLATFORMS.find((p) => p.id === id))
    .filter(Boolean) as typeof PLATFORMS;

  const openThemeSheet = () => {
    if (!showThemeSheet) {
      setShowThemeSheet(true);
      requestAnimationFrame(() => {
        setTimeout(() => themeBottomSheetRef.current?.present(), 0);
      });
      return;
    }
    themeBottomSheetRef.current?.present();
  };

  return (
    <View style={{ flex: 1 }}>
    <View style={styles.container}>
      <ScreenHeader
        title={isNew ? (isRtl ? 'لینکی نوێ' : (t('newLink') || 'New Link')) : (isRtl ? 'دەستکاری لینک' : (t('editLink') || 'Edit Link'))}
        onBack={() => navigation.goBack()}
        style={{ paddingTop: insets.top + 8 }}
        rightElement={syncStatus ? (
          <View
            style={[
              styles.syncBadge,
              syncStatus === 'pending' ? styles.syncPending : syncStatus === 'failed' ? styles.syncFailed : styles.syncSynced,
            ]}
          >
            <Text style={styles.syncBadgeText} numberOfLines={1}>
              {syncStatus === 'pending' ? (language === 'ar' ? 'قيد المعالجة' : 'چاوەڕوان') : syncStatus === 'failed' ? (language === 'ar' ? 'فشل' : 'سەرکەوتوو نەبوو') : (language === 'ar' ? 'مُزامَن' : 'کار دەکا')}
            </Text>
          </View>
        ) : undefined}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 100,
          width: '100%',
          paddingHorizontal: 0,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 16, width: '100%' }}>
        {/* Avatar & Basic Info Section */}
        <View style={[styles.section, isRtl && styles.sectionRTL]}>
          <View style={[styles.sectionCard, isRtl && styles.sectionCardRTL]}>
            <Text style={[styles.sectionTitle, rtlText(isRtl)]}>
              {isRtl ? 'زانیاری سەرەکی' : t('avatarAndBasicInfo') || 'Avatar & Basic Info'}
            </Text>

            {/* Avatar - only show Image for valid Supabase Storage URL */}
            <View style={styles.avatarContainer}>
              <TouchableOpacity style={styles.avatarWrapper} onPress={handleImagePicker}>
                {avatarUrl && typeof avatarUrl === 'string' && avatarUrl.startsWith('https://') ? (
                  <Image
                    source={{ uri: avatarUrl }}
                    style={{ width: 80, height: 80, borderRadius: 40 }}
                    resizeMode="cover"
                    onError={() => {
                      if (__DEV__) console.log('[Avatar] Image failed, clearing URL');
                      setAvatarUrl(null);
                    }}
                  />
                ) : displayName ? (
                  <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#64748B' }}>
                      {displayName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                ) : (
                  <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center' }}>
                    <Upload size={24} color="#94A3B8" />
                  </View>
                )}
                <View style={styles.avatarEditBadge}>
                  <Upload size={12} color="#fff" />
                </View>
              </TouchableOpacity>
            </View>

            {/* Display Name */}
            <Text style={[styles.label, isRtl && styles.textRTL, rtlText(isRtl)]}>
              {isRtl ? 'ناوی پەڕە' : t('displayName') || 'Display Name'} <Text style={styles.asterisk}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, rtlInput(isRtl)]}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder={isRtl ? 'ناوی پەڕە بنووسە' : t('enterDisplayName') || 'Enter display name'}
              placeholderTextColor={colors.input.placeholder}
            />

            {/* Bio */}
            <Text style={[styles.label, isRtl && styles.textRTL, rtlText(isRtl)]}>
              {isRtl ? 'پێشەکی' : t('bio') || 'Bio'}
            </Text>
            <TextInput
              style={[styles.input, styles.textArea, rtlInput(isRtl)]}
              value={bio}
              onChangeText={setBio}
              placeholder={isRtl ? 'پێشەکی بنووسە' : t('enterBio') || 'Enter bio'}
              placeholderTextColor={colors.input.placeholder}
              multiline
              numberOfLines={4}
            />
          </View>
        </View>

        {/* Platforms Selection Grid */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={[styles.sectionTitle, rtlText(isRtl)]}>
              {isRtl ? 'پلاتفۆرمەکان' : t('platforms') || 'Platforms'}
            </Text>
            <View style={styles.requiredBadge}>
              <Text style={[styles.requiredBadgeText, rtlText(isRtl), isRtl && { fontFamily: 'Rabar_021' }]}>
                {isRtl ? 'پێویستە' : 'Required'}
              </Text>
            </View>
            {selectedPlatforms.length > 0 && (
              <View style={styles.badge}>
                <Text style={[styles.badgeText, rtlText(isRtl), isRtl && { fontFamily: 'Rabar_021' }]}>
                  {selectedPlatforms.length} {isRtl ? 'هەڵبژێردراو' : 'selected'}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.platformGrid}>
            {PLATFORMS.map((platform) => {
              const Icon = platform.icon;
              const isSelected = selectedPlatforms.includes(platform.id);
              return (
                <TouchableOpacity
                  key={platform.id}
                  style={[styles.platformCard, isSelected && styles.platformCardSelected]}
                  onPress={() => togglePlatform(platform.id)}
                >
                  <Icon
                    size={24}
                    color={
                      isSelected
                        ? typeof platform.color === 'function'
                          ? platform.color(colors)
                          : platform.color
                        : colors.foreground.muted
                    }
                  />
                  <Text
                    style={[
                      styles.platformLabel,
                      isSelected && styles.platformLabelSelected,
                      rtlText(isRtl),
                      isRtl && { fontFamily: 'Rabar_021' },
                    ]}
                  >
                    {isRtl ? platform.labelKu : platform.label}
                  </Text>
                  {isSelected && (
                    <View style={styles.checkBadge}>
                      <Check size={12} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Platform Inputs - Draggable */}
        {orderedPlatforms.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Text style={[styles.sectionTitle, rtlText(isRtl)]}>
                {isRtl ? 'زانیاری پلاتفۆرمەکان' : t('platformLinks') || 'Platform Links'}
              </Text>
              <View style={styles.requiredBadge}>
                <Text style={[styles.requiredBadgeText, rtlText(isRtl), isRtl && { fontFamily: 'Rabar_021' }]}>
                  {isRtl ? 'پێویستە' : 'Required'}
                </Text>
              </View>
            </View>
            <Text style={[styles.hintText, rtlText(isRtl)]}>
              {isRtl ? 'ڕیزبەندی بکە' : t('reorderHint') || 'Drag to reorder'}
            </Text>
            <View style={styles.platformInputsList}>
              {orderedPlatforms.map((platform, index) => {
                const Icon = platform.icon;
                return (
                  <View
                    key={`${platform.id}-${index}`}
                    style={styles.platformInputCard}
                  >
                    <View style={[styles.platformInputHeader, isRtl && styles.platformInputHeaderRTL]}>
                      <GripVertical size={20} color={colors.foreground.muted} />
                      <Icon
                        size={20}
                        color={typeof platform.color === 'function' ? platform.color(colors) : platform.color}
                      />
                      <Text style={[styles.platformInputLabel, rtlText(isRtl), isRtl && { fontFamily: 'Rabar_021' }]}>
                        {isRtl ? platform.labelKu : platform.label}
                      </Text>
                    </View>
                    <TextInput
                      style={[styles.platformInput, rtlInput(isRtl)]}
                      value={platformData[platform.id] || ''}
                      onChangeText={(value) =>
                        setPlatformData({ ...platformData, [platform.id]: value })
                      }
                      placeholder={platform.placeholder}
                      placeholderTextColor={colors.input.placeholder}
                      keyboardType={
                        platform.id.includes('phone') || platform.id === 'whatsapp' || platform.id === 'viber'
                          ? 'phone-pad'
                          : 'default'
                      }
                    />
                    <View style={[styles.platformInputActions, isRtl && styles.platformInputActionsRTL]}>
                      <Text
                        style={[styles.platformInputHint, rtlText(isRtl), isRtl && { fontFamily: 'Rabar_021' }]}
                        numberOfLines={1}
                      >
                        {isRtl ? platform.hintKu : platform.hint}
                      </Text>
                      {platformData[platform.id] ? (
                        <TouchableOpacity
                          style={styles.removeButton}
                          onPress={() => {
                            togglePlatform(platform.id);
                          }}
                        >
                          <X size={16} color="#EF4444" />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* CTA Button Selection */}
        <View style={[styles.section, isRtl && styles.sectionRTL]}>
          <Text style={[styles.sectionTitle, rtlText(isRtl)]}>
            {isRtl ? 'دوگمەی سەرەکی' : t('callToAction') || 'Call to Action'} <Text style={styles.asterisk}>*</Text>
            {' '}
            <Text style={[styles.requiredText, rtlText(isRtl)]}>
              {isRtl ? '(پێویستە)' : '(Required)'}
            </Text>
          </Text>
          <View style={styles.ctaGrid}>
            {CTA_OPTIONS.map((cta) => {
              const Icon = cta.icon;
              const isSelected = callToAction === cta.id;
              return (
                <TouchableOpacity
                  key={cta.id}
                  style={[styles.ctaCard, isSelected && styles.ctaCardSelected]}
                  onPress={() => setCallToAction(cta.id)}
                >
                  <Icon size={24} color={isSelected ? colors.primary.DEFAULT : colors.foreground.muted} />
                  <Text
                    style={[styles.ctaLabel, isSelected && styles.ctaLabelSelected, rtlText(isRtl), isRtl && { fontFamily: 'Rabar_021' }]}
                  >
                    {isRtl ? cta.labelKu : cta.label}
                  </Text>
                  {isSelected && (
                    <View style={styles.checkBadge}>
                      <Check size={12} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Theme Selection */}
        <View style={[styles.section, isRtl && styles.sectionRTL]}>
          <TouchableOpacity
            style={[styles.themeSelector, isRtl && styles.themeSelectorRTL]}
            onPress={openThemeSheet}
          >
            <View style={[styles.themeSelectorLeft, isRtl && styles.themeSelectorLeftRTL]}>
              <Palette size={20} color={colors.foreground.DEFAULT} />
              <View>
                <Text style={[styles.themeSelectorLabel, rtlText(isRtl), isRtl && { fontFamily: 'Rabar_021' }]}>
                  {isRtl ? 'دیزاینی لاپەڕە' : t('theme') || 'Theme'}
                </Text>
                <Text style={[styles.themeSelectorValue, rtlText(isRtl), isRtl && { fontFamily: 'Rabar_021' }]}>
                  {isRtl 
                    ? THEMES.find((t) => t.id === selectedTheme)?.labelKu 
                    : THEMES.find((t) => t.id === selectedTheme)?.label || selectedTheme}
                </Text>
              </View>
            </View>
            <Text style={styles.themeSelectorArrow}>{isRtl ? '‹' : '›'}</Text>
          </TouchableOpacity>
        </View>
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={[styles.saveContainer, { paddingBottom: Math.max(insets.bottom, 20) + spacing.lg }]}>
        <TouchableOpacity
          style={styles.saveButtonContainer}
          onPress={handleSave}
          disabled={saving}
        >
          <LinearGradient
            colors={['#7C3AED', '#9333EA']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.saveButton}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Save size={20} color="#fff" />
                <Text style={styles.saveButtonText}>
                  {isRtl ? 'پاشەکەوتکردن' : t('save') || 'Save'}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Theme Bottom Sheet */}
      {showThemeSheet ? (
        <ThemeBottomSheet
          ref={themeBottomSheetRef}
          selectedTheme={selectedTheme}
          onSelectTheme={setSelectedTheme}
        />
      ) : null}
    </View>
    </View>
  );
}

const createStyles = (colors: any, insets: any, isRtl: boolean, typography: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.DEFAULT,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 56,
    maxHeight: 64,
    paddingTop: insets.top + spacing.sm,
    backgroundColor: colors.background.DEFAULT,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
  },
  headerRTL: {
    flexDirection: 'row',
  },
  headerRowReverse: {
    flexDirection: 'row',
  },
  textRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  backButtonWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    minWidth: 40,
    minHeight: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  backButtonLabel: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  headerTitle: {
    ...typography.h3,
    fontSize: 18,
    color: colors.foreground.DEFAULT,
    flex: 1,
    marginHorizontal: spacing.sm,
    textAlign: 'center',
  },
  headerRightSlot: {
    minWidth: 56,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  headerPlaceholder: {
    width: 40,
    height: 40,
  },
  syncBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.foreground.DEFAULT,
  },
  syncPending: {
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
  },
  syncSynced: {
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
  },
  syncFailed: {
    backgroundColor: 'rgba(239, 68, 68, 0.18)',
  },
  content: {
    flex: 1,
  },
  section: {
    width: '100%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  sectionRTL: {
    paddingStart: spacing.md,
    paddingEnd: spacing.md,
  },
  sectionCard: {
    backgroundColor: colors.card.background,
    borderRadius: 24,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  sectionCardRTL: {
    paddingStart: spacing.md,
    paddingEnd: spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  requiredBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: colors.error,
  },
  requiredBadgeText: {
    fontSize: 10,
    color: colors.error,
    fontWeight: '700',
  },
  sectionTitle: {
    ...typography.h3,
    fontSize: 16,
    color: colors.foreground.DEFAULT,
    textAlign: isRtl ? 'right' : 'left',
    writingDirection: isRtl ? 'rtl' : 'ltr',
    fontFamily: isRtl ? 'Rabar_021' : typography.h3.fontFamily,
  },
  badge: {
    backgroundColor: colors.primary.DEFAULT,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  badgeText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary.foreground,
  },
  requiredText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.error,
    fontWeight: '500',
    textAlign: isRtl ? 'right' : 'left',
    writingDirection: isRtl ? 'rtl' : 'ltr',
    fontFamily: isRtl ? 'Rabar_021' : typography.caption.fontFamily,
  },
  hintText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.foreground.muted,
    marginTop: 6,
    marginBottom: 4,
    textAlign: isRtl ? 'right' : 'left',
    writingDirection: isRtl ? 'rtl' : 'ltr',
    fontFamily: isRtl ? 'Rabar_021' : typography.caption.fontFamily,
  },
  label: {
    ...typography.label,
    fontSize: 14,
    color: colors.foreground.DEFAULT,
    marginTop: spacing.md,
    marginBottom: 8,
    textAlign: isRtl ? 'right' : 'left',
    writingDirection: isRtl ? 'rtl' : 'ltr',
  },
  asterisk: {
    color: colors.error,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarInitials: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary.DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitialsText: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.primary.foreground,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border.DEFAULT,
    borderStyle: 'dashed',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    end: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary.DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.background.DEFAULT,
  },
  input: {
    width: '100%',
    minHeight: 48,
    backgroundColor: colors.input.background,
    borderWidth: 1,
    borderColor: colors.input.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.foreground.DEFAULT,
    textAlign: isRtl ? 'right' : 'left',
    writingDirection: isRtl ? 'rtl' : 'ltr',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  platformGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  platformCard: {
    width: '31%',
    minHeight: 80,
    backgroundColor: colors.card.background,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.border.DEFAULT,
    position: 'relative',
  },
  platformCardSelected: {
    borderColor: colors.primary.DEFAULT,
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
  },
  platformLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.foreground.muted,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  platformLabelSelected: {
    color: colors.primary.DEFAULT,
    fontWeight: '600',
  },
  checkBadge: {
    position: 'absolute',
    top: spacing.xs,
    end: spacing.xs,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary.DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  platformInputCard: {
    backgroundColor: colors.card.background,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    position: 'relative',
  },
  platformInputCardActive: {
    opacity: 0.8,
    transform: [{ scale: 1.02 }],
    borderColor: colors.primary.DEFAULT,
    shadowColor: colors.primary.DEFAULT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  platformInputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  platformInputHeaderRTL: {
    flexDirection: 'row',
  },
  platformInputLabel: {
    ...typography.label,
    fontSize: 14,
    color: colors.foreground.DEFAULT,
    textAlign: isRtl ? 'right' : 'left',
  },
  platformInput: {
    width: '100%',
    minHeight: 48,
    backgroundColor: colors.input.background,
    borderWidth: 1,
    borderColor: colors.input.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.foreground.DEFAULT,
    textAlign: isRtl ? 'right' : 'left',
    writingDirection: isRtl ? 'rtl' : 'ltr',
  },
  platformInputsList: {
    flexDirection: 'column',
  },
  platformInputActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  platformInputActionsRTL: {
    flexDirection: 'row-reverse',
  },
  platformInputHint: {
    fontSize: 11,
    color: colors.foreground.muted,
    flex: 1,
  },
  removeButton: {
    padding: spacing.xs,
  },
  addAnotherButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addAnotherText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '500',
  },
  ctaGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  ctaCard: {
    flex: 1,
    backgroundColor: colors.card.background,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.border.DEFAULT,
    minHeight: 100,
    position: 'relative',
  },
  ctaCardSelected: {
    borderColor: colors.primary.DEFAULT,
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
  },
  ctaLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.foreground.muted,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  ctaLabelSelected: {
    color: colors.primary.DEFAULT,
    fontWeight: '600',
  },
  themeSelector: {
    backgroundColor: colors.card.background,
    borderRadius: 12,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  themeSelectorRTL: {
    flexDirection: 'row',
  },
  themeSelectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  themeSelectorLeftRTL: {
    flexDirection: 'row',
  },
  themeSelectorLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.foreground.DEFAULT,
    textAlign: isRtl ? 'right' : 'left',
  },
  themeSelectorValue: {
    fontSize: 12,
    color: colors.foreground.muted,
    marginTop: spacing.xs / 2,
    textAlign: isRtl ? 'right' : 'left',
  },
  themeSelectorArrow: {
    fontSize: 24,
    color: colors.foreground.muted,
  },
  saveContainer: {
    position: 'absolute',
    bottom: 0,
    start: 0,
    end: 0,
    backgroundColor: colors.background.DEFAULT,
    borderTopWidth: 1,
    borderTopColor: colors.border.DEFAULT,
    padding: spacing.md,
    paddingTop: spacing.md,
  },
  saveButtonContainer: {
    width: '100%',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: 16,
    gap: spacing.sm,
    height: 56,
  },
  saveButtonText: {
    ...typography.body,
    color: colors.primary.foreground,
    fontSize: 16,
    fontWeight: '600',
  },
});
