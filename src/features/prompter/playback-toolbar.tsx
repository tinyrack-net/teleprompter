import { TRToolbar } from '@tinyrack/ui/components/toolbar';
import {
  ArrowLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MicIcon,
  MicOffIcon,
  RotateCcwIcon,
  SettingsIcon,
} from 'lucide-react';
import { useI18n } from '../../i18n/i18n';

interface PlaybackToolbarProps {
  listening: boolean;
  canListen: boolean;
  onBack: () => void;
  onRestart: () => void;
  onPrev: () => void;
  onToggle: () => void;
  onNext: () => void;
  onSettings: () => void;
}

/** Floating, semi-transparent playback controls at the bottom of the prompter. */
export function PlaybackToolbar(props: PlaybackToolbarProps) {
  const { t } = useI18n();
  return (
    <div className="prompter-dock">
      <TRToolbar.Root aria-label={t.playback} className="prompter-toolbar">
        <TRToolbar.Button aria-label={t.backToEditor} title={t.backToEditor} onClick={props.onBack}>
          <ArrowLeftIcon aria-hidden="true" />
        </TRToolbar.Button>
        <TRToolbar.Separator orientation="vertical" />
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
        <TRToolbar.Button aria-label={t.settings} title={t.settings} onClick={props.onSettings}>
          <SettingsIcon aria-hidden="true" />
        </TRToolbar.Button>
      </TRToolbar.Root>
    </div>
  );
}
