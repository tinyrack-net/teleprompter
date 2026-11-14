import { TRButton } from '@tinyrack/ui/components/button';
import { TRDrawer } from '@tinyrack/ui/components/drawer';
import { TRField } from '@tinyrack/ui/components/field';
import { TRIconButton } from '@tinyrack/ui/components/icon-button';
import { TRNativeSelect } from '@tinyrack/ui/components/native-select';
import { TRSeparator } from '@tinyrack/ui/components/separator';
import { TRSlider } from '@tinyrack/ui/components/slider';
import { TRSwitch } from '@tinyrack/ui/components/switch';
import { TRText } from '@tinyrack/ui/components/text';
import { XIcon } from 'lucide-react';
import { useI18n } from '../i18n/i18n';
import {
  detectBrowserLanguage,
  isLanguagePreference,
  LANGUAGE_NATIVE_NAME,
  LANGUAGES,
  type Language,
  type LanguagePreference,
} from '../lib/language';
import { DEFAULT_SETTINGS, RANGES } from '../lib/settings';
import { useSettings } from '../state/settings-store';

interface SettingsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Language detected from the current script, shown next to "Auto-detect". */
  detectedSpeechLanguage: Language;
}

export function SettingsDrawer({
  open,
  onOpenChange,
  detectedSpeechLanguage,
}: SettingsDrawerProps) {
  const { t } = useI18n();
  const [settings, update] = useSettings();

  return (
    <TRDrawer.Root open={open} onOpenChange={onOpenChange} swipeDirection="right">
      <TRDrawer.Portal>
        <TRDrawer.Backdrop />
        <TRDrawer.Viewport>
          <TRDrawer.Popup data-testid="settings">
            <TRDrawer.Content className="flex flex-col gap-tinyrack-lg">
              <header className="flex items-start justify-between gap-tinyrack-md">
                <div className="flex flex-col gap-tinyrack-2xs">
                  <TRDrawer.Title>{t.settings}</TRDrawer.Title>
                  <TRDrawer.Description>{t.settingsDescription}</TRDrawer.Description>
                </div>
                <TRDrawer.Close
                  render={
                    <TRIconButton appearance="ghost" aria-label={t.close}>
                      <XIcon aria-hidden="true" />
                    </TRIconButton>
                  }
                />
              </header>

              <section className="flex flex-col gap-tinyrack-md">
                <TRText as="h3" variant="label" color="muted">
                  {t.sectionLanguage}
                </TRText>
                <LanguageField
                  label={t.uiLanguage}
                  name="uiLanguage"
                  value={settings.uiLanguage}
                  detected={detectBrowserLanguage()}
                  onChange={(uiLanguage) => update({ uiLanguage })}
                />
                <LanguageField
                  label={t.speechLanguage}
                  name="speechLanguage"
                  description={t.speechLanguageHint}
                  value={settings.speechLanguage}
                  detected={detectedSpeechLanguage}
                  onChange={(speechLanguage) => update({ speechLanguage })}
                />
              </section>

              <TRSeparator />

              <section className="flex flex-col gap-tinyrack-md">
                <TRText as="h3" variant="label" color="muted">
                  {t.sectionDisplay}
                </TRText>
                <RangeField
                  label={t.fontSize}
                  name="fontSize"
                  unit="px"
                  value={settings.fontSize}
                  range={RANGES.fontSize}
                  onChange={(fontSize) => update({ fontSize })}
                />
                <RangeField
                  label={t.marginX}
                  name="marginX"
                  unit="%"
                  value={settings.marginX}
                  range={RANGES.marginX}
                  onChange={(marginX) => update({ marginX })}
                />
                <RangeField
                  label={t.marginY}
                  name="marginY"
                  unit="%"
                  value={settings.marginY}
                  range={RANGES.marginY}
                  onChange={(marginY) => update({ marginY })}
                />
                <TRField.Root>
                  <TRField.Item className="items-center">
                    <TRSwitch.Root
                      name="mirror"
                      checked={settings.mirror}
                      onCheckedChange={(mirror) => update({ mirror })}
                    >
                      <TRSwitch.Thumb />
                    </TRSwitch.Root>
                    <TRField.Label>{t.mirror}</TRField.Label>
                  </TRField.Item>
                  <TRField.Description>{t.mirrorHint}</TRField.Description>
                </TRField.Root>
              </section>

              <TRSeparator />

              <TRButton
                appearance="outline"
                onClick={() =>
                  update({
                    fontSize: DEFAULT_SETTINGS.fontSize,
                    marginX: DEFAULT_SETTINGS.marginX,
                    marginY: DEFAULT_SETTINGS.marginY,
                    mirror: DEFAULT_SETTINGS.mirror,
                  })
                }
              >
                {t.resetSettings}
              </TRButton>
            </TRDrawer.Content>
          </TRDrawer.Popup>
        </TRDrawer.Viewport>
      </TRDrawer.Portal>
    </TRDrawer.Root>
  );
}

function LanguageField(props: {
  label: string;
  name: string;
  description?: string;
  value: LanguagePreference;
  detected: Language;
  onChange: (value: LanguagePreference) => void;
}) {
  const { t } = useI18n();
  return (
    <TRField.Root name={props.name}>
      <TRField.Label>{props.label}</TRField.Label>
      <TRNativeSelect
        value={props.value}
        onChange={(event) => {
          const next = event.currentTarget.value;
          if (isLanguagePreference(next)) props.onChange(next);
        }}
      >
        <option value="auto">{t.languageAutoResolved(LANGUAGE_NATIVE_NAME[props.detected])}</option>
        {LANGUAGES.map((lang) => (
          <option key={lang} value={lang}>
            {LANGUAGE_NATIVE_NAME[lang]}
          </option>
        ))}
      </TRNativeSelect>
      {props.description ? <TRField.Description>{props.description}</TRField.Description> : null}
    </TRField.Root>
  );
}

function RangeField(props: {
  label: string;
  name: string;
  unit: string;
  value: number;
  range: { min: number; max: number; step: number };
  onChange: (value: number) => void;
}) {
  return (
    <TRSlider.Root
      name={props.name}
      value={props.value}
      min={props.range.min}
      max={props.range.max}
      step={props.range.step}
      onValueChange={(value) => props.onChange(value)}
    >
      <TRSlider.Label>{props.label}</TRSlider.Label>
      <TRSlider.Value>{(formatted) => `${formatted[0]}${props.unit}`}</TRSlider.Value>
      {/*
        A horizontal slider drag would otherwise also swipe the drawer, which
        is dismissed by swiping right. This opts the control out of swipe dismissal.
      */}
      <TRSlider.Control data-base-ui-swipe-ignore="">
        <TRSlider.Track>
          <TRSlider.Indicator />
        </TRSlider.Track>
        <TRSlider.Thumb aria-label={props.label} />
      </TRSlider.Control>
    </TRSlider.Root>
  );
}
