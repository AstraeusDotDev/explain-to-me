# Phase 3 evidence: document-to-video

## Scope actually exercised

A fresh Markdown engineering document (`fixtures/inputs/cached-builds/document.md`) produced the required six artifacts without a prepared manifest. The build used the installed local llama.cpp/Qwen3-4B-Instruct-2507 Q4_K_M director, Kokoro `af_heart`, measured sentence/phrase caption timing, and deterministic source code, bullets and a local PNG diagram. No development subscription is used as a runtime director API.

Main output: `out/phase-3-reviewed-cold/video.mp4`. Supporting intent, captions, WAV, report, copied PNG and boundary samples are beside it. The video is also open in the existing cmux browser pane. The generated script is inspectable in `manifest.json`; original direction and source block references are in `report.json`.

## Real commands

```bash
TMPDIR="<user-owned-temporary-root>" ./node_modules/.bin/tsx apps/cli/src/index.ts build fixtures/inputs/cached-builds/document.md --director local --duration 60s --audience 'software engineers' --tts kokoro --voice af_heart --pronunciations fixtures/inputs/cached-builds/pronunciations.json --cache-dir .explain-to-me/cache-phase3-reviewed --output out/phase-3-reviewed-cold
```

The temporary-root path is redacted above; replace the placeholder with an existing short, user-owned directory to run the command. The warm run used the same arguments/cache with `--output out/phase-3-reviewed-warm`. The reviewed-cache directory did not exist before the cold run. Setup downloads and installed weights/browser are excluded from build wall time. These runs exercise the hardened private-socket director transport.

## Measured results

| Check | Cold | Warm |
|---|---:|---:|
| Through automated validation | 52.90 s | 3.44 s |
| Direction stage | 6.76 s | 1.13 s |
| Narration stage | 9.78 s | 0.19 s |
| Render stage | 34.04 s | 0.001 s |
| Director cache | 1 miss / 1 write | 1 hit / no writes |
| PCM cache | 12 misses / 12 writes | 12 hits / no writes |
| Render cache | miss | hit |
| MP4 container duration | 59.875 s | 59.875 s |
| Measured PCM duration | 59.864583 s | 59.864583 s |
| Output | 1280×720, 24 fps, 1437 frames | same |
| Automated QC | passed | passed |

Warm direction still fingerprints the installed runtime/model/provenance. Cache reuse skips model inference, synthesis and frame generation, not muxing, sampling or QC. Times are monotonic `performance.now()` values from each actual `report.json`, not latency guarantees.

Both MP4s were decoded to frame MD5 listings and mono PCM. SHA-256 digests match:

- Decoded frame listing: `baa7d279bd84795a3018225db59278b73aadc5b2f5778d234e12e4a4478a184b`
- Decoded PCM: `3a26d9880032b08482edd71ab50bdbd91382ae834ad21e3c2870d6e1de55f991`

The WAV contains 1,436,750 samples. Automated checks found zero clipped samples, a 480.21 ms longest interior silence, 10 ms A/V endpoint difference, and no caption endpoint difference against measured PCM. All media/caption/frame/format gates passed. Seven midpoint frames were visually inspected from the real MP4: the diagram loads; code and bullets are legible; no observed content clipping or caption collisions. This is sampling, not full audiovisual approval. Independent cold synthesis differed slightly while the script/intent stayed identical; cached warm equality is not a claim of cold TTS bitwise determinism.

## Caption and pronunciation evidence

There are seven scenes and twelve measured narration/caption chunks. Display text remains `PCM boundaries define caption timing, not word alignment.`; the speech text is `P C M boundaries define caption timing, not word alignment.`. Exactly one chunk changed through the dictionary. The report records dictionary SHA-256 and preparation statistics. These are sentence/phrase boundaries, not word-aligned transcription.

## Compatibility and invalidation checks

- `out/phase-3-plain-template`: real `.txt` input, explicit `template-extractive`, requested 45 s, measured PCM 45.143875 s, automated QC passed. It is not labeled AI summarization.
- `out/phase-3-prepared-compat`: existing Whisper/TTS prepared manifest, requested 60 s, measured PCM 60.915708 s, automated QC passed within the existing ±1 s tolerance.
- `out/phase-3-portable-rerender`: the generated final manifest and copied PNG were accepted as input, preserving the existing spoken pronunciation. All twelve PCM chunks and the render hit; validation time 2.25 s. The original Markdown was not read by this prepared-input path.
- `out/phase-3-visual-edit`: changing only the image scene's title reused all twelve PCM chunks and missed rendering, as intended. Validation time 35.89 s.
- `out/phase-3-unused-asset`: a valid manifest with two distinct declared raster sources and only one image-scene reference passed full QC after unused-asset handling was fixed. Only the referenced image is bundled for the browser.
- The focused director test verifies unchanged direction hits and changed source/asset hashes miss. Cache integrity/key-binding tests remain in place.
- Twelve focused tests and project typecheck passed via the cached pnpm launcher. No new test framework was added.

## Failures caught during integration

- A real model response assigned another scene's valid source ID. Per-position JSON tuple constraints now fix each scene's focus and source IDs, in addition to runtime validation.
- A subsequent response exceeded the overall script budget. The prompt and schema now bound individual scenes as well as total words, with one repair retry.
- An over-compressed 106-word script could not meet 60 s at the allowed Kokoro speed floor: 43.321 s at speed 1.0, 55.106 s at 0.8. The build refused publication rather than cut speech or add silence. The director now requires enough grounded explanation per scene; warnings no longer falsely blame source insufficiency for a short generated script.
- Independent specification review caught image syntax inside inline code being resolved as an asset. A regression first failed on `missing-inline.png`; the fix masks exact single/double/multiline code spans in both image scans while preserving positions and original asset fields. The regression, including emoji before a valid image, passes.
- Quality review caught unmatched backticks masking a later paragraph's real image. The regression failed with zero assets and now passes; pairing is scoped to inline blocks, including paragraph/heading/list/fence boundaries.
- Quality review caught valid unused declared assets being rejected by the renderer. Metadata validation now accepts them while bundling only referenced image IDs; the real unused-asset build passed.
- Quality review caught the TCP reserve-close-spawn port race. The model now listens only on a private Unix socket in a 0700 temporary directory, with direct socket requests and an allowlisted child environment. Actual inference passed, and no owned server or socket directory remained after cleanup. This is not protection from same-user/root host compromise.
- The installed FFmpeg lacks `drawtext`; the synthetic diagram was authored using the native AppKit fixture script instead. The build itself does not require that authoring script or a drawtext-enabled FFmpeg.

## Honest remaining gates

- Full human watch/listen approval is pending. Signal checks do not approve voice quality, pacing or every factual claim.
- Source references are structural provenance, not proof of model semantic correctness. The director selects a bounded subset, not every source section.
- Process-wide zero-egress verification remains unproven. Private-socket model HTTP, setup-only downloads, and renderer request blocking/auditing are not a whole-process firewall test.
- Commercial license suitability is not approved by these media checks.
- Faster/richer profiles, PDFs/web ingestion, generated visuals, avatars, ASR/word alignment and Studio are deferred.
