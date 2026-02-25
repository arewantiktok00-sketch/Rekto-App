/**
 * Types for pricing, discount codes, and admin reviewers
 */

export interface PricingSettings {
  exchange_rate: number;
  tax_percentage: number;
  ten_dollar_ads_enabled?: boolean;
  tax_table?: Record<number, number>; // Custom tax table from remote config
}

export interface DiscountCode {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  expires_at: string | null;
  is_active: boolean;
  usage_count: number;
  created_at: string;
}

export interface AdminReviewer {
  id: string;
  email: string;
  added_by: string;
  created_at: string;
}

export interface AppliedDiscount {
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
}

export interface PricingBreakdown {
  baseTotal: number;
  discountAmount: number;
  taxAmount: number;
  totalUSD: number;
  totalIQD: number;
}
