import { describe, expect, it } from 'vitest';
import { match, similar, toSpokenWords } from './matcher';
import { countSpoken, nextSpoken, parseScript, prevSpoken, remapCursor } from './script';

const spoken = (s: string, locale = 'en') => toSpokenWords(s, locale);
const words = (s: string, locale = 'en') =>
  parseScript(s, locale)
    .filter((t) => !t.skip)
    .map((t) => t.text);

describe('parseScript', () => {
  it('keeps every character and marks notes, punctuation and breaks as skipped', () => {
    const tokens = parseScript('Hello, [smile here] world!\n\nNext line');
    expect(tokens.map((t) => t.text).join('')).toBe('Hello, [smile here] world!Next line');
    expect(tokens.filter((t) => !t.skip).map((t) => t.text)).toEqual([
      'Hello',
      'world',
      'Next',
      'line',
    ]);
    expect(tokens.find((t) => t.kind === 'note')?.text).toBe('[smile here]');
    expect(tokens.find((t) => t.kind === 'break')?.paragraph).toBe(true);
  });

  it('separates single newlines from paragraph breaks', () => {
    const tokens = parseScript('one\ntwo');
    expect(tokens.find((t) => t.kind === 'break')?.paragraph).toBe(false);
  });

  it('segments Japanese text without spaces', () => {
    expect(words('今日は新しいテレプロンプターを紹介します。', 'ja')).toEqual([
      '今日',
      'は',
      '新しい',
      'テレ',
      'プロンプター',
      'を',
      '紹介',
      'し',
      'ます',
    ]);
  });

  it('navigates between spoken words', () => {
    const tokens = parseScript('[note] a, b');
    const a = nextSpoken(tokens, 0);
    expect(tokens[a].text).toBe('a');
    const b = nextSpoken(tokens, a + 1);
    expect(tokens[b].text).toBe('b');
    expect(prevSpoken(tokens, b)).toBe(a);
    expect(prevSpoken(tokens, a)).toBe(a);
    expect(countSpoken(tokens)).toBe(2);
  });
});

describe('similar', () => {
  it('accepts partial words and Korean particles', () => {
    expect(similar('teleprompter', 'teleprompter')).toBe(true);
    expect(similar('telepromp', 'teleprompter')).toBe(true);
    expect(similar('웹용', '웹용으로')).toBe(true);
    expect(similar('a', 'an')).toBe(false);
    expect(similar('cat', 'category')).toBe(false);
  });
});

describe('match', () => {
  const tokens = parseScript('the quick brown fox jumps over the lazy dog');
  const at = (i: number | null) => (i === null ? null : tokens[i]?.text);

  it('advances to the word after the last spoken word', () => {
    expect(at(match(tokens, 0, spoken('the quick')))).toBe('brown');
  });

  it('does not jump to a later repeat of an already matched word', () => {
    const afterThe = nextSpoken(tokens, 1);
    expect(match(tokens, afterThe, spoken('the'))).toBeNull();
  });

  it('prefers the longest aligned run', () => {
    const atOver = tokens.findIndex((t) => t.text === 'over');
    expect(at(match(tokens, atOver, spoken('jumps over the')))).toBe('lazy');
  });

  it('ignores a lone far word but follows a far multi-word run', () => {
    const long = parseScript('one two three four five six seven eight nine ten');
    expect(match(long, 0, spoken('eight'))).toBeNull();
    expect(long[match(long, 0, spoken('seven eight')) ?? -1]?.text).toBe('nine');
  });

  it('skips notes and punctuation when advancing', () => {
    const t = parseScript('hello, [pause] world');
    expect(t[match(t, 0, spoken('hello')) ?? -1]?.text).toBe('world');
  });

  it('works with Korean text', () => {
    const t = parseScript('안녕하세요 오늘은 웹용 텔레프롬프터를 소개합니다', 'ko');
    expect(t[match(t, 0, spoken('안녕하세요 오늘은', 'ko')) ?? -1]?.text).toBe('웹용');
    const atWeb = t.findIndex((x) => x.text === '웹용');
    expect(t[match(t, atWeb, spoken('오늘은 웹용 텔레프롬프터', 'ko')) ?? -1]?.text).toBe(
      '소개합니다',
    );
  });

  it('works with Japanese text', () => {
    const t = parseScript('今日は新しいテレプロンプターを紹介します', 'ja');
    const next = match(t, 0, spoken('今日は新しい', 'ja'));
    expect(t[next ?? -1]?.text).toBe('テレ');
  });
});

describe('remapCursor', () => {
  const cursorOn = (tokens: ReturnType<typeof parseScript>, word: string) =>
    tokens.findIndex((t) => t.text === word);
  const remap = (before: string, after: string, word: string) => {
    const a = parseScript(before);
    const b = parseScript(after);
    const next = remapCursor(a, b, cursorOn(a, word));
    return b[next]?.text ?? '<end>';
  };

  it('keeps the word when text is edited after it', () => {
    expect(remap('one two three four', 'one two three four five', 'three')).toBe('three');
  });

  it('keeps the word when text is inserted before it', () => {
    expect(remap('one two three four', 'zero, one two three four', 'three')).toBe('three');
    expect(remap('one two three four', 'one two\n\nthree four', 'three')).toBe('three');
  });

  it('keeps the word when text is removed before it', () => {
    expect(remap('one two three four', 'one three four', 'three')).toBe('three');
  });

  it('moves to the start of the edit when the word itself changes', () => {
    expect(remap('one two three four', 'one two TRES four', 'three')).toBe('TRES');
  });

  it('handles an end-of-script cursor and an emptied script', () => {
    const a = parseScript('one two');
    expect(remapCursor(a, parseScript('one two three'), a.length)).toBe(
      parseScript('one two three').findIndex((t) => t.text === 'three'),
    );
    expect(remapCursor(a, parseScript(''), 0)).toBe(0);
  });
});

describe('remapCursor with surrounding edits', () => {
  const remap = (before: string, after: string, word: string) => {
    const a = parseScript(before);
    const b = parseScript(after);
    const next = remapCursor(
      a,
      b,
      a.findIndex((t) => t.text === word),
    );
    return b[next]?.text ?? '<end>';
  };

  it('finds the word by context when text is added on both sides', () => {
    expect(remap('one two three four five', 'intro. one two three four five. outro', 'three')).toBe(
      'three',
    );
  });

  it('does not jump to an unrelated occurrence of a common word', () => {
    expect(remap('a b the c d', 'x the y z w', 'the')).toBe('x');
  });
});
