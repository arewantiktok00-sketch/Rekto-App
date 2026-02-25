/**
 * Centralized Translation System
 * All app translations organized by category
 */

import ckbTranslations from '@/locales/ckb.json';
import enTranslations from '@/locales/en.json';
import arTranslations from '@/locales/ar.json';

export type Language = 'ckb' | 'en' | 'ar';

export interface Translations {
  tabs: {
    dashboard: string;
    campaigns: string;
    notifications: string;
    profile: string;
    create: string;
    links: string;
    learn: string;
  };
  headers: {
    dashboard: string;
    campaigns: string;
    notifications: string;
    profile: string;
    createAd: string;
    campaignDetail: string;
    ownerDashboard: string;
  };
  buttons: {
    create: string;
    save: string;
    cancel: string;
    delete: string;
    back: string;
    login: string;
    signUp: string;
    logout: string;
    boostAgain: string;
    extendAd: string;
  };
  labels: {
    [key: string]: string;
  };
  // All other translations
  [key: string]: any;
}

/**
 * Get translations for a specific language
 */
export const getTranslations = (language: Language): Translations => {
  const fallback = ckbTranslations as any;
  const translations = {
    ckb: ckbTranslations,
    en: enTranslations,
    ar: arTranslations,
  }[language];

  // Organize translations by category
  return {
    tabs: {
      dashboard: translations.home || fallback.home || 'home',
      campaigns: translations.campaigns || fallback.campaigns || 'campaigns',
      notifications: translations.communication || fallback.communication || 'communication',
      profile: translations.profile || fallback.profile || 'profile',
      create: translations.create || fallback.create || 'create',
      links: translations.links || fallback.links || 'links',
      learn: translations.learn || fallback.learn || 'learn',
    },
    headers: {
      dashboard: translations.home || fallback.home || 'home',
      campaigns: translations.campaigns || fallback.campaigns || 'campaigns',
      notifications: translations.communication || fallback.communication || 'communication',
      profile: translations.profile || fallback.profile || 'profile',
      createAd: translations.createAd || fallback.createAd || 'createAd',
      campaignDetail: translations.campaignDetail || fallback.campaignDetail || 'campaignDetail',
      ownerDashboard: translations.ownerDashboard || fallback.ownerDashboard || 'ownerDashboard',
    },
    buttons: {
      create: translations.create || fallback.create || 'create',
      save: translations.save || fallback.save || 'save',
      cancel: translations.cancel || fallback.cancel || 'cancel',
      delete: translations.delete || fallback.delete || 'delete',
      back: translations.back || fallback.back || 'back',
      login: translations.login || fallback.login || 'login',
      signUp: translations.signUp || fallback.signUp || 'signUp',
      logout: translations.logout || fallback.logout || 'logout',
      boostAgain: translations.boostAgain || fallback.boostAgain || 'boostAgain',
      extendAd: translations.extendAd || fallback.extendAd || 'extendAd',
    },
    labels: translations,
    ...translations, // Include all other translations
  } as Translations;
};

/**
 * All translations organized by language
 */
export const translations = {
  ckb: getTranslations('ckb'),
  en: getTranslations('en'),
  ar: getTranslations('ar'),
};
