import { memo, useEffect, useLayoutEffect, useRef } from 'react';
import type { Token } from '../../lib/script';

interface ScriptViewProps {
  tokens: Token[];
  cursor: number;
  language: string;
  onWordClick: (index: number) => void;
}

/**
 * Renders the script once and updates word states directly on the DOM, so a
 * cursor move costs O(distance moved) instead of re-rendering every word.
 */
export function ScriptView({ tokens, cursor, language, onWordClick }: ScriptViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previous = useRef<number | null>(null);

  // Apply past/current state for the range that changed.
  useLayoutEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const nodes = root.querySelectorAll<HTMLElement>('[data-index]');
    const prev = previous.current;
    const from = prev === null ? 0 : Math.min(prev, cursor);
    const to = prev === null ? nodes.length - 1 : Math.max(prev, cursor);
    for (let i = from; i <= to && i < nodes.length; i++) {
      const node = nodes[i];
      node.toggleAttribute('data-past', i < cursor);
      node.toggleAttribute('data-current', i === cursor);
    }
    previous.current = cursor;
  }, [cursor]);

  // A new script renders fresh nodes; reapply every state.
  // biome-ignore lint/correctness/useExhaustiveDependencies: tokens identity is the trigger
  useLayoutEffect(() => {
    previous.current = null;
  }, [tokens]);

  // Keep the current word on the reading line.
  useEffect(() => {
    const root = containerRef.current;
    const scroller = root?.closest<HTMLElement>('[data-scroller]');
    if (!root || !scroller) return;
    const nodes = root.querySelectorAll<HTMLElement>('[data-index]');
    const target = nodes[Math.min(cursor, nodes.length - 1)];
    if (!target) return;
    const line = scroller.clientHeight * 0.35;
    scroller.scrollTo({ top: target.offsetTop - line, behavior: 'smooth' });
  }, [cursor]);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: words are also reachable with the arrow keys
    // biome-ignore lint/a11y/noStaticElementInteractions: click delegation for every word
    <div
      ref={containerRef}
      className="prompter-text"
      data-lang={language}
      onClick={(event) => {
        const el = (event.target as HTMLElement).closest<HTMLElement>('[data-word]');
        if (el?.dataset.index) onWordClick(Number(el.dataset.index));
      }}
    >
      <Tokens tokens={tokens} />
    </div>
  );
}

const Tokens = memo(function Tokens({ tokens }: { tokens: Token[] }) {
  return tokens.map((token, i) => {
    switch (token.kind) {
      case 'break':
        return (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: tokens are positional
            key={i}
            data-index={i}
            className={token.paragraph ? 'prompter-paragraph' : 'prompter-line'}
          />
        );
      case 'word':
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: tokens are positional
          <span key={i} data-index={i} data-word="" className="prompter-word">
            {token.text}
          </span>
        );
      case 'note':
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: tokens are positional
          <span key={i} data-index={i} className="prompter-note">
            {token.text}
          </span>
        );
      default:
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: tokens are positional
          <span key={i} data-index={i}>
            {token.text}
          </span>
        );
    }
  });
});
