# Teleprompter

A minimal voice-following teleprompter for the web. Paste a script, press **Start**, and read aloud — the text scrolls to follow your voice.

## Features

- Voice-following scroll using the browser's Web Speech API
- Phrase-based matching that tolerates partial words and Korean particles
- `[Bracketed]` text is displayed but skipped while reading
- Click any word to jump to it
- Font size and mirror mode
- Script and settings saved in local storage

## Keyboard shortcuts

| Key       | Action                       |
| --------- | ---------------------------- |
| `Space`   | Start / stop listening       |
| `←` / `→` | Move one word back / forward |
| `Home`    | Restart from the beginning   |
| `Esc`     | Back to the editor           |

## Browser support

Speech recognition requires Chrome, Edge, or Safari. Firefox does not support the Web Speech API.

## Development

Requires Node.js 24 (see `.node-version`) and pnpm.

```sh
pnpm install
pnpm dev        # start the dev server
pnpm validate   # lint, typecheck, unit tests and build
pnpm test:e2e   # Playwright E2E tests against the built dist/
```

E2E tests replace the Web Speech API with a fake recognizer, so they run headless without a microphone. Set `BASE_URL` to run them against a deployed site.

## Deployment

The app is served from [prompter.tinyrack.net](https://prompter.tinyrack.net) as static assets on Cloudflare Workers (`wrangler.jsonc`).

The `CI/CD` workflow runs on every pull request and push to `main`:

1. **validate**: Biome lint, typecheck, unit tests, build, `wrangler deploy --dry-run` and actionlint
2. **e2e**: Playwright tests against the built bundle
3. **deploy** (`main` only): deploys the exact tested bundle with Wrangler, using the `production` environment
4. **smoke**: waits until production serves the new build, checks headers, then reruns the E2E suite against production

The `production` environment needs the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets.

## License

[MIT](LICENSE)
