import { useCallback, useEffect, useSyncExternalStore } from 'react';

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

/**
 * Browser fullscreen entered outside the page (F11 when the page did not get
 * the key, or the browser menu). The page cannot leave it programmatically
 * and gets no fullscreenchange event, so it is detected from the window size.
 */
function isBrowserFullscreen(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia?.('(display-mode: fullscreen)').matches) return true;
  // display-mode is not reported for regular tabs in every browser; a window
  // that covers the whole screen is fullscreen in practice.
  return window.innerWidth >= window.screen.width && window.innerHeight >= window.screen.height;
}

type FullscreenMode = 'none' | 'page' | 'browser';

function getMode(): FullscreenMode {
  if (fullscreenElement()) return 'page';
  if (isBrowserFullscreen()) return 'browser';
  return 'none';
}

function subscribe(onChange: () => void): () => void {
  const d = doc();
  if (!d || typeof window === 'undefined') return () => {};
  const media = window.matchMedia?.('(display-mode: fullscreen)');
  d.addEventListener('fullscreenchange', onChange);
  d.addEventListener('webkitfullscreenchange', onChange);
  window.addEventListener('resize', onChange);
  media?.addEventListener('change', onChange);
  return () => {
    d.removeEventListener('fullscreenchange', onChange);
    d.removeEventListener('webkitfullscreenchange', onChange);
    window.removeEventListener('resize', onChange);
    media?.removeEventListener('change', onChange);
  };
}

const getServerSnapshot = (): FullscreenMode => 'none';

async function enterPageFullscreen(): Promise<void> {
  const root = doc()?.documentElement as WebkitElement | undefined;
  if (!root) return;
  // The document root keeps the settings drawer (portalled to <body>) visible.
  await (root.requestFullscreen
    ? root.requestFullscreen({ navigationUI: 'hide' })
    : root.webkitRequestFullscreen?.());
}

async function exitPageFullscreen(): Promise<void> {
  const d = doc();
  if (!d) return;
  await (d.exitFullscreen ? d.exitFullscreen() : d.webkitExitFullscreen?.());
}

/**
 * Fullscreen state for the whole page. It follows the browser, so it stays
 * correct when the user leaves fullscreen with Esc, a system gesture or F11.
 */
export function useFullscreen() {
  const mode = useSyncExternalStore(subscribe, getMode, getServerSnapshot);
  const supported = isFullscreenSupported();

  const toggle = useCallback(async () => {
    try {
      if (getMode() === 'page') await exitPageFullscreen();
      else await enterPageFullscreen();
    } catch {
      // Rejected (e.g. not triggered by a user gesture or blocked by policy);
      // the state simply does not change.
    }
  }, []);

  // F11 drives the same fullscreen as the button, so both stay in sync and the
  // button can always undo it. Browser fullscreen (which a page cannot exit)
  // is only left to the browser when the page is already in it.
  useEffect(() => {
    if (!supported) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'F11' || e.repeat || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (getMode() === 'browser') return;
      e.preventDefault();
      void toggle();
    };
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, [supported, toggle]);

  return {
    supported,
    /** True in any fullscreen, including browser fullscreen entered from its menu. */
    active: mode !== 'none',
    /**
     * Browser fullscreen that only the browser can leave (F11 again). The
     * button then explains how to exit instead of doing nothing.
     */
    browserManaged: mode === 'browser',
    toggle,
  };
}
