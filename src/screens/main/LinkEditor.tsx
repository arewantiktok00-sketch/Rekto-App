import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Check,
  GripVertical,
  Phone,
  MessageCircle,
  Palette,
  Save,
  Upload,
  X,
  Plus,
} from 'lucide-react-native';
// Removed DraggableFlatList to prevent screen freeze - using ScrollView instead
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase, safeQuery } from '@/integrations/supabase/client';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, borderRadius } from '@/theme/spacing';
import { getTypographyStyles } from '@/theme/typography';
import { toast } from '@/utils/toast';
import { PLATFORMS, CTA_OPTIONS, THEMES, ICON_MAP } from '@/constants/platforms';
import { getCached, setCached } from '@/services/globalCache';
import { updateLinkPage, generateLinkMagicEmail } from '@/services/linkMagicApi';
import { ThemeBottomSheet, ThemeBottomSheetRef } from '@/components/links/ThemeBottomSheet';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { Text } from '@/components/common/Text';
import { isRTL, rtlText, rtlInput, rtlRow } from '@/utils/rtl';

const postLinksApi = async (payload: Record<string, any>) => {
  const url = `${supabase.supabaseUrl}/functions/v1/links-api`;
  console.log('[Links API] Request:', payload);
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  console.log('[Links API] Response:', response.status, data);
  if (!response.ok || data?.error) {
    throw new Error(data?.error || data?.message || 'Links API request failed');
  }
  return data;
};

interface PlatformData {
  id: string;
  value: string;
  enabled: boolean;
}

