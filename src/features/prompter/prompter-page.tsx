import { TRAlert } from '@tinyrack/ui/components/alert';
import { TRButton } from '@tinyrack/ui/components/button';
import { TRProgress } from '@tinyrack/ui/components/progress';
import { TRText } from '@tinyrack/ui/components/text';
import { PencilIcon } from 'lucide-react';
import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import { SettingsDrawer } from '../../components/settings-drawer';
import { useI18n } from '../../i18n/i18n';
import { SAMPLE_SCRIPT } from '../../i18n/messages';
import { detectScriptLanguage, resolveLanguage, SPEECH_LOCALE } from '../../lib/language';
import { countSpoken, parseScript } from '../../lib/script';
import { useScript, useSettings } from '../../state/settings-store';
import { PlaybackToolbar } from './playback-toolbar';
import { ScriptView } from './script-view';
import { useVoiceCursor } from './use-voice-cursor';

/**
 * The app's only screen. It opens paused: recognition starts from the mic
 * button, so the permission prompt follows a user gesture (required by iOS
 * Safari and less surprising everywhere else).
 */
export function PrompterPage() {
  const { t, language: uiLanguage } = useI18n();
  const [script] = useScript(SAMPLE_SCRIPT[uiLanguage]);
  const [settings] = useSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const rootRef = useRef<HTMLElement>(null);

  const detected = useMemo(() => detectScriptLanguage(script) ?? uiLanguage, [script, uiLanguage]);
  const speechLanguage = resolveLanguage(settings.speechLanguage, () => detected);
  const locale = SPEECH_LOCALE[speechLanguage];
  const tokens = useMemo(() => parseScript(script, speechLanguage), [script, speechLanguage]);
  const total = useMemo(() => countSpoken(tokens), [tokens]);
  const empty = total === 0;

  const voice = useVoiceCursor(tokens, locale);
  const { stop, toggle, next, prev, restart } = voice;

  // An emptied script has nothing to follow.
  useEffect(() => {
    if (empty) stop();
  }, [empty, stop]);

  // Keyboard shortcuts (ignored while the settings drawer is open).
  useEffect(() => {
    if (settingsOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest('input, select, textarea')) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const action = keyAction(e.key, {
        toggle: () => !empty && toggle(),
        next,
        prev,
        restart,
        settings: () => setSettingsOpen(true),
      });
      if (!action) return;
      e.preventDefault();
      // The toolbar uses arrow keys to move between its buttons; the prompter
      // shortcuts take priority so they work after clicking a toolbar button.
      e.stopPropagation();
      action();
    };
    // Capture phase: run before focused widgets (the toolbar) handle the key.
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, [settingsOpen, empty, toggle, next, prev, restart]);

  const done = countSpoken(tokens, voice.cursor);
  const style = {
    '--prompter-font-size': `${settings.fontSize}px`,
    '--prompter-margin-x': `${settings.marginX}vw`,
    '--prompter-margin-y': `${settings.marginY}vh`,
  } as CSSProperties;

  return (
    <main
      ref={rootRef}
      className="prompter"
      style={style}
      data-mirror={settings.mirror ? '' : undefined}
      // Focus target after the settings drawer closes, so shortcuts keep working.
      tabIndex={-1}
    >
      <TRProgress.Root
        className="prompter-progress"
        aria-label={t.progress}
        value={done}
        max={Math.max(total, 1)}
      >
        <TRProgress.Track>
          <TRProgress.Indicator />
        </TRProgress.Track>
      </TRProgress.Root>

      {empty ? (
        <div className="prompter-empty">
          <TRText as="h1" variant="headingLg">
            {t.emptyTitle}
          </TRText>
          <TRText as="p" color="muted">
            {t.emptyBody}
          </TRText>
          <TRButton intent="primary" onClick={() => setSettingsOpen(true)}>
            <PencilIcon aria-hidden="true" />
            {t.editScript}
          </TRButton>
        </div>
      ) : (
        <div className="prompter-scroller" data-scroller="">
          <div className="prompter-reading-line" aria-hidden="true" />
          <ScriptView
            tokens={tokens}
            cursor={voice.cursor}
            language={speechLanguage}
            wrap={settings.lineWrap}
            onWordClick={voice.jumpTo}
          />
        </div>
      )}

      {voice.error ? (
        <div className="prompter-alert">
          <TRAlert.Root
            variant={voice.error.code === 'unsupported' ? 'warning' : 'danger'}
            role="alert"
          >
            <TRAlert.Title>
              {voice.error.code === 'unsupported'
                ? t.unsupportedTitle
                : voice.error.code === 'denied'
                  ? t.micDeniedTitle
                  : t.speechErrorTitle}
            </TRAlert.Title>
            <TRAlert.Description>
              {voice.error.code === 'unsupported'
                ? t.unsupportedBody
                : voice.error.code === 'denied'
                  ? t.micDeniedBody
                  : t.speechErrorBody(voice.error.detail ?? '')}
            </TRAlert.Description>
            <TRAlert.Actions>
              <TRButton appearance="outline" uiSize="sm" onClick={voice.dismissError}>
                {t.dismiss}
              </TRButton>
            </TRAlert.Actions>
          </TRAlert.Root>
        </div>
      ) : null}

      <div className="prompter-status" aria-live="polite">
        <TRText variant="caption" color="muted" className="prompter-status-state">
          {voice.listening ? t.listening : t.paused}
        </TRText>
        {voice.heard ? (
          <TRText
            variant="caption"
            color="muted"
            truncate
            className="prompter-heard"
            title={t.heard}
          >
            {voice.heard}
          </TRText>
        ) : null}
      </div>

      <PlaybackToolbar
        listening={voice.listening}
        canListen={!empty && voice.error?.code !== 'unsupported'}
        onRestart={restart}
        onPrev={prev}
        onToggle={toggle}
        onNext={next}
        onSettings={() => setSettingsOpen(true)}
      />

      <SettingsDrawer
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        detectedSpeechLanguage={detected}
        focusScript={empty}
        returnFocus={rootRef}
      />
    </main>
  );
}

type PrompterActions = Record<'toggle' | 'next' | 'prev' | 'restart' | 'settings', () => void>;

function keyAction(key: string, actions: PrompterActions): (() => void) | null {
  switch (key) {
    case ' ':
      return actions.toggle;
    case 'ArrowRight':
    case 'ArrowDown':
      return actions.next;
    case 'ArrowLeft':
    case 'ArrowUp':
      return actions.prev;
    case 'Home':
      return actions.restart;
    case ',':
    case 's':
    case 'S':
      return actions.settings;
    default:
      return null;
  }
}
