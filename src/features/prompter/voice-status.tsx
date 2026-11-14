import { TRText } from '@tinyrack/ui/components/text';
import { useI18n } from '../../i18n/i18n';
import type { VoiceStatus } from './use-voice-cursor';

interface VoiceStatusPillProps {
  status: VoiceStatus;
  heard: string;
}

/**
 * The only place voice problems are shown: a small pill in the top-left corner.
 * Transient interruptions show a short hint that disappears by itself once
 * audio is back, so nothing ever needs to be dismissed.
 */
export function VoiceStatusPill({ status, heard }: VoiceStatusPillProps) {
  const { t } = useI18n();

  const label = (() => {
    switch (status.kind) {
      case 'listening':
        return t.listening;
      case 'idle':
        return t.paused;
      case 'interrupted':
        return t.voiceInterrupted[status.reason];
      case 'denied':
        return t.voiceDenied;
      case 'unsupported':
        return t.voiceUnsupported;
    }
  })();

  const hint =
    status.kind === 'denied'
      ? t.micDeniedBody
      : status.kind === 'unsupported'
        ? t.unsupportedBody
        : undefined;

  return (
    <div className="prompter-status" data-state={status.kind} title={hint}>
      <span className="prompter-status-dot" aria-hidden="true" />
      {/* role=status announces changes politely without interrupting reading. */}
      <TRText variant="caption" className="prompter-status-state" role="status">
        {label}
      </TRText>
      {status.kind === 'listening' && heard ? (
        <TRText variant="caption" color="muted" truncate className="prompter-heard" title={t.heard}>
          {heard}
        </TRText>
      ) : null}
    </div>
  );
}
