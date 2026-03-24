import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, Platform } from 'react-native';

const { WidgetBridge } = NativeModules;

const KEY_APP_OPEN_COUNT = 'rekto_app_open_count';
const KEY_REVIEW_LAST_OPEN = 'rekto_review_last_open_count';
const KEY_REVIEW_LAST_DATE = 'rekto_review_last_date';
const MIN_OPENS_FIRST_REVIEW = 2;
const OPENS_BETWEEN_REVIEWS = 5;
const DAYS_BETWEEN_REVIEWS = 2;

/**
 * Call when app is opened / becomes active. Increments open count.
 */
export async function incrementAppOpenCount(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(KEY_APP_OPEN_COUNT);
    const count = Math.max(0, parseInt(raw || '0', 10)) + 1;
    await AsyncStorage.setItem(KEY_APP_OPEN_COUNT, String(count));
    return count;
  } catch {
    return 0;
  }
}

/**
 * Request in-app review with throttle: first time after 2nd open, then every 5 opens or 2 days.
 * Call when user taps "Rate our app". No-op on Android.
 */
export async function tryRequestReview(): Promise<void> {
  if (Platform.OS !== 'ios' || !WidgetBridge?.requestReview) return;
  try {
    const [countRaw, lastOpenRaw, lastDateRaw] = await Promise.all([
      AsyncStorage.getItem(KEY_APP_OPEN_COUNT),
      AsyncStorage.getItem(KEY_REVIEW_LAST_OPEN),
      AsyncStorage.getItem(KEY_REVIEW_LAST_DATE),
    ]);
    const count = parseInt(countRaw || '0', 10);
    const lastOpen = lastOpenRaw ? parseInt(lastOpenRaw, 10) : 0;
    const lastDate = lastDateRaw ? new Date(lastDateRaw).getTime() : 0;
    const now = Date.now();
    const daysSince = (now - lastDate) / (24 * 60 * 60 * 1000);

    const isFirstEligible = count >= MIN_OPENS_FIRST_REVIEW && lastOpen === 0;
    const isRepeatByOpens = count - lastOpen >= OPENS_BETWEEN_REVIEWS;
    const isRepeatByDays = daysSince >= DAYS_BETWEEN_REVIEWS;

    if (isFirstEligible || (lastOpen > 0 && (isRepeatByOpens || isRepeatByDays))) {
      WidgetBridge.requestReview();
      await AsyncStorage.setItem(KEY_REVIEW_LAST_OPEN, String(count));
      await AsyncStorage.setItem(KEY_REVIEW_LAST_DATE, new Date().toISOString());
    }
  } catch {}
}

export interface WidgetCampaignInput {
  language?: "ckb" | "ar" | string;
  id: string;
  name: string;
  result: string;
  thumbnailURL: string;
  localImagePath?: string;
  isActive: boolean;
  isTopResult?: boolean;
}

/**
 * Requests the native in-app review dialog (iOS StoreKit). Use when user taps "Rate our app".
 * No-op on Android or if native module missing; on Android open Play Store URL instead.
 */
export function requestReview(): void {
  if (Platform.OS !== 'ios' || !WidgetBridge?.requestReview) return;
  try {
    WidgetBridge.requestReview();
  } catch {}
}

/**
 * Pushes active campaigns to the iOS home screen widget (App Group).
 * Call this after loading or updating campaigns (e.g. in useCampaigns).
 * No-op on Android or if the native module is missing.
 */
export function updateWidgetCampaigns(campaigns: WidgetCampaignInput[]): void {
  if (Platform.OS !== 'ios' || !WidgetBridge?.updateCampaigns) return;
  try {
    WidgetBridge.updateCampaigns(campaigns);
  } catch {
    // Widget / App Group may not be configured
  }
}

/**
 * Pushes wallet balance to the iOS Balance Widget (App Group).
 * Call when user is logged in and balance is fetched (e.g. WalletBalance screen).
 */
export function updateWidgetBalance(availableBalance: number, pendingBalance: number): void {
  if (Platform.OS !== 'ios' || !WidgetBridge?.updateBalance) return;
  try {
    WidgetBridge.updateBalance(availableBalance, pendingBalance);
  } catch {
    // Widget / App Group may not be configured
  }
}

type WidgetCampaignSource = {
  id: string;
  title: string | null;
  name: string | null;
  status: string | null;
  objective: string | null;
  spend: number | null;
  clicks: number | null;
  leads: number | null;
  views: number | null;
  impressions: number | null;
  thumbnail_url: string | null;
  thumbnailURL: string | null;
};

const WIDGET_CKB = {
  defaultCampaignName: 'کەمپین',
  clicks: 'کلیک',
  views: 'بینین',
  conversions: 'ئەنجام',
  spend: 'خەرجی',
  emptyResult: '—',
};

