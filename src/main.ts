import './style.css';
import { match, toSpokenWords } from './matcher';
import { nextSpoken, parseScript, prevSpoken, type Token } from './script';
import { isSpeechSupported, Speech } from './speech';

const STORAGE_KEY = 'teleprompter:v1';

interface Settings {
  script: string;
  lang: string;
  fontSize: number;
  mirror: boolean;
}

const SAMPLE = `안녕하세요. 오늘은 웹 브라우저에서 동작하는 음성 인식 텔레프롬프터를 소개합니다.
말하는 속도에 맞춰 원고가 자동으로 스크롤됩니다. [잠시 멈춤]
단어를 클릭하면 그 위치로 바로 이동할 수 있습니다.`;

const defaults: Settings = {
  script: SAMPLE,
  lang: navigator.language.startsWith('ko') ? 'ko-KR' : 'en-US',
  fontSize: 48,
  mirror: false,
};

function loadSettings(): Settings {
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') };
  } catch {
    return { ...defaults };
  }
}

function saveSettings(): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const els = {
  editor: $('editor'),
  prompter: $('prompter'),
  script: $<HTMLTextAreaElement>('script-input'),
  lang: $<HTMLSelectElement>('lang'),
  fontSize: $<HTMLInputElement>('font-size'),
  fontSizeValue: $('font-size-value'),
  mirror: $<HTMLInputElement>('mirror'),
  start: $<HTMLButtonElement>('start'),
  unsupported: $('unsupported'),
  scroller: $('scroller'),
  text: $('text'),
  mic: $<HTMLButtonElement>('mic'),
  back: $<HTMLButtonElement>('back'),
  restart: $<HTMLButtonElement>('restart'),
  progress: $('progress'),
  transcript: $('transcript'),
  error: $('error'),
};

const settings = loadSettings();
let tokens: Token[] = [];
let spans: HTMLSpanElement[] = [];
let cursor = 0;
/** Transcript words before this index are ignored (set on manual jumps). */
let ignoreBefore = 0;
let lastWordCount = 0;

const speech = new Speech({
  onTranscript(transcript) {
    const words = toSpokenWords(transcript);
    if (words.length < lastWordCount) ignoreBefore = 0; // new recognition session
    lastWordCount = words.length;
    els.transcript.textContent = words.slice(-12).join(' ');

    const next = match(tokens, cursor, words.slice(ignoreBefore));
    if (next !== null && next !== cursor) setCursor(next);
  },
  onListeningChange(listening) {
    els.mic.classList.toggle('on', listening);
    els.mic.textContent = listening ? '■ Stop' : '● Listen';
  },
  onError(message) {
    showError(message);
  },
});

// ---------- Editor ----------

els.script.value = settings.script;
els.lang.value = settings.lang;
els.fontSize.value = String(settings.fontSize);
els.mirror.checked = settings.mirror;
applyDisplaySettings();

if (!isSpeechSupported()) els.unsupported.hidden = false;

els.script.addEventListener('input', () => {
  settings.script = els.script.value;
  saveSettings();
});
els.lang.addEventListener('change', () => {
  settings.lang = els.lang.value;
  saveSettings();
});
els.fontSize.addEventListener('input', () => {
  settings.fontSize = Number(els.fontSize.value);
  applyDisplaySettings();
  saveSettings();
});
els.mirror.addEventListener('change', () => {
  settings.mirror = els.mirror.checked;
  applyDisplaySettings();
  saveSettings();
});
els.start.addEventListener('click', openPrompter);

function applyDisplaySettings(): void {
  els.fontSizeValue.textContent = `${settings.fontSize}px`;
  document.documentElement.style.setProperty('--font-size', `${settings.fontSize}px`);
  els.text.classList.toggle('mirror', settings.mirror);
}

// ---------- Prompter ----------

function openPrompter(): void {
  tokens = parseScript(els.script.value);
  if (!tokens.some((t) => !t.skip)) {
    els.script.focus();
    return;
  }
  renderTokens();
  els.editor.hidden = true;
  els.prompter.hidden = false;
  hideError();
  setCursor(nextSpoken(tokens, 0), true);
  startListening();
}

function closePrompter(): void {
  speech.stop();
  els.prompter.hidden = true;
  els.editor.hidden = false;
}

function renderTokens(): void {
  els.text.replaceChildren();
  spans = tokens.map((token, i) => {
    const span = document.createElement('span');
    if (token.isBreak) {
      span.className = 'break';
    } else {
      span.className = token.skip ? 'word note' : 'word';
      span.textContent = token.text;
      span.addEventListener('click', () => jumpTo(token.skip ? nextSpoken(tokens, i) : i));
    }
    els.text.append(span, document.createTextNode(' '));
    return span;
  });
}

function setCursor(index: number, instant = false): void {
  cursor = Math.max(0, Math.min(index, tokens.length));
  spans.forEach((span, i) => {
    span.classList.toggle('past', i < cursor);
    span.classList.toggle('current', i === cursor);
  });

  const spokenTotal = tokens.filter((t) => !t.skip).length;
  const spokenDone = tokens.slice(0, cursor).filter((t) => !t.skip).length;
  els.progress.style.width = `${spokenTotal ? (spokenDone / spokenTotal) * 100 : 0}%`;

  // Keep the current word on the reading line (35% from the top).
  const target = spans[Math.min(cursor, spans.length - 1)];
  if (target) {
    const top = target.offsetTop - els.scroller.clientHeight * 0.35;
    els.scroller.scrollTo({ top, behavior: instant ? 'auto' : 'smooth' });
  }
}

/** Manual jump: forget the transcript so far so it cannot pull the cursor back. */
function jumpTo(index: number): void {
  ignoreBefore = lastWordCount;
  setCursor(index);
}

function startListening(): void {
  ignoreBefore = 0;
  lastWordCount = 0;
  speech.start(settings.lang);
}

function toggleListening(): void {
  if (speech.listening) speech.stop();
  else startListening();
}

els.mic.addEventListener('click', toggleListening);
els.back.addEventListener('click', closePrompter);
els.restart.addEventListener('click', () => jumpTo(nextSpoken(tokens, 0)));

document.addEventListener('keydown', (e) => {
  if (els.prompter.hidden) return;
  switch (e.key) {
    case ' ':
      e.preventDefault();
      toggleListening();
      break;
    case 'ArrowRight':
    case 'ArrowDown':
      e.preventDefault();
      jumpTo(nextSpoken(tokens, cursor + 1));
      break;
    case 'ArrowLeft':
    case 'ArrowUp':
      e.preventDefault();
      jumpTo(prevSpoken(tokens, cursor));
      break;
    case 'Home':
      e.preventDefault();
      jumpTo(nextSpoken(tokens, 0));
      break;
    case 'Escape':
      closePrompter();
      break;
  }
});

function showError(message: string): void {
  els.error.textContent = message;
  els.error.hidden = false;
}

function hideError(): void {
  els.error.hidden = true;
}
