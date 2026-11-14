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
};

export interface SpeechCallbacks {
  /** Full transcript of the current recognition session (final + interim). */
  onTranscript(transcript: string): void;
  onListeningChange(listening: boolean): void;
  onError(message: string): void;
}

export function isSpeechSupported(): boolean {
  return Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
}

export class Speech {
  private recognition: Recognition | null = null;
  private wanted = false;

  constructor(private readonly cb: SpeechCallbacks) {}

  get listening(): boolean {
    return this.wanted;
  }

  start(lang: string): void {
    const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Ctor) {
      this.cb.onError('This browser does not support speech recognition. Try Chrome, Edge or Safari.');
      return;
    }
    this.stop();

    const rec: Recognition = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (e: any) => {
      let transcript = '';
      for (let i = 0; i < e.results.length; i++) {
        transcript += ' ' + e.results[i][0].transcript;
      }
      this.cb.onTranscript(transcript);
    };

    rec.onerror = (e: any) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        this.wanted = false;
        this.cb.onError('Microphone access was denied.');
      } else {
        this.cb.onError(`Speech recognition error: ${e.error}`);
      }
    };

    // Browsers end sessions on silence or after a while; restart transparently.
    rec.onend = () => {
      if (this.wanted && this.recognition === rec) {
        try {
          rec.start();
          return;
        } catch {
          this.wanted = false;
        }
      }
      if (this.recognition === rec) this.cb.onListeningChange(false);
    };

    this.recognition = rec;
    this.wanted = true;
    try {
      rec.start();
      this.cb.onListeningChange(true);
    } catch (err) {
      this.wanted = false;
      this.cb.onError(`Could not start speech recognition: ${String(err)}`);
      this.cb.onListeningChange(false);
    }
  }

  stop(): void {
    this.wanted = false;
    const rec = this.recognition;
    this.recognition = null;
    if (rec) {
      rec.onend = null;
      rec.onresult = null;
      rec.abort();
      this.cb.onListeningChange(false);
    }
  }
}
