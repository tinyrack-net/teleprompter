import { TRAlert } from '@tinyrack/ui/components/alert';
import { TRButton } from '@tinyrack/ui/components/button';
import { TRIconButton } from '@tinyrack/ui/components/icon-button';
import { TRProgress } from '@tinyrack/ui/components/progress';
import { TRText } from '@tinyrack/ui/components/text';
import { SettingsIcon } from 'lucide-react';
import { type CSSProperties, useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { SettingsDrawer } from '../../components/settings-drawer';
import { useI18n } from '../../i18n/i18n';
import { SAMPLE_SCRIPT } from '../../i18n/messages';
import { detectScriptLanguage, resolveLanguage, SPEECH_LOCALE } from '../../lib/language';
import { countSpoken, parseScript } from '../../lib/script';
import { useScript, useSettings } from '../../state/settings-store';
import { PlaybackToolbar } from './playback-toolbar';
import { ScriptView } from './script-view';
import { useVoiceCursor } from './use-voice-cursor';

export function PrompterPage() {
  const { t, language: uiLanguage } = useI18n();
  const [script] = useScript(SAMPLE_SCRIPT[uiLanguage]);
  const [settings] = useSettings();
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const detected = useMemo(() => detectScriptLanguage(script) ?? uiLanguage, [script, uiLanguage]);
  const speechLanguage = resolveLanguage(settings.speechLanguage, () => detected);
  const locale = SPEECH_LOCALE[speechLanguage];
  const tokens = useMemo(() => parseScript(script, speechLanguage), [script, speechLanguage]);
  const total = useMemo(() => countSpoken(tokens), [tokens]);

  const voice = useVoiceCursor(tokens, locale);
  const { start, stop, toggle, next, prev, restart } = voice;

  // Start listening as soon as the prompter opens.
  // biome-ignore lint/correctness/useExhaustiveDependencies: run once on mount
  useEffect(() => {
    start();
    return () => stop();
  }, []);

  // Keyboard shortcuts (ignored while the settings drawer is open).
  useEffect(() => {
    if (settingsOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest('input, select, textarea')) return;
      const action = keyAction(e.key, { toggle, next, prev, restart, back: () => navigate('/') });
      if (!action) return;
      e.preventDefault();
      action();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [settingsOpen, toggle, next, prev, restart, navigate]);

  if (total === 0) return <Navigate to="/" replace />;

  const done = countSpoken(tokens, voice.cursor);
  const style = {
    '--prompter-font-size': `${settings.fontSize}px`,
    '--prompter-margin-x': `${settings.marginX}vw`,
    '--prompter-margin-y': `${settings.marginY}vh`,
  } as CSSProperties;

  return (
    <main className="prompter" style={style} data-mirror={settings.mirror ? '' : undefined}>
      <TRProgress.Root
        className="prompter-progress"
        aria-label={t.progress}
        value={done}
        max={total}
      >
        <TRProgress.Track>
          <TRProgress.Indicator />
        </TRProgress.Track>
      </TRProgress.Root>

      <div className="prompter-scroller" data-scroller="">
        <div className="prompter-reading-line" aria-hidden="true" />
        <ScriptView
          tokens={tokens}
          cursor={voice.cursor}
          language={speechLanguage}
          onWordClick={voice.jumpTo}
        />
      </div>

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

      <TRIconButton
        className="prompter-fab"
        appearance="ghost"
        aria-label={t.settings}
        title={t.settings}
        onClick={() => setSettingsOpen(true)}
      >
        <SettingsIcon aria-hidden="true" />
      </TRIconButton>

      <PlaybackToolbar
        listening={voice.listening}
        canListen={voice.error?.code !== 'unsupported'}
        onBack={() => navigate('/')}
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
      />
    </main>
  );
}

type PrompterActions = Record<'toggle' | 'next' | 'prev' | 'restart' | 'back', () => void>;

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
    case 'Escape':
      return actions.back;
    default:
      return null;
  }
}