function toWidgetItem(
  c: WidgetCampaignSource & Record<string, any>,
  isActive: boolean,
  isTopResult: boolean
): WidgetCampaignInput {
  const name = c.title || c.name || WIDGET_CKB.defaultCampaignName;
  const parts: string[] = [];
  const objective = (c.objective || '').toLowerCase();
  const isViewsObjective = objective === 'views' || objective === 'video_views' || objective.includes('view');
  const viewsCount = c.views ?? c.impressions ?? null;
  if (c.clicks != null) parts.push(`${formatNum(c.clicks)} ${WIDGET_CKB.clicks}`);
  if (isViewsObjective && viewsCount != null) {
    parts.push(`${formatNum(viewsCount)} ${WIDGET_CKB.views}`);
  } else if (c.leads != null) {
    parts.push(`${formatNum(c.leads)} ${WIDGET_CKB.conversions}`);
  }
  if (c.spend != null) parts.push(`$${Number(c.spend).toFixed(2)} ${WIDGET_CKB.spend}`);
  const result = parts.length ? parts.join(' · ') : WIDGET_CKB.emptyResult;
  const thumbnailURL = c.thumbnailURL || c.thumbnail_url || '';
  return { id: c.id, name, result, thumbnailURL, localImagePath: '', isActive, isTopResult };
}

/**
 * Build widget payload: top 3 active campaigns, or if none active then top 3 by result (clicks/spend) from user campaigns, or top 3 from app top-results list.
 */
export function buildWidgetCampaigns(
  campaigns: Array<{
    id: string;
    title?: string | null;
    name?: string | null;
    status?: string | null;
    spend?: number | null;
    clicks?: number | null;
    leads?: number | null;
    impressions?: number | null;
    thumbnail_url?: string | null;
    thumbnailURL?: string | null;
  }>,
  topResultsFallback?: Array<{
    id: string;
    title?: string | null;
    name?: string | null;
    status?: string | null;
    spend?: number | null;
    clicks?: number | null;
    leads?: number | null;
    thumbnail_url?: string | null;
    thumbnailURL?: string | null;
  }>
): WidgetCampaignInput[] {
  const activeStatuses = ['active', 'running', 'approved', 'live'];
  const active = campaigns
    .filter((c) => activeStatuses.includes((c.status || '').toLowerCase()))
    .slice(0, 3)
    .map((c) => toWidgetItem(c, true, false));
  if (active.length > 0) return active;
  const byResult = [...campaigns]
    .sort((a, b) => {
      const score = (c: (typeof campaigns)[0]) => (c.clicks ?? 0) + (c.spend ?? 0) * 2;
      return score(b) - score(a);
    })
    .slice(0, 3)
    .map((c) => toWidgetItem(c, false, true));
  if (byResult.length > 0) return byResult;
  if (topResultsFallback && topResultsFallback.length > 0) {
    return topResultsFallback.slice(0, 3).map((c) => toWidgetItem(c, false, true));
  }
  return [];
}

/**
 * Download thumbnails into App Group, set localImagePath, then update widget.
 * When no active campaigns (or no campaigns), uses topResultsFallback so widget shows top 3 results instead of empty.
 */
export async function prepareAndUpdateWidgetCampaigns(
  campaigns: Array<{
    id: string;
    title?: string | null;
    name?: string | null;
    status?: string | null;
    spend?: number | null;
    clicks?: number | null;
    leads?: number | null;
    thumbnail_url?: string | null;
    thumbnailURL?: string | null;
  }>,
  topResultsFallback?: Array<{
    id: string;
    title?: string | null;
    name?: string | null;
    status?: string | null;
    spend?: number | null;
    clicks?: number | null;
    leads?: number | null;
    thumbnail_url?: string | null;
    thumbnailURL?: string | null;
  }>
): Promise<void> {
  const list = buildWidgetCampaigns(campaigns, topResultsFallback);
  if (Platform.OS !== 'ios') return;
  if (!WidgetBridge?.downloadAndSaveThumbnail) {
    updateWidgetCampaigns(list);
    return;
  }
  const withPaths = await Promise.all(
    list.map(
      (c) =>
        new Promise<WidgetCampaignInput>((resolve) => {
          const url = (c.thumbnailURL || '').trim();
          if (!url || url.includes('tiktokcdn.com')) {
            resolve({ ...c, localImagePath: '' });
            return;
          }
          try {
            WidgetBridge.downloadAndSaveThumbnail(
              c.id,
              url,
              (args: unknown) => {
                const path = Array.isArray(args) && typeof args[0] === 'string' ? args[0] : '';
                resolve({ ...c, localImagePath: path });
              }
            );
          } catch {
            resolve({ ...c, localImagePath: '' });
          }
        })
    )
  );
  updateWidgetCampaigns(withPaths);
}

function formatNum(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}
