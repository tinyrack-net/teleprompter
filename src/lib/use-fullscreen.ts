import { useCallback, useSyncExternalStore } from 'react';

/** Prefixed Fullscreen API, still the only one on older Safari (iPadOS < 16.4). */
interface WebkitDocument extends Document {
  webkitFullscreenEnabled?: boolean;
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
}

interface WebkitElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
}

function doc(): WebkitDocument | null {
  return typeof document === 'undefined' ? null : (document as WebkitDocument);
}

/**
 * Whether the page can enter fullscreen. False on iPhone Safari, which has no
 * element fullscreen, and inside iframes without allow="fullscreen".
 */
export function isFullscreenSupported(): boolean {
  const d = doc();
  return Boolean(d && (d.fullscreenEnabled || d.webkitFullscreenEnabled));
}

function fullscreenElement(): Element | null {
  const d = doc();
  return d ? (d.fullscreenElement ?? d.webkitFullscreenElement ?? null) : null;
}

function subscribe(onChange: () => void): () => void {
  const d = doc();
  if (!d) return () => {};
  d.addEventListener('fullscreenchange', onChange);
  d.addEventListener('webkitfullscreenchange', onChange);
  return () => {
    d.removeEventListener('fullscreenchange', onChange);
    d.removeEventListener('webkitfullscreenchange', onChange);
  };
}

const getSnapshot = () => fullscreenElement() !== null;
const getServerSnapshot = () => false;

/**
 * Fullscreen state for the whole page. The state follows the browser, so it
 * stays correct when the user leaves fullscreen with Esc or a system gesture.
 */
export function useFullscreen() {
  const active = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback(async () => {
    const d = doc();
    if (!d) return;
    try {
      if (fullscreenElement()) {
        await (d.exitFullscreen ? d.exitFullscreen() : d.webkitExitFullscreen?.());
      } else {
        // The document root keeps the settings drawer (portalled to <body>) visible.
        const root = d.documentElement as WebkitElement;
        await (root.requestFullscreen
          ? root.requestFullscreen({ navigationUI: 'hide' })
          : root.webkitRequestFullscreen?.());
      }
    } catch {
      // Rejected (e.g. not triggered by a user gesture or blocked by policy);
      // the state simply does not change.
    }
  }, []);

  return { supported: isFullscreenSupported(), active, toggle };
}
