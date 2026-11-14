import { expect, type Locator, type Page, test } from '@playwright/test';

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
const recognitionLangs = (page: Page) =>
  page.evaluate(() => (window as any).__recognitionLangs as string[]);
const lastRecognitionLang = async (page: Page) => (await recognitionLangs(page)).at(-1);

const SCRIPT = 'Hello everyone and welcome.\nToday we [smile] talk about teleprompters.';

const toolbar = (page: Page) => page.getByRole('toolbar', { name: 'Playback controls' });
const current = (page: Page) => page.locator('[data-current]');
const drawer = (page: Page) => page.getByRole('dialog', { name: 'Settings' });

async function openSettings(page: Page): Promise<Locator> {
  await toolbar(page).getByRole('button', { name: 'Settings' }).click();
  await expect(drawer(page)).toBeVisible();
  return drawer(page);
}

/** Replaces the script through the settings drawer and closes it. */
async function setScript(page: Page, script: string) {
  const settings = await openSettings(page);
  await settings.getByRole('textbox', { name: 'Script' }).fill(script);
  await settings.getByRole('button', { name: 'Close' }).click();
  await expect(drawer(page)).toBeHidden();
}

async function startListening(page: Page) {
  await toolbar(page).getByRole('button', { name: 'Start listening' }).click();
  await expect(toolbar(page).getByRole('button', { name: 'Stop listening' })).toBeVisible();
}

test.use({ locale: 'en-US' });

