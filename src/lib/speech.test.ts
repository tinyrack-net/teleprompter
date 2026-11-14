import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type InterruptReason, Speech, type SpeechHealth } from './speech';

/** Minimal SpeechRecognition double; every instance is recorded. */
class FakeRecognition {
  static instances: FakeRecognition[] = [];
  lang = '';
  continuous = false;
  interimResults = false;
  started = false;
  onresult: ((e: unknown) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  onend: (() => void) | null = null;
  onaudiostart: (() => void) | null = null;
  constructor() {
    FakeRecognition.instances.push(this);
  }
  start() {
    this.started = true;
  }
  stop() {}
  abort() {}
  /** Browser-style failure: an error event followed by the session ending. */
  fail(error: string) {
    this.onerror?.({ error });
    this.onend?.();
  }
  say(text: string) {
    this.onresult?.({ results: [[{ transcript: text }]] });
  }
}

const latest = () => FakeRecognition.instances.at(-1) as FakeRecognition;

function setup() {
  const health: Array<[SpeechHealth, InterruptReason | undefined]> = [];
  const listening: boolean[] = [];
  const transcripts: string[] = [];
  const speech = new Speech({
    onTranscript: (t) => transcripts.push(t.trim()),
    onListeningChange: (l) => listening.push(l),
    onHealthChange: (h, r) => health.push([h, r]),
  });
  return { speech, health, listening, transcripts };
}

describe('Speech', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    FakeRecognition.instances = [];
    vi.stubGlobal('window', { SpeechRecognition: FakeRecognition });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('restarts silently when a session ends normally', () => {
    const { speech, health } = setup();
    speech.start('en-US');
    latest().onend?.();
    expect(FakeRecognition.instances).toHaveLength(2);
    expect(latest().started).toBe(true);
    expect(health).toEqual([['listening', undefined]]);
  });

  it('ignores no-speech while the user is silent', () => {
    const { speech, health } = setup();
    speech.start('en-US');
    for (let i = 0; i < 5; i++) latest().fail('no-speech');
    expect(health).toEqual([['listening', undefined]]);
    expect(speech.listening).toBe(true);
  });

  it('reports a transient interruption, retries, and recovers on its own', () => {
    const { speech, health, listening } = setup();
    speech.start('en-US');
    latest().fail('network');
    expect(health.at(-1)).toEqual(['interrupted', 'network']);
    expect(speech.listening).toBe(true);

    // Retries with backoff instead of spinning.
    expect(FakeRecognition.instances).toHaveLength(1);
    vi.advanceTimersByTime(250);
    expect(FakeRecognition.instances).toHaveLength(2);

    latest().fail('audio-capture');
    expect(health.at(-1)).toEqual(['interrupted', 'microphone']);
    vi.advanceTimersByTime(999);
    expect(FakeRecognition.instances).toHaveLength(2);
    vi.advanceTimersByTime(1);
    expect(FakeRecognition.instances).toHaveLength(3);

    // Audio flows again: back to normal without any user action.
    latest().onaudiostart?.();
    expect(health.at(-1)).toEqual(['listening', undefined]);
    expect(listening).toEqual([true]);
  });

  it('recovers when results arrive even without an audiostart event', () => {
    const { speech, health, transcripts } = setup();
    speech.start('en-US');
    latest().fail('network');
    vi.advanceTimersByTime(250);
    latest().say('hello');
    expect(health.at(-1)).toEqual(['listening', undefined]);
    expect(transcripts).toEqual(['hello']);
  });

  it('stops for good when the microphone is denied', () => {
    const { speech, health, listening } = setup();
    speech.start('en-US');
    latest().fail('not-allowed');
    expect(health.at(-1)).toEqual(['denied', undefined]);
    expect(listening).toEqual([true, false]);
    expect(speech.listening).toBe(false);
    vi.advanceTimersByTime(10_000);
    expect(FakeRecognition.instances).toHaveLength(1);
  });

  it('stop cancels a pending retry', () => {
    const { speech, listening } = setup();
    speech.start('en-US');
    latest().fail('network');
    speech.stop();
    vi.advanceTimersByTime(10_000);
    expect(FakeRecognition.instances).toHaveLength(1);
    expect(listening).toEqual([true, false]);
  });
});
