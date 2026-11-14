import { useCallback, useEffect, useRef, useState } from 'react';
import { match, toSpokenWords } from '../../lib/matcher';
import { nextSpoken, prevSpoken, remapCursor, type Token } from '../../lib/script';
import {
  type InterruptReason,
  isSpeechSupported,
  Speech,
  type SpeechHealth,
} from '../../lib/speech';

/**
 * What the status pill shows.
 * - `idle`: not listening (paused by the user).
 * - `listening`: working.
 * - `interrupted`: retrying after a transient problem; clears itself.
 * - `denied`: microphone blocked; the user has to allow it.
 * - `unsupported`: the browser has no speech recognition.
 */
export type VoiceStatus =
  | { kind: 'idle' | 'listening' | 'denied' | 'unsupported' }
  | { kind: 'interrupted'; reason: InterruptReason };

/**
 * Tracks the reading position in `tokens` and moves it as speech is recognized.
 * `locale` is the BCP 47 tag the recognizer listens for.
 */
export function useVoiceCursor(tokens: Token[], locale: string) {
  const [cursor, setCursorState] = useState(() => nextSpoken(tokens, 0));
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState('');
  const [health, setHealth] = useState<{ health: SpeechHealth; reason?: InterruptReason } | null>(
    null,
  );
  const supported = isSpeechSupported();

  const cursorRef = useRef(cursor);
  const tokensRef = useRef(tokens);
  const localeRef = useRef(locale);
  /** Transcript words before this index are ignored (set on manual jumps). */
  const ignoreBefore = useRef(0);
  const lastWordCount = useRef(0);

  localeRef.current = locale;

  // The script was edited: keep the reader on the same word and forget the
  // transcript so far, which was aligned with the old text.
  if (tokensRef.current !== tokens) {
    const remapped = remapCursor(tokensRef.current, tokens, cursorRef.current);
    tokensRef.current = tokens;
    cursorRef.current = remapped;
    ignoreBefore.current = lastWordCount.current;
    if (remapped !== cursor) setCursorState(remapped);
  }

  const setCursor = useCallback((index: number) => {
    const next = Math.max(0, Math.min(index, tokensRef.current.length));
    cursorRef.current = next;
    setCursorState(next);
  }, []);

  const speechRef = useRef<Speech | null>(null);
  if (!speechRef.current) {
    speechRef.current = new Speech({
      onTranscript(transcript) {
        const words = toSpokenWords(transcript, localeRef.current);
        if (words.length < lastWordCount.current) ignoreBefore.current = 0; // new session
        lastWordCount.current = words.length;
        // Japanese is written without spaces between words.
        setHeard(words.slice(-12).join(localeRef.current.startsWith('ja') ? '' : ' '));
        const next = match(tokensRef.current, cursorRef.current, words.slice(ignoreBefore.current));
        if (next !== null && next !== cursorRef.current) setCursor(next);
      },
      onListeningChange: setListening,
      onHealthChange(next, reason) {
        setHealth({ health: next, reason });
      },
    });
  }
  const speech = speechRef.current;

  const start = useCallback(() => {
    ignoreBefore.current = 0;
    lastWordCount.current = 0;
    speech.start(localeRef.current);
  }, [speech]);

  const stop = useCallback(() => speech.stop(), [speech]);

  const toggle = useCallback(() => {
    if (speech.listening) stop();
    else start();
  }, [speech, start, stop]);

  /** Manual jump: forget the transcript so far so it cannot pull the cursor back. */
  const jumpTo = useCallback(
    (index: number) => {
      ignoreBefore.current = lastWordCount.current;
      setCursor(index);
    },
    [setCursor],
  );

  const next = useCallback(
    () => jumpTo(nextSpoken(tokensRef.current, cursorRef.current + 1)),
    [jumpTo],
  );
  const prev = useCallback(
    () => jumpTo(prevSpoken(tokensRef.current, cursorRef.current)),
    [jumpTo],
  );
  const restart = useCallback(() => jumpTo(nextSpoken(tokensRef.current, 0)), [jumpTo]);

  // Restart recognition when the speech language changes mid-session.
  const previousLocale = useRef(locale);
  useEffect(() => {
    if (previousLocale.current !== locale && speech.listening) start();
    previousLocale.current = locale;
  }, [locale, speech, start]);

  useEffect(() => () => speech.stop(), [speech]);

  return {
    cursor,
    listening,
    heard,
    status: voiceStatus(supported, listening, health),
    start,
    stop,
    toggle,
    jumpTo,
    next,
    prev,
    restart,
  };
}

function voiceStatus(
  supported: boolean,
  listening: boolean,
  health: { health: SpeechHealth; reason?: InterruptReason } | null,
): VoiceStatus {
  if (!supported) return { kind: 'unsupported' };
  if (health?.health === 'denied') return { kind: 'denied' };
  if (!listening) return { kind: 'idle' };
  if (health?.health === 'interrupted')
    return { kind: 'interrupted', reason: health.reason ?? 'service' };
  return { kind: 'listening' };
}
