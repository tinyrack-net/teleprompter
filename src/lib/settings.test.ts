import { beforeEach, describe, expect, it, vi } from 'vitest';
import { detectBrowserLanguage, detectScriptLanguage, resolveLanguage } from './language';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  SETTINGS_STORAGE_KEY,
  sanitizeSettings,
  saveSettings,
} from './settings';

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (k) => data.get(k) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => {
      data.delete(k);
    },
    setItem: (k, v) => {
      data.set(k, String(v));
    },
  };
}

describe('settings', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', memoryStorage());
  });

  it('defaults both languages to auto-detect', () => {
    expect(DEFAULT_SETTINGS.uiLanguage).toBe('auto');
    expect(DEFAULT_SETTINGS.speechLanguage).toBe('auto');
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('round-trips through localStorage', () => {
    const next = { ...DEFAULT_SETTINGS, uiLanguage: 'ja' as const, marginX: 20, marginY: 10 };
    saveSettings(next);
    expect(JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) ?? '')).toEqual(next);
    expect(loadSettings()).toEqual(next);
  });

  it('repairs invalid or out-of-range values', () => {
    expect(
      sanitizeSettings({
        uiLanguage: 'fr',
        speechLanguage: 'ko',
        fontSize: 9999,
        marginX: -5,
        marginY: '10',
        mirror: 'yes',
      }),
    ).toEqual({
      ...DEFAULT_SETTINGS,
      speechLanguage: 'ko',
      fontSize: 120,
      marginX: 0,
    });
  });

  it('falls back to defaults on corrupt JSON', () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, '{not json');
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });
});

describe('language detection', () => {
  it('picks the first supported browser language', () => {
    expect(detectBrowserLanguage(['fr-FR', 'ja-JP', 'en'])).toBe('ja');
    expect(detectBrowserLanguage(['ko'])).toBe('ko');
    expect(detectBrowserLanguage(['de-DE'])).toBe('en');
  });

  it('detects the script language from its writing system', () => {
    expect(detectScriptLanguage('Hello there, welcome.')).toBe('en');
    expect(detectScriptLanguage('안녕하세요. 오늘은 API를 소개합니다.')).toBe('ko');
    expect(detectScriptLanguage('今日は新しいアプリを紹介します。')).toBe('ja');
    expect(detectScriptLanguage('東京大学')).toBe('ja');
    expect(detectScriptLanguage('1')).toBeNull();
  });

  it('resolves auto to the detected language and falls back to English', () => {
    expect(resolveLanguage('ko', () => 'ja')).toBe('ko');
    expect(resolveLanguage('auto', () => 'ja')).toBe('ja');
    expect(resolveLanguage('auto', () => null)).toBe('en');
  });
});

describe('line wrap setting', () => {
  it('defaults to keeping words whole', () => {
    expect(DEFAULT_SETTINGS.lineWrap).toBe('words');
  });

  it('accepts known modes and repairs unknown ones', () => {
    expect(sanitizeSettings({ lineWrap: 'anywhere' }).lineWrap).toBe('anywhere');
    expect(sanitizeSettings({ lineWrap: 'hyphenate' }).lineWrap).toBe('words');
  });
});
