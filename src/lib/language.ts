export const LANGUAGES = ['en', 'ko', 'ja'] as const;
export type Language = (typeof LANGUAGES)[number];
export type LanguagePreference = 'auto' | Language;

export const LANGUAGE_PREFERENCES: readonly LanguagePreference[] = ['auto', ...LANGUAGES];

/** BCP 47 tag passed to SpeechRecognition for each language. */
export const SPEECH_LOCALE: Record<Language, string> = {
  en: 'en-US',
  ko: 'ko-KR',
  ja: 'ja-JP',
};

/** Native names, shown the same in every UI language. */
export const LANGUAGE_NATIVE_NAME: Record<Language, string> = {
  en: 'English',
  ko: '한국어',
  ja: '日本語',
};

export function isLanguagePreference(value: unknown): value is LanguagePreference {
  return typeof value === 'string' && (LANGUAGE_PREFERENCES as readonly string[]).includes(value);
}

/** Picks the first supported language from the browser's preferences. */
export function detectBrowserLanguage(
  languages: readonly string[] = typeof navigator === 'undefined' ? [] : navigator.languages,
): Language {
  for (const tag of languages) {
    const base = tag.toLowerCase().split('-')[0];
    if ((LANGUAGES as readonly string[]).includes(base)) return base as Language;
  }
  return 'en';
}

/**
 * Guesses the language of a script from its writing system.
 * Kana means Japanese, Hangul means Korean; Latin-only text is English.
 * Returns null when there is not enough text to decide.
 */
export function detectScriptLanguage(text: string): Language | null {
  let hangul = 0;
  let kana = 0;
  let han = 0;
  let latin = 0;
  for (const ch of text) {
    if (/\p{Script=Hangul}/u.test(ch)) hangul++;
    else if (/[\p{Script=Hiragana}\p{Script=Katakana}]/u.test(ch)) kana++;
    else if (/\p{Script=Han}/u.test(ch)) han++;
    else if (/\p{Script=Latin}/u.test(ch)) latin++;
  }
  const total = hangul + kana + han + latin;
  if (total < 2) return null;
  // Japanese text almost always contains kana; Han-only text is ambiguous
  // but Japanese is the only supported language that is written with it.
  if (kana > 0 && kana + han >= hangul) return 'ja';
  if (hangul > 0 && hangul >= latin * 0.2) return 'ko';
  if (han > 0 && han >= latin) return 'ja';
  if (latin > 0) return 'en';
  return null;
}

/** Resolves a preference to a concrete language. */
export function resolveLanguage(
  preference: LanguagePreference,
  detect: () => Language | null,
): Language {
  if (preference !== 'auto') return preference;
  return detect() ?? 'en';
}
