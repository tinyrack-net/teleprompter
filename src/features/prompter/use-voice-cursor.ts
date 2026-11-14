import { useCallback, useEffect, useRef, useState } from 'react';
import { match, toSpokenWords } from '../../lib/matcher';
import { nextSpoken, prevSpoken, type Token } from '../../lib/script';
import { isSpeechSupported, Speech, type SpeechErrorCode } from '../../lib/speech';

export interface SpeechError {
  code: SpeechErrorCode;
  detail?: string;
}

/**
 * Tracks the reading position in `tokens` and moves it as speech is recognized.
 * `locale` is the BCP 47 tag the recognizer listens for.
 */
export function useVoiceCursor(tokens: Token[], locale: string) {
  const [cursor, setCursorState] = useState(() => nextSpoken(tokens, 0));
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState('');
  const [error, setError] = useState<SpeechError | null>(
    isSpeechSupported() ? null : { code: 'unsupported' },
  );

  const cursorRef = useRef(cursor);
  const tokensRef = useRef(tokens);
  const localeRef = useRef(locale);
  /** Transcript words before this index are ignored (set on manual jumps). */
  const ignoreBefore = useRef(0);
  const lastWordCount = useRef(0);

  tokensRef.current = tokens;
  localeRef.current = locale;

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
      onError(code, detail) {
        setError({ code, detail });
      },
    });
  }
  const speech = speechRef.current;

  const start = useCallback(() => {
    ignoreBefore.current = 0;
    lastWordCount.current = 0;
    setError((e) => (e?.code === 'unsupported' ? e : null));
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
    error,
    dismissError: () => setError(null),
    start,
    stop,
    toggle,
    jumpTo,
    next,
    prev,
    restart,
  };
}
