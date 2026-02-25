import { useAuth } from '@/contexts/AuthContext';
import { supabase, supabaseRead } from '@/integrations/supabase/client';
import { getTranslation, type LocaleKey } from '@/i18n/translations';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { I18nManager } from 'react-native';

export type Language = LocaleKey; // 'ckb' | 'ar' — NO ENGLISH

const STORAGE_KEY = 'rekto-language';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: string, options?: Record<string, unknown>) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [language, setLanguageState] = useState<Language>('ckb');

  const setLanguageInternal = useCallback(async (lang: Language, persistRemote: boolean) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, lang);
      setLanguageState(lang);
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

  useEffect(() => {
    I18nManager.forceRTL(true);
    I18nManager.allowRTL(true);
  }, []);

  useEffect(() => {
    const initLanguage = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved === 'ar') {
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
    };
    initLanguage();
  }, [user?.id, setLanguageInternal]);

  const isRTL = true; // ALWAYS true — both ckb and ar are RTL

  const setLanguage = async (lang: Language) => {
    await setLanguageInternal(lang, true);
  };

  const t = (key: string, options?: Record<string, unknown>): string => {
    let out = getTranslation(key, language);
    if (options && typeof out === 'string') {
      Object.keys(options).forEach((k) => {
        out = out.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(options[k]));
      });
    }
    return out;
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
