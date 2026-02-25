import { useAuth } from '@/contexts/AuthContext';
import { supabase, supabaseRead } from '@/integrations/supabase/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from 'i18next';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { initReactI18next } from 'react-i18next';
import { I18nManager } from 'react-native';

type Language = 'ckb' | 'ar';

import arTranslations from '@/locales/ar.json';
import ckbTranslations from '@/locales/ckb.json';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: string, options?: Record<string, unknown>) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Initialize i18n
i18n
  .use(initReactI18next)
  .init({
    resources: {
      ckb: { translation: ckbTranslations },
      ar: { translation: arTranslations },
    },
    lng: 'ckb',
    fallbackLng: 'ckb',
    interpolation: {
      escapeValue: false,
    },
  });

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [language, setLanguageState] = useState<Language>('ckb');
  const [isInitialized, setIsInitialized] = useState(false);

  const setLanguageInternal = useCallback(async (lang: Language, persistRemote: boolean) => {
    try {
      await AsyncStorage.setItem('rekto-language', lang);
      setLanguageState(lang);
      await i18n.changeLanguage(lang);
      I18nManager.forceRTL(true);
      I18nManager.allowRTL(true);

      if (persistRemote && user?.id) {
        const { error } = await supabase
          .from('profiles')
          .update({ preferred_language: lang })
          .eq('user_id', user.id);
        if (error && __DEV__) {
          console.warn('[LanguageContext] Failed to save language to profile:', error.message);
        }
      }
    } catch (error) {
      console.error('Error saving language to AsyncStorage:', error);
    }
  }, [user?.id]);

  // Initialize language from AsyncStorage and profile
  useEffect(() => {
    I18nManager.forceRTL(true);
    I18nManager.allowRTL(true);
  }, []);

  useEffect(() => {
    const initLanguage = async () => {
      try {
        const saved = await AsyncStorage.getItem('rekto-language');
        if (saved === 'en') {
          await AsyncStorage.setItem('rekto-language', 'ckb');
          await setLanguageInternal('ckb', false);
        } else if (saved === 'ar') {
          await setLanguageInternal('ar', false);
        } else if (user?.id) {
          const { data, error } = await supabaseRead
            .from('profiles')
            .select('preferred_language')
            .eq('user_id', user.id)
            .maybeSingle();
          const pref = data?.preferred_language;
          if (!error && pref === 'ar') {
            await setLanguageInternal('ar', false);
          } else {
            await setLanguageInternal('ckb', false);
          }
        } else {
          await setLanguageInternal('ckb', false);
        }
      } catch (error) {
        console.error('Error reading language from AsyncStorage:', error);
      }
      setIsInitialized(true);
    };
    initLanguage();
  }, [user?.id, setLanguageInternal]);

  const isRTL = true;

  const setLanguage = async (lang: Language) => {
    await setLanguageInternal(lang, true);
  };

  const t = (key: string, options?: Record<string, unknown>): string => {
    return i18n.t(key, { lng: language, ...options });
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
