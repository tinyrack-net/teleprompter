import { createContext, type ReactNode, useContext, useEffect, useMemo } from 'react';
import { detectBrowserLanguage, type Language, resolveLanguage } from '../lib/language';
import { useSettings } from '../state/settings-store';
import { MESSAGES, type Messages } from './messages';

interface I18n {
  language: Language;
  t: Messages;
}

const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [settings] = useSettings();
  const language = resolveLanguage(settings.uiLanguage, () => detectBrowserLanguage());

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = MESSAGES[language].appName;
  }, [language]);

  const value = useMemo(() => ({ language, t: MESSAGES[language] }), [language]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}
