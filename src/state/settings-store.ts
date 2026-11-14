import { useSyncExternalStore } from 'react';
import {
  loadScript,
  loadSettings,
  SCRIPT_STORAGE_KEY,
  SETTINGS_STORAGE_KEY,
  type Settings,
  sanitizeSettings,
  saveScript,
  saveSettings,
} from '../lib/settings';

type Listener = () => void;

/** A tiny observable value persisted to localStorage. */
function createStore<T>(options: {
  key: string;
  load: () => T;
  save: (value: T) => void;
  parse: (raw: string | null) => T;
}) {
  let value: T | undefined;
  const listeners = new Set<Listener>();

  const get = (): T => {
    if (value === undefined) value = options.load();
    return value;
  };

  const emit = () => {
    for (const l of listeners) l();
  };

  const set = (next: T) => {
    value = next;
    options.save(next);
    emit();
  };

  // Keep other tabs in sync.
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (event) => {
      if (event.key !== options.key) return;
      value = options.parse(event.newValue);
      emit();
    });
  }

  const subscribe = (listener: Listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  return { get, set, subscribe };
}

const settingsStore = createStore<Settings>({
  key: SETTINGS_STORAGE_KEY,
  load: loadSettings,
  save: saveSettings,
  parse: (raw) => {
    try {
      return sanitizeSettings(raw ? JSON.parse(raw) : {});
    } catch {
      return sanitizeSettings({});
    }
  },
});

let scriptFallback = '';

const scriptStore = createStore<string>({
  key: SCRIPT_STORAGE_KEY,
  load: () => loadScript(scriptFallback),
  save: saveScript,
  parse: (raw) => raw ?? scriptFallback,
});

export function useSettings(): [Settings, (patch: Partial<Settings>) => void] {
  const settings = useSyncExternalStore(settingsStore.subscribe, settingsStore.get);
  const update = (patch: Partial<Settings>) =>
    settingsStore.set(sanitizeSettings({ ...settingsStore.get(), ...patch }));
  return [settings, update];
}

export function getSettings(): Settings {
  return settingsStore.get();
}

/** The script text. `fallback` is used when nothing has been saved yet. */
export function useScript(fallback: string): [string, (script: string) => void] {
  scriptFallback = fallback;
  const script = useSyncExternalStore(scriptStore.subscribe, scriptStore.get);
  return [script, scriptStore.set];
}
