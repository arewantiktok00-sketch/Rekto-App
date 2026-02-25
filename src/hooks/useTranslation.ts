/**
 * useTranslation Hook
 * Provides translated text based on current language
 */

import { useLanguage } from '@/contexts/LanguageContext';
import { getTranslations, Language } from '@/i18n/translations';

export const useTranslation = () => {
  const { language, t: legacyT } = useLanguage();

  // Get translations for current language
  const translations = getTranslations(language as Language);

  /**
   * Get translated text by key
   * Supports nested keys like 'tabs.dashboard'
   */
  const t = (key: string, fallback?: string): string => {
    // Try new translation system first
    const keys = key.split('.');
    let value: any = translations;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Fallback to legacy system
        return legacyT(key) || fallback || key;
      }
    }

    if (typeof value === 'string') {
      return value;
    }

    // Fallback to legacy system
    return legacyT(key) || fallback || key;
  };

  return {
    t,
    language,
    translations,
  };
};
