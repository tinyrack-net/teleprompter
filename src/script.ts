/** A single token of the script as rendered on the prompter. */
export interface Token {
  /** Original text shown on screen. */
  text: string;
  /** Normalized form used for matching (lowercase letters/digits only). */
  clean: string;
  /** Not spoken: bracket notes, punctuation-only tokens, line breaks. */
  skip: boolean;
  /** Paragraph/line break marker. */
  isBreak: boolean;
}

export function normalize(word: string): string {
  return word.replace(/[^\p{L}\p{N}]/gu, '').toLowerCase();
}

/**
 * Splits a script into word tokens.
 * - Newlines become break tokens (consecutive newlines collapse to one).
 * - Text inside [square brackets] is shown but never matched (stage notes).
 */
export function parseScript(text: string): Token[] {
  const tokens: Token[] = [];
  let inBracket = false;

  for (const line of text.replace(/\r\n?/g, '\n').split('\n')) {
    const words = line.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      continue;
    }
    if (tokens.length > 0) {
      tokens.push({ text: '', clean: '', skip: true, isBreak: true });
    }
    for (const word of words) {
      const opens = word.includes('[');
      const closes = word.includes(']');
      const isNote = inBracket || opens;
      if (opens && !closes) inBracket = true;
      if (closes) inBracket = false;

      const clean = normalize(word);
      tokens.push({ text: word, clean, skip: isNote || clean.length === 0, isBreak: false });
    }
  }
  return tokens;
}

/** Moves forward from `index` to the next spoken token (or tokens.length). */
export function nextSpoken(tokens: Token[], index: number): number {
  let i = Math.max(0, index);
  while (i < tokens.length && tokens[i].skip) i++;
  return i;
}

/** Moves backward from `index - 1` to the previous spoken token (or 0). */
export function prevSpoken(tokens: Token[], index: number): number {
  let i = Math.min(tokens.length, index) - 1;
  while (i > 0 && tokens[i].skip) i--;
  return Math.max(0, i);
}
