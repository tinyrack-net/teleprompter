# Teleprompter

A voice-following teleprompter for the web. The app opens straight into the prompter: press the microphone button and read aloud, and the text scrolls to follow your voice. Write your own script in the settings.

Live at [prompter.tinyrack.net](https://prompter.tinyrack.net).

## Features

- Voice-following scroll using the browser's Web Speech API
- Phrase-based matching that tolerates partial words and Korean particles, with `Intl.Segmenter` word splitting for Japanese
- `[Bracketed]` text is displayed but skipped while reading
- Click any word to jump to it
- Floating, semi-transparent playback controls, including the settings button
- Opens paused, so the microphone is only requested when you press the mic button
- Editing the script keeps your reading position
- Settings (saved in `localStorage`):
  - Script
  - Interface language: auto-detect (browser language), English, Korean, Japanese
  - Speech language: auto-detect (from the script), English, Korean, Japanese
  - Font size, left/right margin, top/bottom margin, mirror mode
  - Line wrapping: keep words whole (default) or wrap at any character

## Keyboard shortcuts

| Key        | Action                       |
| ---------- | ---------------------------- |
| `Space`    | Start / stop listening       |
| `←` / `→`  | Move one word back / forward |
| `Home`     | Restart from the beginning   |
| `S` or `,` | Open settings                |

## Browser support

Speech recognition requires Chrome, Edge, or Safari. Firefox does not support the Web Speech API; the prompter still works with the keyboard and on-screen controls.

## Stack

React 19, TypeScript, React Router, [@tinyrack/ui](https://www.npmjs.com/package/@tinyrack/ui) with Tailwind CSS 4, built with Vite.

```text
src/
  lib/          framework-free logic: script parsing, matching, speech, settings, language
  state/        localStorage-backed stores (useSyncExternalStore)
  i18n/         typed messages for en / ko / ja
  components/   shared UI (settings drawer, including the script editor)
  features/     the prompter page
```

## Development

Requires Node.js 24 (see `.node-version`) and pnpm.

```sh
pnpm install
pnpm dev        # start the dev server
pnpm validate   # lint, Tinyrack UI check, typecheck, unit tests and build
pnpm test:e2e   # Playwright E2E tests against the built dist/
```

E2E tests replace the Web Speech API with a fake recognizer, so they run headless without a microphone. Set `BASE_URL` to run them against a deployed site.

## Deployment

The app is served from [prompter.tinyrack.net](https://prompter.tinyrack.net) as static assets on Cloudflare Workers (`wrangler.jsonc`), with SPA fallback for client-side routes.

The `CI/CD` workflow runs on every pull request and push to `main`:

1. **validate**: Biome, `tinyrack-ui-check`, typecheck, unit tests, build, `wrangler deploy --dry-run` and actionlint
2. **e2e**: Playwright tests against the built bundle
3. **deploy** (`main` only): deploys the exact tested bundle with Wrangler, using the `production` environment
4. **smoke**: waits until production serves the new build, checks headers, then reruns the E2E suite against production

The `production` environment needs the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets.

## License

[MIT](LICENSE)