export function LinkEditor() {
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const isRtl = isRTL(language);
  const { colors } = useTheme();
  const { linkId, link, linkmagic_email: paramEmail, isNew } = route.params as {
    linkId: string;
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
  const [callToAction, setCallToAction] = useState<string | null>(
    link?.call_to_action === 'CONTACT_US'
      ? 'contact_us'
      : link?.call_to_action === 'SEND_MESSAGE'
      ? 'send_message'
      : null
  );
  const [selectedTheme, setSelectedTheme] = useState('pearl');
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

  // NEVER accept local file paths for DB; only upload when URI is local (file://, content://, data:)
  // Uses FileSystem base64 for iOS/Android compatibility (avoids "read property 'Base64' of undefined")
  const uploadAvatarToStorage = async (imageUri: string, mimeType?: string | null): Promise<string> => {
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

    let localFileUri = imageUri;

    if (imageUri.startsWith('content://')) {
      const tempPath = `${FileSystem.cacheDirectory}avatar-${timestamp}.${extension}`;
      if (__DEV__) console.log('[Upload] Copying content:// URI to temp file:', tempPath);
      await FileSystem.copyAsync({ from: imageUri, to: tempPath });
      localFileUri = tempPath;
    }

    if (__DEV__) console.log('[Upload] Reading file as base64:', localFileUri);
    const base64Data = await FileSystem.readAsStringAsync(localFileUri, {
      encoding: 'base64',
    } as { encoding: 'base64' });
    if (__DEV__) console.log('[Upload] Base64 length:', base64Data?.length ?? 0);

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

    if (imageUri.startsWith('content://') && localFileUri !== imageUri) {
      FileSystem.deleteAsync(localFileUri, { idempotent: true }).catch(() => {});
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
    return value;
  };

  const mapClientLinksToPlatforms = (clientLinks: any[]) => {
    const reverseIconMap: Record<string, string> = {
      whatsapp: 'whatsapp',
      viber: 'viber',
      instagram: 'instagram',
      facebook: 'facebook',
      telegram: 'telegram',
      website: 'website',
      korek: 'korek_phone',
      asiacell: 'asiacell_phone',
      zain: 'zain_phone',
      appstore: 'app_store',
      playstore: 'google_play',
    };
    const iconToPlatformId = Object.keys(ICON_MAP).reduce<Record<string, string>>((acc, key) => {
      acc[ICON_MAP[key]] = key;
      return acc;
    }, reverseIconMap);
    const orderedLinks = [...clientLinks].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
    const mappedPlatformData: Record<string, string> = {};
    const mappedPlatforms: string[] = [];

    orderedLinks.forEach((item) => {
      const platformId = iconToPlatformId[item.icon];
      if (!platformId) return;
      const value = cleanPlatformValue(item.value || '');
      if (!value) return;
      mappedPlatformData[platformId] = value;
      mappedPlatforms.push(platformId);
    });

    const uniquePlatforms = Array.from(new Set(mappedPlatforms));
    return { mappedPlatformData, uniquePlatforms };
  };

  const PLATFORM_COLUMNS = [
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

      if (!isNew) {
        const clientLinks = clientLinksResult.data || [];
        if (clientLinks.length > 0) {
          const { mappedPlatformData, uniquePlatforms } = mapClientLinksToPlatforms(clientLinks);
          nextPlatformData = mappedPlatformData;
          nextSelectedPlatforms = uniquePlatforms;
          nextPlatformOrder = uniquePlatforms;
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
      }
      
    } catch (error: any) {
      if (error?.name === 'TimeoutError') {
        console.warn('Link data request timed out:', error.message);
      } else {
        console.error('Error loading link data:', error);
      }
      toast.error(
        isRtl ? 'هەڵەی تۆڕ' : 'Network Error',
        isRtl
          ? 'تکایە ئینتەرنێتەکەت بپشکنە'
          : error.message || 'Please check your internet connection'
      );
    }
  };

  const handleSave = async () => {
    if (!user) return;
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

      // STEP 1: Collect platform entries (only those with values)
      const platformEntries: Array<{ platformId: string; value: string; title?: string }> = [];
      const baseOrder = platformOrder.length > 0 ? platformOrder : selectedPlatforms;
      const uniqueOrder = Array.from(new Set(baseOrder));

      for (const platformId of uniqueOrder) {
        const value = platformData[platformId];
        if (value && value.trim()) {
          platformEntries.push({
            platformId,
            value: value.trim(),
            title: platformId,
          });
        }
      }

      // STEP 2: Build platformValues object for link_social_data columns
      // Map React Native platform IDs to database column names
      const platformIdToDbColumn: Record<string, string> = {
        whatsapp: 'whatsapp',
        viber: 'viber',
        instagram: 'instagram',
        facebook: 'facebook',
        telegram: 'telegram',
        website: 'website',
        korek_phone: 'korek_phone',
        asiacell_phone: 'asiacell_phone',
        zain_phone: 'zain_phone',
        app_store: 'app_store',
        google_play: 'google_play',
      };
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

      // STEP 5: Delete all existing client_links for this link
      const { error: deleteError } = await supabase
        .from('client_links')
        .delete()
        .eq('user_id', user.id)
        .eq('link_id', activeLinkId);

      if (deleteError) {
        console.error('Error deleting client_links:', deleteError);
      }

      // STEP 6: Insert new client_links rows
      if (platformEntries.length > 0) {
        const clientLinksToInsert = platformEntries.map((entry, index) => {
          const icon = ICON_MAP[entry.platformId] || entry.platformId;
          let url: string;
          const cleanDigits = entry.value.replace(/[^\d+]/g, '');
          if (icon === 'whatsapp') {
            url = `https://wa.me/${cleanDigits}`;
          } else if (icon === 'viber') {
            url = `viber://chat?number=${cleanDigits}`;
          } else if (icon === 'korek' || icon === 'asiacell' || icon === 'zain') {
            url = `tel:${cleanDigits}`;
          } else if (icon === 'instagram') {
            const username = entry.value.replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//, '');
            url = `https://instagram.com/${username}`;
          } else if (icon === 'facebook') {
            const username = entry.value.replace(/^https?:\/\/(www\.)?facebook\.com\//, '');
            url = `https://facebook.com/${username}`;
          } else if (icon === 'telegram') {
            const username = entry.value.replace(/^@/, '').replace(/^https?:\/\/(www\.)?t\.me\//, '');
            url = `https://t.me/${username}`;
          } else if (icon === 'website' || icon === 'appstore' || icon === 'playstore') {
            url = entry.value.startsWith('http://') || entry.value.startsWith('https://')
              ? entry.value
              : `https://${entry.value}`;
          } else {
            url = entry.value;
          }

          return {
            user_id: user.id,
            link_id: activeLinkId,
            icon: icon,
            value: entry.value,
            url: url,
            title: entry.title || entry.platformId || '',
            display_order: index + 1,
            sync_status: 'pending' as const,
          };
        });

        const { error: insertLinksError } = await supabase
          .from('client_links')
          .insert(clientLinksToInsert);

        if (insertLinksError) {
          throw insertLinksError;
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
          : 'Your info has been updated'
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
            let formattedUrl = entry.value;
            const cleanDigits = entry.value.replace(/[^\d+]/g, '');
            if (icon === 'whatsapp') {
              formattedUrl = `https://wa.me/${cleanDigits}`;
            } else if (icon === 'viber') {
              formattedUrl = `viber://chat?number=${cleanDigits}`;
            } else if (icon === 'korek' || icon === 'asiacell' || icon === 'zain') {
              formattedUrl = `tel:${cleanDigits}`;
            } else if (icon === 'instagram') {
              const username = entry.value.replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//, '');
              formattedUrl = `https://instagram.com/${username}`;
            } else if (icon === 'facebook') {
              const username = entry.value.replace(/^https?:\/\/(www\.)?facebook\.com\//, '');
              formattedUrl = `https://facebook.com/${username}`;
            } else if (icon === 'telegram') {
              const username = entry.value.replace(/^@/, '').replace(/^https?:\/\/(www\.)?t\.me\//, '');
              formattedUrl = `https://t.me/${username}`;
            } else if (icon === 'website' || icon === 'appstore' || icon === 'playstore') {
              formattedUrl = entry.value.startsWith('http://') || entry.value.startsWith('https://')
                ? entry.value
                : `https://${entry.value}`;
            }
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
      console.error('Error saving link:', error);
      toast.error(
        isRtl ? 'هەڵە!' : 'Error',
        isRtl ? 'پاشەکەوتکردن سەرکەوتوو نەبوو' : 'Failed to save'
      );
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
        const normalizedValue =
          platformId === 'whatsapp' ||
          platformId === 'viber' ||
          platformId === 'korek_phone' ||
          platformId === 'asiacell_phone' ||
          platformId === 'zain_phone'
            ? normalizePhone(platformValue)
            : platformValue;
        void postLinksApi({
          action: 'delete_by_icon_value',
          user_email: linkmagicEmail,
          icon: iconName,
          value: normalizedValue,
        }).catch((error) => {
          toast.error('Error', error.message || 'Failed to delete link');
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
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        toast.warning(
          isRtl ? 'دەسەڵات' : 'Permission',
          isRtl ? 'دەسەڵاتی وێنە پێویستە' : 'Media library permission is required'
        );
        return;
      }

      // Use MediaType array (not deprecated MediaTypeOptions).
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const imageUri = asset.uri;
        if (imageUri.startsWith('https://') && imageUri.includes('supabase')) {
          setAvatarRetryCount(0);
          setAvatarLoadError(false);
          setAvatarUrl(imageUri);
        } else if (!imageUri.startsWith('http')) {
          if (!user?.id) {
            toast.error(isRtl ? 'هەڵە' : 'Error', isRtl ? 'پێویستە چوونەژوورەوە بکەیت' : 'You must be signed in');
            return;
          }
          let uploadedUrl: string;
          try {
            uploadedUrl = await uploadAvatarToStorage(imageUri, asset.mimeType ?? null);
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
              toast.error(isRtl ? 'هەڵە' : 'Error', isRtl ? 'نەتوانرا وێنە بار بکرێت' : 'Failed to upload image');
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
      }
    } catch (error: any) {
      console.error('Image picker error:', error);
      toast.error(
        isRtl ? 'هەڵە' : 'Error',
        error.message || (isRtl ? 'نەتوانرا وێنە هەڵبگیرێت' : 'Failed to pick image')
      );
    }
  };

  // Remove duplicates from platformOrder and create ordered platforms
  const uniquePlatformOrder = Array.from(new Set(platformOrder));
  const orderedPlatforms = uniquePlatformOrder
    .map((id) => PLATFORMS.find((p) => p.id === id))
    .filter(Boolean) as typeof PLATFORMS;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
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
              {syncStatus === 'pending' ? 'Syncing' : syncStatus === 'failed' ? 'Failed' : 'Live'}
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
        keyboardShouldPersistTaps="handled"
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
                  <ExpoImage
                    source={{ uri: avatarUrl }}
                    style={{ width: 80, height: 80, borderRadius: 40 }}
                    contentFit="cover"
                    onError={() => {
                      if (__DEV__) console.log('[Avatar] ExpoImage failed, clearing URL');
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
          <View style={[styles.sectionTitleRow, isRtl && styles.sectionTitleRowRTL]}>
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
            <View style={[styles.sectionTitleRow, isRtl && styles.sectionTitleRowRTL]}>
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
            {/* Use regular ScrollView instead of DraggableFlatList to prevent freeze */}
            <ScrollView 
              style={styles.platformInputsScroll}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled={true}
            >
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
                    <View style={styles.platformInputActions}>
                      {platformData[platform.id] && (
                        <TouchableOpacity
                          style={styles.removeButton}
                          onPress={() => {
                            togglePlatform(platform.id);
                          }}
                        >
                          <X size={16} color="#EF4444" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
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
            onPress={() => themeBottomSheetRef.current?.present()}
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
      <ThemeBottomSheet
        ref={themeBottomSheetRef}
        selectedTheme={selectedTheme}
        onSelectTheme={setSelectedTheme}
      />
    </View>
    </KeyboardAvoidingView>
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
    alignItems: isRtl ? 'flex-start' : 'flex-end',
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
  sectionTitleRowRTL: {
    flexDirection: 'row',
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
  platformInputsScroll: {
    maxHeight: 400,
  },
  platformInputActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    gap: spacing.sm,
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
