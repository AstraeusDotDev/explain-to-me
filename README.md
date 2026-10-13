# explain-to-me

`explain-to-me` is a local-first pipeline that turns a source artifact into a narrated, captioned explainer video. The system uses model-backed stages to create a constrained production plan, then uses measured narration timing and a deterministic renderer to produce and validate the final media.

This repository now contains an executable prepared-manifest preview pipeline, local Kokoro neural narration, and persistent narration/render caching. Automatic text-to-video direction and richer profiles remain later work. Automated media checks pass; full human approval and process-wide zero-egress verification remain pending.

## Current iteration: neural narration and cached builds

The narrator defaults to `--tts auto`: use local Kokoro (`af_heart`) when its runtime/models are installed, otherwise fall back explicitly to Apple speech. `--tts kokoro` fails clearly if unavailable; `--tts apple --voice Samantha` retains the original narrator. Voice quality is a listening decision, not something signal checks can approve.

```bash
# Setup-only network access: installs isolated Python packages and verified model assets.
python3 scripts/setup-kokoro.py

# Local neural build; choose a new output directory each time.
npm exec --cache .cache/npm --offline --yes pnpm@10.18.3 -- explain-to-me build --manifest fixtures/golden-manifests/whisper-vs-tts.json --tts kokoro --voice af_heart --duration 60s --output out/my-neural-explainer
```

The default cache lives in `.explain-to-me/cache`; select another root with `--cache-dir`. PCM chunks are keyed by text, voice, rate/speed, model/runtime/adapter identity and relevant environment. Render keys include manifest, measured timeline, source/config/dependency hashes and browser environment. Unchanged warm builds skip both synthesis and frame rendering while still muxing and validating each output. Visual-only edits preserve narration but invalidate rendering. Cache records are private, atomic, bound to their request key, and digest-checked. In-flight factory deduplication is per cache instance, not a cross-process build lock; simultaneous separate CLI builds may duplicate cold work safely.

Verified neural output: `out/phase-2-final-cold/video.mp4`. Samples for `af_heart`, `af_bella`, and `am_michael` are under `out/phase-2-voice-samples/`. See `docs/benchmarks/phase-2-results.md` for cold/warm measurements and remaining gates.

## First milestone: a watchable local video

The approved execution order begins with a prepared manifest, Apple speech, measured audio timing, deterministic scenes, captions, muxing, and validation. The implemented milestone command is:

```bash
pnpm explain-to-me build --manifest fixtures/golden-manifests/whisper-vs-tts.json --profile preview --duration 60s --tts apple --voice Samantha
```

It produces all six artifacts and passes the golden automated media checks; end-to-end human approval is still required. No runtime LLM, downloaded TTS model, browser capture provider, or cloud service is required. Caching and Kokoro are now implemented in phase 2; text ingestion/direction and richer quality policies remain later work. Caption subdivisions within measured narration chunks use proportional estimates, not forced alignment.

### Setup and run

Requires macOS, Node, Apple speech, FFmpeg, and ffprobe. On this checkout, pnpm is available through the cached npm launcher rather than globally installed:

```bash
# Setup: network access/downloads are permitted here.
npm exec --cache .cache/npm --yes pnpm@10.18.3 -- install --store-dir .cache/pnpm-store
node --input-type=module -e 'import {ensureBrowser} from "@remotion/renderer"; await ensureBrowser({chromeMode:"headless-shell"});'

# Execution: cached launcher; no package/browser downloads.
npm exec --cache .cache/npm --offline --yes pnpm@10.18.3 -- explain-to-me doctor
npm exec --cache .cache/npm --offline --yes pnpm@10.18.3 -- explain-to-me build --manifest fixtures/golden-manifests/whisper-vs-tts.json --profile preview --duration 60s --output out/my-explainer

# Lean checks.
npm exec --cache .cache/npm --offline --yes pnpm@10.18.3 -- typecheck
npm exec --cache .cache/npm --offline --yes pnpm@10.18.3 -- test
```

Use a new output directory for each build; existing targets are refused. Failed staging directories retain a `failure.json` diagnostic. Normal Chrome may attempt background networking; the preinstalled headless shell avoids that observed failure. Build-time browser downloads are disabled.

