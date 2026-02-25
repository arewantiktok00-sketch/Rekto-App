export interface AppSettings {
  features: {
    ads_enabled: boolean;
    ad_creation_enabled: boolean;
    links_enabled: boolean;
    campaigns_enabled: boolean;
    wallet_enabled: boolean;
    notifications_enabled: boolean;
    analytics_enabled: boolean;
    profile_editing_enabled: boolean;
    featured_story_enabled?: boolean;
  };
  objectives: {
    conversions_enabled: boolean;
    views_enabled: boolean;
    lead_generation_enabled: boolean;
  };
  maintenance: {
    enabled: boolean;
    message: string; // Legacy single message
    message_en?: string; // English message
    message_ckb?: string; // Kurdish message
    message_ar?: string; // Arabic message
    until: string | null;
  };
  ui_text: {
    banner_enabled: boolean;
    banner_text: string;
    banner_link: string;
  };
  discount?: {
    discount_enabled: boolean;
    discount_notification_message?: string;
  };
  pricing?: {
    exchange_rate: number;
    ten_dollar_ads_enabled: boolean;
    tax_table?: Record<number, number>;
  };
  update?: {
    min_version: string;
    latest_version: string;
    android_store_url: string;
    ios_store_url: string;
    force_update?: boolean;
  };
}

export const DEFAULT_SETTINGS: AppSettings = {
  features: {
    ads_enabled: true,
    ad_creation_enabled: true,
    links_enabled: true,
    campaigns_enabled: true,
    wallet_enabled: true,
    notifications_enabled: true,
    analytics_enabled: true,
    profile_editing_enabled: true,
    featured_story_enabled: true,
  },
  objectives: {
    conversions_enabled: true,
    views_enabled: true,
    lead_generation_enabled: true,
  },
  maintenance: {
    enabled: false,
    message: '',
    message_en: '',
    message_ckb: '',
    message_ar: '',
    until: null,
  },
  ui_text: {
    banner_enabled: false,
    banner_text: '',
    banner_link: '',
  },
  discount: {
    discount_enabled: false,
    discount_notification_message: '',
  },
  pricing: {
    exchange_rate: 1450,
    ten_dollar_ads_enabled: true,
    tax_table: {
      10: 3.3, 20: 5.4, 30: 8.1, 40: 8.4, 50: 10.5,
      60: 12.6, 70: 14.7, 80: 16.8, 90: 18.9, 100: 21
    },
  },
  update: {
    min_version: '',
    latest_version: '',
    android_store_url: '',
    ios_store_url: '',
    force_update: false,
  },
};
