import { isLanguagePreference, type LanguagePreference } from './language';

export const SETTINGS_STORAGE_KEY = 'teleprompter:settings:v2';
export const SCRIPT_STORAGE_KEY = 'teleprompter:script:v2';

/**
 * How prompter lines wrap.
 * - `words`: never split a word (Korean eojeol, English word, Japanese phrase).
 * - `anywhere`: break at any character, so every line is filled evenly.
 */
export const LINE_WRAPS = ['words', 'anywhere'] as const;
export type LineWrap = (typeof LINE_WRAPS)[number];

export function isLineWrap(value: unknown): value is LineWrap {
  return typeof value === 'string' && (LINE_WRAPS as readonly string[]).includes(value);
}

export interface Settings {
  /** Language of the app interface. */
  uiLanguage: LanguagePreference;
  /** Language the speech recognizer listens for. */
  speechLanguage: LanguagePreference;
  /** Prompter font size in px. */
  fontSize: number;
  /** Left and right margin of the prompter text, in % of the screen width. */
  marginX: number;
  /** Top and bottom margin of the prompter, in % of the screen height. */
  marginY: number;
  /** Mirror the prompter text horizontally for teleprompter glass. */
  mirror: boolean;
  /** Where prompter lines may wrap. */
  lineWrap: LineWrap;
}

interface NumberRange {
  min: number;
  max: number;
  step: number;
}

export const RANGES = {
  fontSize: { min: 24, max: 120, step: 2 },
  marginX: { min: 0, max: 40, step: 1 },
  marginY: { min: 0, max: 40, step: 1 },
} as const satisfies Record<string, NumberRange>;

export const DEFAULT_SETTINGS: Settings = {
  uiLanguage: 'auto',
  speechLanguage: 'auto',
  fontSize: 48,
  marginX: 8,
  marginY: 0,
  mirror: false,
  lineWrap: 'words',
};

function clampNumber(value: unknown, range: NumberRange, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  const stepped = Math.round(value / range.step) * range.step;
  return Math.min(range.max, Math.max(range.min, stepped));
}

/** Validates untrusted (stored) data, keeping valid fields and defaulting the rest. */
export function sanitizeSettings(input: unknown): Settings {
  const data = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const d = DEFAULT_SETTINGS;
  return {
    uiLanguage: isLanguagePreference(data.uiLanguage) ? data.uiLanguage : d.uiLanguage,
    speechLanguage: isLanguagePreference(data.speechLanguage)
      ? data.speechLanguage
      : d.speechLanguage,
    fontSize: clampNumber(data.fontSize, RANGES.fontSize, d.fontSize),
    marginX: clampNumber(data.marginX, RANGES.marginX, d.marginX),
    marginY: clampNumber(data.marginY, RANGES.marginY, d.marginY),
    mirror: typeof data.mirror === 'boolean' ? data.mirror : d.mirror,
    lineWrap: isLineWrap(data.lineWrap) ? data.lineWrap : d.lineWrap,
  };
}

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function loadSettings(): Settings {
  try {
    const raw = storage()?.getItem(SETTINGS_STORAGE_KEY);
    return sanitizeSettings(raw ? JSON.parse(raw) : {});
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: Settings): void {
  try {
    storage()?.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage can be full or disabled (private mode); settings still work in memory.
  }
}

export function loadScript(fallback: string): string {
  try {
    return storage()?.getItem(SCRIPT_STORAGE_KEY) ?? fallback;
  } catch {
    return fallback;
  }
}

export function saveScript(script: string): void {
  try {
    storage()?.setItem(SCRIPT_STORAGE_KEY, script);
  } catch {
    // See saveSettings.
  }
}
