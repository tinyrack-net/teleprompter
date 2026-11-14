import { expect, type Page, test } from '@playwright/test';

/** Replaces the Web Speech API with a fake that tests can drive via `say()`. */
async function installFakeSpeech(page: Page) {
  await page.addInitScript(() => {
    const w = window as any;
    w.__recognitionLangs = [];
    class FakeRecognition {
      lang = '';
      continuous = false;
      interimResults = false;
      onresult: ((e: unknown) => void) | null = null;
      onerror: ((e: unknown) => void) | null = null;
      onend: (() => void) | null = null;
      constructor() {
        w.__recognition = this;
      }
      start() {
        w.__recognitionLangs.push(this.lang);
      }
      stop() {}
      abort() {}
    }
    w.SpeechRecognition = FakeRecognition;
    w.__say = (text: string) => {
      w.__recognition?.onresult?.({ results: [[{ transcript: text }]] });
    };
  });
}

const say = (page: Page, text: string) => page.evaluate((t) => (window as any).__say(t), text);
const lastRecognitionLang = (page: Page) =>
  page.evaluate(() => (window as any).__recognitionLangs.at(-1) as string | undefined);

const SCRIPT = 'Hello everyone and welcome.\nToday we [smile] talk about teleprompters.';

test.use({ locale: 'en-US' });

