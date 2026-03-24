/**
 * Dynamic pricing from app_settings (key: pricing_config or global).
 * Use this everywhere instead of hardcoded exchange rates.
 * IQD conversions use Math.floor (never round up).
 */

import { useEffect, useState } from 'react';
import { FALLBACK_EXCHANGE_RATE } from '@/lib/exchangeRate';
import { supabaseRead } from '@/integrations/supabase/client';

const DEFAULT_RATE = FALLBACK_EXCHANGE_RATE;
const DEFAULT_TAX_TABLE: Record<number, number> = {
  10: 3.3, 20: 5.4, 30: 8.1, 40: 8.4, 50: 10.5,
  60: 12.6, 70: 14.7, 80: 16.8, 90: 18.9, 100: 21,
};

export interface PricingConfig {
  exchange_rate: number;
  tax_table: Record<number, number>;
  ten_dollar_ads_enabled: boolean;
  convertToIQD: (usd: number) => number;
  convertToUSD: (iqd: number) => number;
}

export function usePricingConfig(): PricingConfig {
  const [exchange_rate, setExchangeRate] = useState(DEFAULT_RATE);
  const [tax_table, setTaxTable] = useState<Record<number, number>>(DEFAULT_TAX_TABLE);
  const [ten_dollar_ads_enabled, setTenDollarAdsEnabled] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchPricing = async () => {
      try {
        // Try pricing_config first (owner-managed), then global (legacy)
        const { data: pricingConfigData } = await supabaseRead
          .from('app_settings')
          .select('value')
          .eq('key', 'pricing_config')
          .maybeSingle();

        const pricingFromConfig = (pricingConfigData?.value as any)?.pricing;
        if (pricingFromConfig && !cancelled) {
          setExchangeRate(Number(pricingFromConfig.exchange_rate) || DEFAULT_RATE);
          setTaxTable(
            pricingFromConfig.tax_table && typeof pricingFromConfig.tax_table === 'object'
              ? pricingFromConfig.tax_table
              : DEFAULT_TAX_TABLE
          );
          setTenDollarAdsEnabled(pricingFromConfig.ten_dollar_ads_enabled ?? true);
          return;
        }

        const { data: globalData } = await supabaseRead
          .from('app_settings')
          .select('value')
          .eq('key', 'global')
          .maybeSingle();

        const pricingFromGlobal = (globalData?.value as any)?.pricing;
        if (pricingFromGlobal && !cancelled) {
          setExchangeRate(Number(pricingFromGlobal.exchange_rate) || DEFAULT_RATE);
          setTaxTable(
            pricingFromGlobal.tax_table && typeof pricingFromGlobal.tax_table === 'object'
              ? pricingFromGlobal.tax_table
              : DEFAULT_TAX_TABLE
          );
          setTenDollarAdsEnabled(pricingFromGlobal.ten_dollar_ads_enabled ?? true);
        }
      } catch (e) {
        console.warn('[usePricingConfig] fetch failed:', e);
      }
    };

    fetchPricing();
    return () => { cancelled = true; };
  }, []);

  const convertToIQD = (usd: number) => Math.floor(usd * exchange_rate);
  const convertToUSD = (iqd: number) => Math.floor((iqd / exchange_rate) * 100) / 100;

  return {
    exchange_rate,
    tax_table,
    ten_dollar_ads_enabled,
    convertToIQD,
    convertToUSD,
  };
}
