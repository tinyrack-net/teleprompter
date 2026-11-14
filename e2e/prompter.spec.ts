import { expect, type Page, test } from '@playwright/test';

/** Replaces the Web Speech API with a fake that tests can drive via `say()`. */
async function installFakeSpeech(page: Page) {
  await page.addInitScript(() => {
    const w = window as any;
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
        w.__recognitionStarted = true;
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

const SCRIPT = 'Hello everyone and welcome.\nToday we [smile] talk about teleprompters.';

test.beforeEach(async ({ page }) => {
  await installFakeSpeech(page);
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('editor loads with controls', async ({ page }) => {
  await expect(page).toHaveTitle(/Teleprompter/);
  await expect(page.locator('#script-input')).toBeVisible();
  await expect(page.locator('#start')).toBeEnabled();
  await expect(page.locator('#unsupported')).toBeHidden();
});

test('highlight follows speech and skips bracket notes', async ({ page }) => {
  await page.locator('#script-input').fill(SCRIPT);
  await page.locator('#lang').selectOption('en-US');
  await page.locator('#start').click();

  const current = page.locator('.word.current');
  await expect(page.locator('#prompter')).toBeVisible();
  await expect(current).toHaveText('Hello');
  await expect.poll(() => page.evaluate(() => (window as any).__recognitionStarted)).toBe(true);

  await say(page, 'hello everyone');
  await expect(current).toHaveText('and');

  await say(page, 'hello everyone and welcome today we');
  // "[smile]" is a note, so the cursor lands on "talk".
  await expect(current).toHaveText('talk');
  await expect(page.locator('.word.note')).toHaveText('[smile]');
});

test('clicking a word jumps there and keyboard navigation works', async ({ page }) => {
  await page.locator('#script-input').fill(SCRIPT);
  await page.locator('#start').click();

  await page.locator('.word', { hasText: 'Today' }).click();
  await expect(page.locator('.word.current')).toHaveText('Today');

  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.word.current')).toHaveText('we');

  await page.keyboard.press('Home');
  await expect(page.locator('.word.current')).toHaveText('Hello');

  await page.keyboard.press('Escape');
  await expect(page.locator('#editor')).toBeVisible();
});

test('script and settings persist across reloads', async ({ page }) => {
  await page.locator('#script-input').fill('Persist me');
  await page.locator('#mirror').check();
  await page.reload();
  await expect(page.locator('#script-input')).toHaveValue('Persist me');
  await expect(page.locator('#mirror')).toBeChecked();
});
