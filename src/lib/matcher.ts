import { nextSpoken, segmentWords, type Token } from './script';

export interface MatchOptions {
  /** How many spoken script words ahead of the cursor may be matched. */
  lookahead: number;
  /** Within this distance a single matching word is enough to advance. */
  nearWindow: number;
  /** Matches further than nearWindow need at least this many consecutive words. */
  farMinRun: number;
  /** How many trailing transcript words are used for alignment. */
  tailWords: number;
}

export const defaultMatchOptions: MatchOptions = {
  lookahead: 12,
  nearWindow: 4,
  farMinRun: 2,
  tailWords: 8,
};

/** Loose word equality that tolerates partial interim words and suffixes (e.g. Korean particles). */
export function similar(a: string, b: string): boolean {
  if (a === b) return true;
  const short = a.length <= b.length ? a : b;
  const long = a.length <= b.length ? b : a;
  return short.length >= 2 && long.startsWith(short) && short.length / long.length >= 0.5;
}

/** Splits a recognizer transcript into normalized words, using the same segmentation as the script. */
export function toSpokenWords(transcript: string, locale = 'en'): string[] {
  return segmentWords(transcript, locale);
}

/**
 * Aligns the tail of what was spoken with the script around the cursor.
 *
 * `cursor` is the index of the next token to read. Each candidate script
 * position is scored by how many consecutive words ending there match the
 * end of the transcript. The position just before the cursor ("stay") is a
 * candidate too, so a transcript that already matched does not cause the
 * cursor to jump to a later repeat of the same word.
 *
 * Returns the new cursor, or null when the cursor should not move.
 */
export function match(
  tokens: Token[],
  cursor: number,
  spoken: string[],
  options: MatchOptions = defaultMatchOptions,
): number | null {
  const tail = spoken.slice(-options.tailWords);
  if (tail.length === 0) return null;

  const spokenIdx: number[] = [];
  tokens.forEach((t, i) => {
    if (!t.skip) spokenIdx.push(i);
  });
  if (spokenIdx.length === 0) return null;

  let p = spokenIdx.findIndex((i) => i >= cursor);
  if (p === -1) p = spokenIdx.length;

  const scoreAt = (q: number): number => {
    let k = 0;
    while (
      q - k >= 0 &&
      tail.length - 1 - k >= 0 &&
      similar(tokens[spokenIdx[q - k]].clean, tail[tail.length - 1 - k])
    ) {
      k++;
    }
    return k;
  };

  let best = -1;
  let bestScore = 0;

  // "Stay" candidate: the word that was matched last.
  if (p > 0) {
    bestScore = scoreAt(p - 1);
    best = p - 1;
  }

  const end = Math.min(p + options.lookahead, spokenIdx.length);
  for (let q = p; q < end; q++) {
    const score = scoreAt(q);
    if (score === 0) continue;
    if (q - p >= options.nearWindow && score < options.farMinRun) continue;
    // Strictly greater: ties keep the earlier (nearer) candidate.
    if (score > bestScore) {
      best = q;
      bestScore = score;
    }
  }

  if (bestScore === 0 || best < p) return null;
  return nextSpoken(tokens, spokenIdx[best] + 1);
}