The verified output is `out/milestone-1-final/video.mp4`; all supporting artifacts and scene-boundary samples are beside it. See `docs/benchmarks/milestone-1-results.md` for measured evidence and remaining gates.

## MVP contract

The MVP accepts:

- one Markdown (`.md`) or plain-text (`.txt`) input file;
- local images referenced by the input or supplied as project assets; and
- build options selecting the profile, requested duration, audience, and style.

The later text-to-video path includes an offline extractive/template director, explicitly distinguished from model summarization. A local model backend requires a concrete selection and real benchmark; cloud direction requires configured opt-in. Requested duration is checked after synthesis with at most two bounded corrections; infeasible requests fail rather than truncate speech or pad long silence.

Local image references must resolve, after canonicalization, within the authoritative input or project-assets roots defined by the system-boundary decision. Nonexistent targets, traversal outside those roots, and symlink escapes are rejected; an in-root symlink whose resolved target remains in-root is allowed. Network pages, PDFs, source-code ingestion, arbitrary JSON, remote images, imported audio, and video clips are deferred from the MVP input contract.

The CLI is local-first: `--allow-cloud` defaults to `false`. In that mode every stage—including direction, assets, TTS, rendering, and validation—must make zero external network requests, and source text and images must not leave the machine. Cloud-backed stages require explicit opt-in and auditable, content-safe provenance.

The planned command shape is:

```bash
explain-to-me build input.md \
  --profile fast \
  --duration 90s \
  --audience "software engineers" \
  --style "friendly technical whiteboard"
```

The golden acceptance command is:

```bash
explain-to-me build fixtures/inputs/whisper-vs-tts.md \
  --profile preview \
  --duration 60s
```

A successful build writes a job output directory containing:

| Artifact | Contract |
|---|---|
| `video.mp4` | Final muxed video with video and narration audio streams. |
| `audio.wav` | Final narration/mix used by the video timeline. |
| `captions.vtt` | WebVTT captions covering every narration chunk. |
| `captions.srt` | SRT captions covering every narration chunk. |
| `manifest.json` | Validated, renderer-neutral production intent: narration, scene/cue intent, bounded asset references, profile, and target duration. |
| `report.json` | Machine-readable validation, provenance, resolved asset hashes, pinned adapters/models/configuration/seeds/environment, stage timing, cache state, profile downgrade, and license results. |
| project files (optional) | Editable scene and asset files when explicitly requested. |

Artifact names are stable. The eventual CLI may add an output-directory option, but it must not silently rename or omit required artifacts.

`manifest.json` alone is not an exact-reproduction record. Exact reproduction requires the complete build record: the manifest plus `report.json` provenance, resolved asset hashes, and the pinned adapter/model versions, configuration, seeds, and environment. Provider- and renderer-specific execution metadata belongs in that build record, not in `ProductionManifest`.

## Golden explainer

The first end-to-end fixture is a 60-second explainer titled **“Whisper is not text-to-speech.”** It must demonstrate narration, captions, an audio-to-text versus text-to-audio diagram, kinetic labels, a comparison scene, and a short CLI/code card using deterministic visuals only.

Acceptance is based on probe-valid MP4 output, intelligible narration, complete and monotonic captions, scene timing that remains within assigned intervals, deterministic rerendering, and recorded wall time. Cold-cache and warm-cache results are measured separately; current numbers are targets, not measured performance claims.

See [the acceptance benchmark](docs/benchmarks/acceptance.md).

## Architecture

- [System boundaries](docs/architecture/0001-system-boundaries.md)
- [Renderer selection and exit strategy](docs/architecture/0002-renderer-selection.md)
- [Approved implementation plan](docs/plans/2026-10-13-explain-to-me-implementation-plan.md)

The core boundary is a validated, renderer-neutral `ProductionManifest`. Model output cannot provide executable renderer code, shell commands, unrestricted paths, or arbitrary scene types. Narration is synthesized before final timing; measured audio durations define the scene timeline.

## Explicit MVP deferrals

The MVP does not include:

- fully generated long-form video;
- automatic full-body presenters;
- collaborative cloud editing;
- a general-purpose nonlinear-editor timeline;
- arbitrary user-authored renderer code;
- automatic publishing;
- 4K as a default;
- the local Studio UI, which follows a stable CLI;
- remote/cloud execution as a required path; or
- source formats beyond Markdown/plain text plus local images.