test.beforeEach(async ({ page }) => {
  await installFakeSpeech(page);
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('opens straight into the prompter, paused, with a sample script', async ({ page }) => {
  await expect(page).toHaveTitle('Teleprompter');
  await expect(page).toHaveURL(/\/$/);
  await expect(current(page)).toHaveText('Welcome');
  await expect(page.getByText('Paused')).toBeVisible();
  await expect(toolbar(page).getByRole('button', { name: 'Start listening' })).toBeEnabled();
  // The microphone is not requested until the user asks for it.
  expect(await recognitionLangs(page)).toEqual([]);
});

test('the old /prompter path opens the prompter', async ({ page }) => {
  await page.goto('/prompter');
  await expect(page).toHaveURL(/\/$/);
  await expect(current(page)).toHaveText('Welcome');
});

test('highlight follows speech and skips bracket notes', async ({ page }) => {
  await setScript(page, SCRIPT);
  await expect(current(page)).toHaveText('Hello');
  await startListening(page);
  expect(await lastRecognitionLang(page)).toBe('en-US');

  await say(page, 'hello everyone');
  await expect(current(page)).toHaveText('and');

  await say(page, 'hello everyone and welcome today we');
  await expect(current(page)).toHaveText('talk');
  await expect(page.locator('.prompter-note')).toHaveText('[smile]');
  await expect(page.getByRole('progressbar', { name: 'Reading progress' })).toHaveAttribute(
    'aria-valuenow',
    '6',
  );
});

test('the script is edited in settings and saved', async ({ page }) => {
  const settings = await openSettings(page);
  const field = settings.getByRole('textbox', { name: 'Script' });
  await expect(field).toHaveValue(/^Welcome to the teleprompter/);

  await field.fill(SCRIPT);
  // The prompter behind the drawer updates while typing.
  await expect(page.locator('.prompter-word').first()).toHaveText('Hello');
  expect(await page.evaluate(() => localStorage.getItem('teleprompter:script:v2'))).toBe(SCRIPT);

  await page.reload();
  await expect(current(page)).toHaveText('Hello');

  await openSettings(page);
  await drawer(page).getByRole('button', { name: 'Use sample script' }).click();
  await expect(drawer(page).getByRole('textbox', { name: 'Script' })).toHaveValue(
    /^Welcome to the teleprompter/,
  );
});

test('editing the script keeps the reading position', async ({ page }) => {
  await setScript(page, SCRIPT);
  await page.locator('.prompter-word', { hasText: 'Today' }).click();
  await expect(current(page)).toHaveText('Today');

  const settings = await openSettings(page);
  await settings
    .getByRole('textbox', { name: 'Script' })
    .fill(`Intro line.\n${SCRIPT}\nOutro line.`);
  await settings.getByRole('button', { name: 'Close' }).click();
  await expect(current(page)).toHaveText('Today');
});

test('an empty script shows a prompt to write one', async ({ page }) => {
  await setScript(page, '  [only a note]  ');
  await expect(page.getByRole('heading', { name: 'No script yet' })).toBeVisible();
  await expect(toolbar(page).getByRole('button', { name: 'Start listening' })).toBeDisabled();

  await page.getByRole('button', { name: 'Edit script' }).click();
  const field = drawer(page).getByRole('textbox', { name: 'Script' });
  await expect(field).toBeFocused();
  await field.fill('Back again');
  await drawer(page).getByRole('button', { name: 'Close' }).click();
  await expect(current(page)).toHaveText('Back');
});

test('floating playback controls work', async ({ page }) => {
  await setScript(page, SCRIPT);
  const bar = toolbar(page);

  await bar.getByRole('button', { name: 'Next word' }).click();
  await expect(current(page)).toHaveText('everyone');
  await bar.getByRole('button', { name: 'Previous word' }).click();
  await expect(current(page)).toHaveText('Hello');

  await page.locator('.prompter-word', { hasText: 'Today' }).click();
  await expect(current(page)).toHaveText('Today');
  await bar.getByRole('button', { name: 'Restart' }).click();
  await expect(current(page)).toHaveText('Hello');

  await startListening(page);
  await bar.getByRole('button', { name: 'Stop listening' }).click();
  await expect(bar.getByRole('button', { name: 'Start listening' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await expect(bar.getByRole('button', { name: 'Back to editor' })).toHaveCount(0);
});

test('shortcuts still work after using the toolbar or settings', async ({ page }) => {
  await setScript(page, SCRIPT);
  const bar = toolbar(page);

  // A focused toolbar would normally use arrow keys to move between its buttons.
  await bar.getByRole('button', { name: 'Next word' }).click();
  await expect(current(page)).toHaveText('everyone');
  await page.keyboard.press('ArrowRight');
  await expect(current(page)).toHaveText('and');

  // Space on the focused mic button toggles once, not twice.
  await bar.getByRole('button', { name: 'Start listening' }).click();
  await expect(page.getByText('Listening', { exact: true })).toBeVisible();
  await page.keyboard.press('Space');
  await expect(page.getByText('Paused')).toBeVisible();

  // Closing settings returns focus to the prompter.
  await openSettings(page);
  await drawer(page).getByRole('button', { name: 'Close' }).click();
  await expect(drawer(page)).toBeHidden();
  await page.keyboard.press('ArrowLeft');
  await expect(current(page)).toHaveText('everyone');
});

test('settings are only in the floating toolbar', async ({ page }) => {
  // The toolbar is the single entry point; no separate corner button.
  await expect(page.getByRole('button', { name: 'Settings' })).toHaveCount(1);
  await expect(toolbar(page).getByRole('button', { name: 'Settings' })).toBeVisible();
});

test('keyboard shortcuts', async ({ page }) => {
  await setScript(page, SCRIPT);
  await page.keyboard.press('ArrowRight');
  await expect(current(page)).toHaveText('everyone');
  await page.keyboard.press('Home');
  await expect(current(page)).toHaveText('Hello');

  await page.keyboard.press('Space');
  await expect(page.getByText('Listening', { exact: true })).toBeVisible();
  await page.keyboard.press('Space');
  await expect(page.getByText('Paused')).toBeVisible();

  await page.keyboard.press('s');
  await expect(drawer(page)).toBeVisible();
  // Typing in the script field must not trigger shortcuts.
  const field = drawer(page).getByRole('textbox', { name: 'Script' });
  await field.press('End');
  await field.press('s');
  await expect(drawer(page)).toBeVisible();
});

test('margins apply to the prompter immediately', async ({ page }) => {
  const settings = await openSettings(page);

  // Margins apply to the prompter immediately.
  const marginX = settings.getByRole('slider', { name: 'Left and right margin' });
  await marginX.focus();
  await page.keyboard.press('End');
  await expect(settings.getByText('40%')).toBeVisible();
  await expect(page.locator('.prompter')).toHaveAttribute('style', /--prompter-margin-x: 40vw/);

  const marginY = settings.getByRole('slider', { name: 'Top and bottom margin' });
  await marginY.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.prompter')).toHaveAttribute('style', /--prompter-margin-y: 1vh/);
});

test('line wrapping can be switched and is saved', async ({ page }) => {
  // A long, space-free line makes the two modes lay out differently.
  await setScript(
    page,
    '텔레프롬프터에 오신 것을 환영합니다. 아래 마이크 버튼을 누르고 소리 내어 읽어 보세요.',
  );
  const text = page.locator('.prompter-text');
  await expect(text).toHaveAttribute('data-wrap', 'words');
  await expect(text).toHaveCSS('word-break', 'keep-all');

  const settings = await openSettings(page);
  const group = settings.getByRole('radiogroup', { name: 'Line wrapping' });
  await expect(group.getByRole('radio', { name: 'Keep words whole' })).toBeChecked();
  await group.getByRole('radio', { name: 'Wrap anywhere' }).click();

  await expect(text).toHaveAttribute('data-wrap', 'anywhere');
  await expect(text).toHaveCSS('word-break', 'break-all');
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('teleprompter:settings:v2') ?? '{}'),
  );
  expect(stored.lineWrap).toBe('anywhere');

  await page.reload();
  await expect(page.locator('.prompter-text')).toHaveAttribute('data-wrap', 'anywhere');

  // Reset restores the default.
  await openSettings(page);
  await drawer(page).getByRole('button', { name: 'Reset to defaults' }).click();
  await expect(page.locator('.prompter-text')).toHaveAttribute('data-wrap', 'words');
});

test('words mode never splits a Korean word across lines', async ({ page }) => {
  await setScript(page, '가나다라마바사아자차카타파하 '.repeat(20).trim());
  // Each span is one word; in words mode no word may start on one line and end on another.
  const split = await page
    .locator('.prompter-word')
    .evaluateAll((spans) => spans.some((el) => el.getClientRects().length > 1));
  expect(split).toBe(false);

  const settings = await openSettings(page);
  await settings.getByRole('radio', { name: 'Wrap anywhere' }).click();
  await settings.getByRole('button', { name: 'Close' }).click();
  const splitAnywhere = await page
    .locator('.prompter-word')
    .evaluateAll((spans) => spans.some((el) => el.getClientRects().length > 1));
  expect(splitAnywhere).toBe(true);
});

test('settings persist in localStorage', async ({ page }) => {
  const settings = await openSettings(page);
  await settings.getByRole('switch').click();
  const marginY = settings.getByRole('slider', { name: 'Top and bottom margin' });
  await marginY.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');

  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('teleprompter:settings:v2') ?? '{}'),
  );
  expect(stored).toMatchObject({ mirror: true, marginY: 2, uiLanguage: 'auto' });

  await page.reload();
  await expect(page.locator('.prompter')).toHaveAttribute('data-mirror', '');
  await openSettings(page);
  await expect(drawer(page).getByRole('switch')).toBeChecked();
  await expect(drawer(page).getByRole('slider', { name: 'Top and bottom margin' })).toHaveValue(
    '2',
  );
});

test('interface language defaults to auto-detect and can be changed', async ({ page }) => {
  const settings = await openSettings(page);
  const uiLanguage = settings.getByRole('combobox', { name: 'Interface language' });
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
  await expect(page.getByText('一時停止')).toBeVisible();
});

test.describe('with a Korean browser', () => {
  test.use({ locale: 'ko-KR' });

  test('auto-detect follows the browser language', async ({ page }) => {
    await expect(page.getByText('일시정지')).toBeVisible();
    await expect(current(page)).toHaveText('텔레프롬프터에');
  });
});

test('speech language auto-detects from the script and can be overridden', async ({ page }) => {
  await setScript(page, '今日は新しいテレプロンプターを紹介します。');
  await startListening(page);
  expect(await lastRecognitionLang(page)).toBe('ja-JP');

  await say(page, '今日は新しい');
  await expect(current(page)).toHaveText('テレ');

  const settings = await openSettings(page);
  const speech = settings.getByRole('combobox', { name: 'Speech language' });
  await expect(speech).toHaveValue('auto');
  await expect(speech.locator('option:checked')).toHaveText('Auto-detect (日本語)');
  await speech.selectOption('ko');
  // Changing the language restarts recognition with the new locale.
  await expect.poll(() => lastRecognitionLang(page)).toBe('ko-KR');
});

test.describe('on a touch device', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  /** Waits for the drawer open transition to finish before gesturing. */
  const settled = (page: Page) =>
    page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running'));

  /** Drags horizontally with real touch events (Playwright has no touch-drag helper). */
  async function touchDrag(page: Page, from: { x: number; y: number }, dx: number) {
    const cdp = await page.context().newCDPSession(page);
    const point = (x: number) => [{ x, y: from.y }];
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: point(from.x) });
    const steps = 15;
    for (let i = 1; i <= steps; i++) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: point(from.x + (dx * i) / steps),
      });
      // Pace the moves like a real finger (~60 Hz) so gesture code sees velocity.
      await page.waitForTimeout(16);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }

  async function openSettingsByTouch(page: Page) {
    await toolbar(page).getByRole('button', { name: 'Settings' }).tap();
    await expect(drawer(page)).toBeVisible();
    await settled(page);
  }

  test('dragging a slider adjusts it without swiping the drawer', async ({ page }) => {
    await openSettingsByTouch(page);
    const popup = page.locator('.tr-drawer-popup');
    const startLeft = (await popup.boundingBox())?.x;

    const slider = drawer(page).getByRole('slider', { name: 'Left and right margin' });
    await slider.scrollIntoViewIfNeeded();
    const before = Number(await slider.inputValue());
    const control = drawer(page).locator('.tr-slider-control').nth(1);
    const box = await control.boundingBox();
    if (!box) throw new Error('slider control not found');
    await touchDrag(page, { x: box.x + box.width * 0.2, y: box.y + box.height / 2 }, 180);

    await expect.poll(async () => Number(await slider.inputValue())).toBeGreaterThan(before);
    expect(await popup.getAttribute('data-swiping')).toBeNull();
    expect((await popup.boundingBox())?.x).toBe(startLeft);
    await expect(drawer(page)).toBeVisible();
  });

  test('swiping the drawer elsewhere still dismisses it', async ({ page }) => {
    await openSettingsByTouch(page);
    const title = await drawer(page).getByRole('heading', { name: 'Settings' }).boundingBox();
    if (!title) throw new Error('drawer title not found');
    await touchDrag(page, { x: title.x + 10, y: title.y + title.height / 2 }, 300);
    await expect(drawer(page)).toBeHidden();
  });
});
