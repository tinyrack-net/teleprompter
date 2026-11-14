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

/**
 * Maps a reading position from one version of a script to an edited one.
 *
 * Words before the cursor are aligned with the new script by their longest
 * common prefix and suffix, so edits before, after or at the cursor keep the
 * reader on the same word whenever it still exists.
 */
export function remapCursor(oldTokens: Token[], newTokens: Token[], cursor: number): number {
  const oldWords: number[] = [];
  const newWords: number[] = [];
  oldTokens.forEach((t, i) => {
    if (!t.skip) oldWords.push(i);
  });
  newTokens.forEach((t, i) => {
    if (!t.skip) newWords.push(i);
  });
  if (newWords.length === 0) return newTokens.length;

  // Index (among spoken words) of the word the reader is on.
  let p = oldWords.findIndex((i) => i >= cursor);
  if (p === -1) p = oldWords.length;

  const same = (a: number, b: number) =>
    oldTokens[oldWords[a]].clean === newTokens[newWords[b]].clean;

  let prefix = 0;
  while (prefix < oldWords.length && prefix < newWords.length && same(prefix, prefix)) prefix++;

  let target: number;
  if (p <= prefix) {
    // The edit is after the cursor.
    target = p;
  } else {
    let suffix = 0;
    while (
      suffix < oldWords.length - prefix &&
      suffix < newWords.length - prefix &&
      same(oldWords.length - 1 - suffix, newWords.length - 1 - suffix)
    ) {
      suffix++;
    }
    const fromEnd = oldWords.length - p;
    if (fromEnd <= suffix) {
      // The edit is before the cursor: keep the distance from the end.
      target = newWords.length - fromEnd;
    } else {
      // The cursor is inside the edited range (or edits surround it): look for
      // the same word with the most matching neighbors.
      target = findAnchor(p, prefix, newWords.length - suffix) ?? prefix;
    }
  }

  function findAnchor(at: number, from: number, to: number): number | null {
    if (at >= oldWords.length) return null;
    const RADIUS = 4;
    let best: number | null = null;
    let bestScore = 0;
    for (let j = from; j < to; j++) {
      if (!same(at, j)) continue;
      let score = 1;
      for (let d = 1; d <= RADIUS; d++) {
        if (at - d >= 0 && j - d >= 0 && same(at - d, j - d)) score++;
        if (at + d < oldWords.length && j + d < newWords.length && same(at + d, j + d)) score++;
      }
      if (score > bestScore) {
        best = j;
        bestScore = score;
      }
    }
    // A lone common word is not enough evidence to move the reader there.
    return bestScore >= 2 ? best : null;
  }

  return target >= newWords.length ? newTokens.length : newWords[target];
}

export function countSpoken(tokens: Token[], end = tokens.length): number {
  let n = 0;
  for (let i = 0; i < end && i < tokens.length; i++) if (!tokens[i].skip) n++;
  return n;
}
