import { useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import { I18nContext, LANGUAGE_STORAGE_KEY, readLanguage, translate, type Language, type I18nValue } from './I18nContext';

export function I18nProvider({ children, initialLanguage }: { children: ReactNode; initialLanguage?: Language }) {
  const [language, setLanguage] = useState<Language>(() => initialLanguage ?? readLanguage());
  useLayoutEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.title = language === 'ar' ? 'طلبك — منصة التوصيل' : 'Talabak — Delivery Platform';
    try { localStorage.setItem(LANGUAGE_STORAGE_KEY, language); } catch { /* Keep the in-memory preference. */ }
  }, [language]);
  const value = useMemo<I18nValue>(() => ({
    language, setLanguage, locale: language === 'ar' ? 'ar-SA-u-ca-gregory' : 'en-SA',
    t: (message, values) => translate(language, message, values),
  }), [language]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
