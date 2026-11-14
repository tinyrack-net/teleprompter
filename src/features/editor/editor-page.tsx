import { TRAlert } from '@tinyrack/ui/components/alert';
import { TRButton } from '@tinyrack/ui/components/button';
import { TRField } from '@tinyrack/ui/components/field';
import { TRIconButton } from '@tinyrack/ui/components/icon-button';
import { TRText } from '@tinyrack/ui/components/text';
import { TRTextarea } from '@tinyrack/ui/components/textarea';
import { PlayIcon, SettingsIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { SettingsDrawer } from '../../components/settings-drawer';
import { useI18n } from '../../i18n/i18n';
import { SAMPLE_SCRIPT } from '../../i18n/messages';
import { detectScriptLanguage } from '../../lib/language';
import { countSpoken, parseScript } from '../../lib/script';
import { isSpeechSupported } from '../../lib/speech';
import { useScript } from '../../state/settings-store';

export function EditorPage() {
  const { t, language } = useI18n();
  const [script, setScript] = useScript(SAMPLE_SCRIPT[language]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showEmpty, setShowEmpty] = useState(false);
  const navigate = useNavigate();

  const detected = useMemo(() => detectScriptLanguage(script) ?? language, [script, language]);
  const speechSupported = useMemo(() => isSpeechSupported(), []);

  const start = () => {
    if (countSpoken(parseScript(script)) === 0) {
      setShowEmpty(true);
      return;
    }
    navigate('/prompter');
  };

  return (
    <main className="editor">
      <header className="flex items-start justify-between gap-tinyrack-lg">
        <div className="flex flex-col gap-tinyrack-xs">
          <TRText as="h1" variant="headingLg">
            {t.appName}
          </TRText>
          <TRText as="p" color="muted">
            {t.tagline}
          </TRText>
        </div>
        <TRIconButton
          appearance="outline"
          aria-label={t.settings}
          title={t.settings}
          onClick={() => setSettingsOpen(true)}
        >
          <SettingsIcon aria-hidden="true" />
        </TRIconButton>
      </header>

      {speechSupported ? null : (
        <TRAlert.Root variant="warning">
          <TRAlert.Title>{t.unsupportedTitle}</TRAlert.Title>
          <TRAlert.Description>{t.unsupportedBody}</TRAlert.Description>
        </TRAlert.Root>
      )}

      <TRField.Root name="script" invalid={showEmpty} className="editor-field">
        <TRField.Label>{t.scriptLabel}</TRField.Label>
        <TRTextarea
          className="editor-textarea"
          value={script}
          placeholder={t.scriptPlaceholder}
          spellCheck={false}
          onChange={(event) => {
            setScript(event.currentTarget.value);
            setShowEmpty(false);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) start();
          }}
        />
        {showEmpty ? (
          <TRField.Error match>{t.emptyScript}</TRField.Error>
        ) : (
          <TRField.Description>{t.scriptHint}</TRField.Description>
        )}
      </TRField.Root>

      <footer className="flex justify-end">
        <TRButton intent="primary" uiSize="lg" onClick={start}>
          <PlayIcon aria-hidden="true" />
          {t.start}
        </TRButton>
      </footer>

      <SettingsDrawer
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        detectedSpeechLanguage={detected}
      />
    </main>
  );
}
