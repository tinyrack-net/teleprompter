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

| Key | Action |
| --- | --- |
| `Space` | Start / stop listening |
| `←` / `→` | Move one word back / forward |
| `Home` | Restart from the beginning |
| `Esc` | Back to the editor |

## Browser support

Speech recognition requires Chrome, Edge, or Safari. Firefox does not support the Web Speech API.

## Development

```sh
pnpm install
pnpm dev     # start the dev server
pnpm test    # run unit tests
pnpm build   # type-check and build to dist/
```

## License

[MIT](LICENSE)
