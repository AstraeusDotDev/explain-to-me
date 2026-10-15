# The tiny movie crew's own movie

Source for the v0.2.0 getting-started showcase. These are custom animated React/SVG characters, not an additional CLI theme. The movie uses the project's narration preparation, Kokoro speech synthesis, measured timeline, and WebVTT modules, then a bespoke Remotion composition and FFmpeg soundtrack mix.

After completing the main README's setup and optional Kokoro setup, run from the repository root:

```bash
pnpm exec tsx scripts/release-video/prepare.ts
pnpm exec tsx scripts/release-video/render.ts --stills  # optional scene review
pnpm exec tsx scripts/release-video/render.ts
pnpm exec tsx scripts/release-video/finish.ts /path/to/business-as-usual.mp3
```

Use the main README's cached pnpm launcher if pnpm isn't global. The rendering script expects the explicit Headless Shell setup; set `CHROME_PATH` for another installed compatible browser. The original soundtrack is supplied separately, not bundled. It is **“Business As Usual” by tommyallsup**, provided for this release by the project owner. The project code's MIT license does not relicense the soundtrack or other third-party components.

`story.json` is reviewed production intent. `prepare.ts` writes narration, measured props, and captions under ignored `out/release-showcase/`. `render.ts --stills` exports a frame from every scene for layout review. `finish.ts` mixes narration with ducked music, adds a fade, and produces the website video, poster, captions, and a small production record. It overwrites those release-showcase output files intentionally.

The MP4 and captions are also attached to the GitHub release. Watch the movie before sharing it; automated decoding and timing checks cannot judge narration quality or factual accuracy.
