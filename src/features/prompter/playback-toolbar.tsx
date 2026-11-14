import { TRToolbar } from '@tinyrack/ui/components/toolbar';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MaximizeIcon,
  MicIcon,
  MicOffIcon,
  MinimizeIcon,
  RotateCcwIcon,
  SettingsIcon,
} from 'lucide-react';
import { useI18n } from '../../i18n/i18n';

interface PlaybackToolbarProps {
  listening: boolean;
  canListen: boolean;
  onRestart: () => void;
  onPrev: () => void;
  onToggle: () => void;
  onNext: () => void;
  onSettings: () => void;
  /** Omitted when the browser cannot go fullscreen (e.g. iPhone Safari). */
  fullscreen?: { active: boolean; onToggle: () => void };
}

/** Floating, semi-transparent playback controls at the bottom of the prompter. */
export function PlaybackToolbar(props: PlaybackToolbarProps) {
  const { t } = useI18n();
  return (
    <div className="prompter-dock">
      <TRToolbar.Root aria-label={t.playback} className="prompter-toolbar">
        <TRToolbar.Button
          aria-label={t.restart}
          title={`${t.restart} (Home)`}
          onClick={props.onRestart}
        >
          <RotateCcwIcon aria-hidden="true" />
        </TRToolbar.Button>
        <TRToolbar.Button
          aria-label={t.previousWord}
          title={`${t.previousWord} (←)`}
          onClick={props.onPrev}
        >
          <ChevronLeftIcon aria-hidden="true" />
        </TRToolbar.Button>
        <TRToolbar.Button
          aria-label={props.listening ? t.stopListening : t.listen}
          aria-pressed={props.listening}
          title={`${props.listening ? t.stopListening : t.listen} (Space)`}
          className="prompter-mic"
          data-listening={props.listening ? '' : undefined}
          disabled={!props.canListen}
          onClick={props.onToggle}
        >
          {props.listening ? <MicIcon aria-hidden="true" /> : <MicOffIcon aria-hidden="true" />}
        </TRToolbar.Button>
        <TRToolbar.Button
          aria-label={t.nextWord}
          title={`${t.nextWord} (→)`}
          onClick={props.onNext}
        >
          <ChevronRightIcon aria-hidden="true" />
        </TRToolbar.Button>
        <TRToolbar.Separator orientation="vertical" />
        {props.fullscreen ? (
          <TRToolbar.Button
            aria-label={props.fullscreen.active ? t.exitFullscreen : t.enterFullscreen}
            aria-pressed={props.fullscreen.active}
            title={`${props.fullscreen.active ? t.exitFullscreen : t.enterFullscreen} (F)`}
            onClick={props.fullscreen.onToggle}
          >
            {props.fullscreen.active ? (
              <MinimizeIcon aria-hidden="true" />
            ) : (
              <MaximizeIcon aria-hidden="true" />
            )}
          </TRToolbar.Button>
        ) : null}
        <TRToolbar.Button
          aria-label={t.settings}
          title={`${t.settings} (S)`}
          onClick={props.onSettings}
        >
          <SettingsIcon aria-hidden="true" />
        </TRToolbar.Button>
      </TRToolbar.Root>
    </div>
  );
}
