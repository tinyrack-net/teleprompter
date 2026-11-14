export type TokenKind = 'word' | 'note' | 'punct' | 'space' | 'break';

/** A single piece of the script as rendered on the prompter. */
export interface Token {
  /** Original text shown on screen. */
  text: string;
  /** Normalized form used for matching (lowercase letters/digits only). */
  clean: string;
  kind: TokenKind;
  /** True for everything that is not a spoken word. */
  skip: boolean;
  /** For breaks: true when the break separates paragraphs (blank line). */
  paragraph?: boolean;
}

export function normalize(word: string): string {
  return word.replace(/[^\p{L}\p{N}]/gu, '').toLowerCase();
}

const segmenters = new Map<string, Intl.Segmenter>();

function segmenter(locale: string): Intl.Segmenter {
  let s = segmenters.get(locale);
  if (!s) {
    s = new Intl.Segmenter(locale, { granularity: 'word' });
    segmenters.set(locale, s);
  }
  return s;
}

/**
 * Splits text into words with Intl.Segmenter, which also handles languages
 * written without spaces such as Japanese.
 */
export function segmentWords(text: string, locale: string): string[] {
  const words: string[] = [];
  for (const part of segmenter(locale).segment(text)) {
    if (!part.isWordLike) continue;
    const clean = normalize(part.segment);
    if (clean) words.push(clean);
  }
  return words;
}

const NOTE = /\[[^\]]*\]?/g;

function pushText(tokens: Token[], text: string, locale: string): void {
  for (const part of segmenter(locale).segment(text)) {
    const clean = part.isWordLike ? normalize(part.segment) : '';
    if (clean) {
      tokens.push({ text: part.segment, clean, kind: 'word', skip: false });
    } else if (/^\s+$/u.test(part.segment)) {
      tokens.push({ text: part.segment, clean: '', kind: 'space', skip: true });
    } else {
      tokens.push({ text: part.segment, clean: '', kind: 'punct', skip: true });
    }
  }
}

/**
 * Splits a script into tokens.
 * - Every character of the original text is kept so it renders unchanged.
 * - A newline becomes a line break; a blank line becomes a paragraph break.
 * - Text inside [square brackets] is a note: shown but never matched.
 */
export function parseScript(text: string, locale = 'en'): Token[] {
  const tokens: Token[] = [];
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  let pendingBreak: Token | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      if (pendingBreak) pendingBreak.paragraph = true;
      continue;
    }
    if (pendingBreak) tokens.push(pendingBreak);

    let last = 0;
    for (const match of line.matchAll(NOTE)) {
      const index = match.index ?? 0;
      if (index > last) pushText(tokens, line.slice(last, index), locale);
      tokens.push({ text: match[0], clean: '', kind: 'note', skip: true });
      last = index + match[0].length;
    }
    if (last < line.length) pushText(tokens, line.slice(last), locale);

    pendingBreak = { text: '', clean: '', kind: 'break', skip: true, paragraph: false };
  }
  return tokens;
}

/** Moves forward from `index` to the next spoken word (or tokens.length). */
export function nextSpoken(tokens: Token[], index: number): number {
  let i = Math.max(0, index);
  while (i < tokens.length && tokens[i].skip) i++;
  return i;
}

/** Moves backward from `index - 1` to the previous spoken word (or the first one). */
export function prevSpoken(tokens: Token[], index: number): number {
  let i = Math.min(tokens.length, index) - 1;
  while (i > 0 && tokens[i].skip) i--;
  return i < 0 ? nextSpoken(tokens, 0) : tokens[i]?.skip ? nextSpoken(tokens, 0) : i;
}

export function countSpoken(tokens: Token[], end = tokens.length): number {
  let n = 0;
  for (let i = 0; i < end && i < tokens.length; i++) if (!tokens[i].skip) n++;
  return n;
}