test.beforeEach(async ({ page }) => {
  await installFakeSpeech(page);
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

async function openPrompter(page: Page, script = SCRIPT) {
  await page.getByRole('textbox', { name: 'Script' }).fill(script);
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page).toHaveURL(/\/prompter$/);
}

test('editor loads with controls', async ({ page }) => {
  await expect(page).toHaveTitle('Teleprompter');
  await expect(page.getByRole('heading', { name: 'Teleprompter' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Script' })).not.toBeEmpty();
  await expect(page.getByRole('button', { name: 'Start' })).toBeEnabled();
});

test('highlight follows speech and skips bracket notes', async ({ page }) => {
  await openPrompter(page);
  const current = page.locator('[data-current]');
  await expect(current).toHaveText('Hello');
  await expect.poll(() => lastRecognitionLang(page)).toBe('en-US');

  await say(page, 'hello everyone');
  await expect(current).toHaveText('and');

  await say(page, 'hello everyone and welcome today we');
  await expect(current).toHaveText('talk');
  await expect(page.locator('.prompter-note')).toHaveText('[smile]');
  await expect(page.getByRole('progressbar', { name: 'Reading progress' })).toHaveAttribute(
    'aria-valuenow',
    '6',
  );
});

test('floating playback controls work', async ({ page }) => {
  await openPrompter(page);
  const toolbar = page.getByRole('toolbar', { name: 'Playback controls' });
  const current = page.locator('[data-current]');

  await toolbar.getByRole('button', { name: 'Next word' }).click();
  await expect(current).toHaveText('everyone');
  await toolbar.getByRole('button', { name: 'Previous word' }).click();
  await expect(current).toHaveText('Hello');

  await page.locator('.prompter-word', { hasText: 'Today' }).click();
  await expect(current).toHaveText('Today');
  await toolbar.getByRole('button', { name: 'Restart' }).click();
  await expect(current).toHaveText('Hello');

  const mic = toolbar.getByRole('button', { name: 'Stop listening' });
  await mic.click();
  await expect(toolbar.getByRole('button', { name: 'Start listening' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );

  await toolbar.getByRole('button', { name: 'Back to editor' }).click();
  await expect(page).toHaveURL(/\/$/);
});

test('keyboard shortcuts navigate the script', async ({ page }) => {
  await openPrompter(page);
  const current = page.locator('[data-current]');
  await page.keyboard.press('ArrowRight');
  await expect(current).toHaveText('everyone');
  await page.keyboard.press('Home');
  await expect(current).toHaveText('Hello');
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/\/$/);
});

test('settings open from the floating button and toolbar inside the prompter', async ({ page }) => {
  await openPrompter(page);

  await page.locator('.prompter-fab').click();
  const drawer = page.getByRole('dialog', { name: 'Settings' });
  await expect(drawer).toBeVisible();
  await drawer.getByRole('button', { name: 'Close' }).click();
  await expect(drawer).toBeHidden();

  await page
    .getByRole('toolbar', { name: 'Playback controls' })
    .getByRole('button', { name: 'Settings' })
    .click();
  await expect(drawer).toBeVisible();

  // Margins apply to the prompter immediately.
  const marginX = drawer.getByRole('slider', { name: 'Left and right margin' });
  await marginX.focus();
  await page.keyboard.press('End');
  await expect(drawer.getByText('40%')).toBeVisible();
  const style = await page.locator('.prompter').getAttribute('style');
  expect(style).toContain('--prompter-margin-x: 40vw');

  const marginY = drawer.getByRole('slider', { name: 'Top and bottom margin' });
  await marginY.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.prompter')).toHaveAttribute('style', /--prompter-margin-y: 1vh/);
});

test('settings persist in localStorage', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings' }).click();
  const drawer = page.getByRole('dialog', { name: 'Settings' });
  await drawer.getByRole('switch').click();
  const marginY = drawer.getByRole('slider', { name: 'Top and bottom margin' });
  await marginY.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');

  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('teleprompter:settings:v2') ?? '{}'),
  );
  expect(stored).toMatchObject({ mirror: true, marginY: 2, uiLanguage: 'auto' });

  await page.reload();
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(drawer.getByRole('switch')).toBeChecked();
  await expect(drawer.getByRole('slider', { name: 'Top and bottom margin' })).toHaveValue('2');
});

test('interface language defaults to auto-detect and can be changed', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings' }).click();
  const uiLanguage = page.getByRole('combobox', { name: 'Interface language' });
  await expect(uiLanguage).toHaveValue('auto');
  await expect(uiLanguage.locator('option:checked')).toHaveText('Auto-detect (English)');

  // The interface switches immediately, including the open drawer.
  await uiLanguage.selectOption('ko');
  await expect(page.getByRole('dialog', { name: '설정' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ko');

  await page.getByRole('combobox', { name: '화면 언어' }).selectOption('ja');
  await expect(page.getByRole('dialog', { name: '設定' })).toBeVisible();
  await expect(page).toHaveTitle('テレプロンプター');

  await page.reload();
  await expect(page.getByRole('heading', { name: 'テレプロンプター' })).toBeVisible();
});

test.describe('with a Korean browser', () => {
  test.use({ locale: 'ko-KR' });

  test('auto-detect follows the browser language', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '텔레프롬프터' })).toBeVisible();
  });
});

test('speech language auto-detects from the script and can be overridden', async ({ page }) => {
  await openPrompter(page, '今日は新しいテレプロンプターを紹介します。');
  await expect.poll(() => lastRecognitionLang(page)).toBe('ja-JP');

  await say(page, '今日は新しい');
  await expect(page.locator('[data-current]')).toHaveText('テレ');

  await page.locator('.prompter-fab').click();
  const speech = page.getByRole('combobox', { name: 'Speech language' });
  await expect(speech).toHaveValue('auto');
  await expect(speech.locator('option:checked')).toHaveText('Auto-detect (日本語)');
  await speech.selectOption('ko');
  // Changing the language restarts recognition with the new locale.
  await expect.poll(() => lastRecognitionLang(page)).toBe('ko-KR');
});

test('an empty script cannot be started', async ({ page }) => {
  await page.getByRole('textbox', { name: 'Script' }).fill('  [only a note]  ');
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page.getByText('Write a script first.')).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
});

test('deep link to the prompter works', async ({ page }) => {
  await page.goto('/prompter');
  await expect(page.locator('[data-current]')).toBeVisible();
});
