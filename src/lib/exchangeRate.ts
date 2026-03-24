/**
 * Exchange rate is dynamic (app_settings key: pricing_config or global).
 * Use usePricingConfig() in components. Use getExchangeRateFromSettings() when you have the settings row.
 * Use fetchExchangeRate() for one-off async (e.g. widget refresh). Always Math.floor for IQD.
 */

import { supabaseRead } from '@/integrations/supabase/client';

/** Only fallback when app_settings has no rate (e.g. first deploy). Do not use elsewhere. */
export const FALLBACK_EXCHANGE_RATE = 1450;
const FALLBACK_RATE = FALLBACK_EXCHANGE_RATE;

/** Extract exchange rate from app_settings row (value.pricing.exchange_rate). */
export function getExchangeRateFromSettings(settingsRow: { value?: { pricing?: { exchange_rate?: number } } } | null): number {
  const rate = settingsRow?.value?.pricing?.exchange_rate;
  return typeof rate === 'number' && rate > 0 ? rate : FALLBACK_RATE;
}

/** Fetch current exchange rate from app_settings (pricing_config then global). Use for widget/background updates. */
export async function fetchExchangeRate(): Promise<number> {
  try {
    const { data: pc } = await supabaseRead.from('app_settings').select('value').eq('key', 'pricing_config').maybeSingle();
    const fromPc = (pc?.value as any)?.pricing?.exchange_rate;
    if (typeof fromPc === 'number' && fromPc > 0) return fromPc;
    const { data: global } = await supabaseRead.from('app_settings').select('value').eq('key', 'global').maybeSingle();
    const fromGlobal = (global?.value as any)?.pricing?.exchange_rate;
    if (typeof fromGlobal === 'number' && fromGlobal > 0) return fromGlobal;
  } catch (_) {}
  return FALLBACK_RATE;
}
