/* Thin wrapper over the Web Speech API (SpeechRecognition). */

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: any) => void) | null;
  onerror: ((e: any) => void) | null;
  onend: (() => void) | null;
  onaudiostart?: (() => void) | null;
};

/**
 * What the recognizer is doing while the user wants it on.
 * - `listening`: running normally.
 * - `interrupted`: a transient problem (no network, microphone busy or
 *   unplugged, service hiccup). It retries automatically and returns to
 *   `listening` on its own once audio flows again.
 * - `denied`: the user or browser blocked the microphone; retrying will not help.
 */
export type SpeechHealth = 'listening' | 'interrupted' | 'denied';

/** Why the recognizer is interrupted, for a short, non-blocking hint. */
export type InterruptReason = 'network' | 'microphone' | 'service';

export interface SpeechCallbacks {
  /** Full transcript of the current recognition session (final + interim). */
  onTranscript(transcript: string): void;
  onListeningChange(listening: boolean): void;
  onHealthChange(health: SpeechHealth, reason?: InterruptReason): void;
}

export function isSpeechSupported(): boolean {
  return Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
}

/** Errors that will not go away by retrying. */
const FATAL_ERRORS = new Set(['not-allowed', 'service-not-allowed']);

/** Errors that are part of normal operation and need no indication. */
const BENIGN_ERRORS = new Set(['no-speech', 'aborted']);

function reasonFor(error: string): InterruptReason {
  if (error === 'network') return 'network';
  if (error === 'audio-capture') return 'microphone';
  return 'service';
}

/** Retry delays after consecutive failures; the last value repeats. */
const RETRY_DELAYS_MS = [250, 1000, 2000, 4000];

export class Speech {
  private recognition: Recognition | null = null;
  private wanted = false;
  private lang = '';
  private health: SpeechHealth | null = null;
  private pendingReason: InterruptReason | null = null;
  private failures = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly cb: SpeechCallbacks;

  constructor(cb: SpeechCallbacks) {
    this.cb = cb;
  }

  get listening(): boolean {
    return this.wanted;
  }

  start(lang: string): void {
    if (!isSpeechSupported()) return;
    this.stop();
    this.lang = lang;
    this.wanted = true;
    this.failures = 0;
    this.setHealth('listening');
    this.cb.onListeningChange(true);
    this.spawn();
  }

  stop(): void {
    const wasWanted = this.wanted;
    this.wanted = false;
    this.clearRetry();
    this.teardown();
    this.health = null;
    this.pendingReason = null;
    if (wasWanted) this.cb.onListeningChange(false);
  }

  /** Creates a recognition session and wires its lifecycle. */
  private spawn(): void {
    const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec: Recognition = new Ctor();
    rec.lang = this.lang;
    rec.continuous = true;
    rec.interimResults = true;

    rec.onaudiostart = () => {
      if (this.recognition === rec) this.recover();
    };

    rec.onresult = (e: any) => {
      if (this.recognition !== rec) return;
      this.recover();
      let transcript = '';
      for (let i = 0; i < e.results.length; i++) {
        transcript += ` ${e.results[i][0].transcript}`;
      }
      this.cb.onTranscript(transcript);
    };

    rec.onerror = (e: any) => {
      if (this.recognition !== rec) return;
      const error = String(e.error ?? '');
      if (BENIGN_ERRORS.has(error)) return;
      if (FATAL_ERRORS.has(error)) {
        this.wanted = false;
        this.clearRetry();
        this.setHealth('denied');
        this.cb.onListeningChange(false);
        return;
      }
      // Reported once the session ends (onend), so a quick restart that
      // recovers never flashes a warning.
      this.pendingReason = reasonFor(error);
    };

    // Browsers end sessions on silence, errors or after a while; keep going.
    rec.onend = () => {
      if (this.recognition !== rec) return;
      this.recognition = null;
      if (!this.wanted) return;
      if (this.pendingReason) {
        this.failures++;
        this.setHealth('interrupted', this.pendingReason);
        this.pendingReason = null;
        this.scheduleRetry();
      } else {
        this.spawn();
      }
    };

    this.recognition = rec;
    try {
      rec.start();
    } catch {
      // start() throws if the engine is still busy; retry shortly.
      this.recognition = null;
      this.failures++;
      this.setHealth('interrupted', 'service');
      this.scheduleRetry();
    }
  }

  /** Audio is flowing again. */
  private recover(): void {
    this.failures = 0;
    this.pendingReason = null;
    this.setHealth('listening');
  }

  private scheduleRetry(): void {
    this.clearRetry();
    const delay = RETRY_DELAYS_MS[Math.min(this.failures - 1, RETRY_DELAYS_MS.length - 1)];
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      if (this.wanted && !this.recognition) this.spawn();
    }, delay);
  }

  private clearRetry(): void {
    if (this.retryTimer !== null) clearTimeout(this.retryTimer);
    this.retryTimer = null;
  }

  private teardown(): void {
    const rec = this.recognition;
    this.recognition = null;
    if (rec) {
      rec.onend = null;
      rec.onresult = null;
      rec.onerror = null;
      rec.onaudiostart = null;
      rec.abort();
    }
  }

  private setHealth(health: SpeechHealth, reason?: InterruptReason): void {
    if (this.health === health && health !== 'interrupted') return;
    this.health = health;
    this.cb.onHealthChange(health, reason);
  }
}
