import { describe, expect, it } from 'vitest';
import { match, similar, toSpokenWords } from './matcher';
import { parseScript } from './script';

const spoken = (s: string) => toSpokenWords(s);

describe('parseScript', () => {
  it('marks bracket notes and breaks as skipped', () => {
    const tokens = parseScript('Hello [smile here] world\n\nNext line');
    expect(tokens.map((t) => [t.text, t.skip])).toEqual([
      ['Hello', false],
      ['[smile', true],
      ['here]', true],
      ['world', false],
      ['', true],
      ['Next', false],
      ['line', false],
    ]);
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

  it('advances to the word after the last spoken word', () => {
    expect(match(tokens, 0, spoken('the quick'))).toBe(2);
  });

  it('does not jump to a later repeat of an already matched word', () => {
    // cursor is after "the" (index 1); transcript still ends with "the"
    expect(match(tokens, 1, spoken('the'))).toBeNull();
  });

  it('prefers the longest aligned run', () => {
    // "over the" should match the second "the", not stay
    expect(match(tokens, 5, spoken('jumps over the'))).toBe(7);
  });

  it('ignores a lone far word but follows a far multi-word run', () => {
    const long = parseScript('one two three four five six seven eight nine ten');
    expect(match(long, 0, spoken('eight'))).toBeNull();
    expect(match(long, 0, spoken('seven eight'))).toBe(8);
  });

  it('skips bracket notes when advancing', () => {
    const t = parseScript('hello [pause] world');
    expect(match(t, 0, spoken('hello'))).toBe(2);
  });

  it('works with Korean text', () => {
    const t = parseScript('안녕하세요 오늘은 웹용 텔레프롬프터를 소개합니다');
    expect(match(t, 0, spoken('안녕하세요 오늘은'))).toBe(2);
    expect(match(t, 2, spoken('오늘은 웹용 텔레프롬프터'))).toBe(4);
  });
});
