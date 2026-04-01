# English/Korean Speech Translator

This is a free browser-based translator with two modes:

- English to Korean
- Korean to English

It listens through your microphone, translates the recognized text, and reads
the translated text aloud automatically.

## Controls

- Press `E` for English to Korean. The app switches mode and starts listening
  immediately.
- Press `K` for Korean to English. The app switches mode and starts listening
  immediately.
- You can also click either mode button to do the same thing.
- Use `Speak again` if you want to replay the translated audio.

## How to run

Because browsers often restrict microphone access on plain `file://` pages, run
it from a tiny local web server.

If you have Python:

```bash
python -m http.server 8080
```

Then open [http://localhost:8080](http://localhost:8080).

## Notes

- Speech recognition depends on browser support. Chrome or Edge usually work
  best.
- Translation uses the free Google Translate web endpoint, so there is no paid
  API key required.
- Speech playback uses the voices installed in your browser and operating
  system.
- Since the translation endpoint is unofficial, Google could change it later. If
  that happens, the UI can stay the same and only the translation function would
  need to be swapped.
