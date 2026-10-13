# Explain-to-Me Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Build a local-first system that converts a source artifact into a narrated, captioned, visually engaging explainer video in roughly a few minutes, with explicit speed-versus-quality profiles.

**Architecture:** A TypeScript orchestrator converts the input into a validated production manifest, generates narration first, derives the master timeline from measured audio, acquires or creates visual assets, and renders the final composition through a deterministic video engine. Model-backed stages are adapters behind stable interfaces, so fast local fallbacks can replace slow or unavailable generators without changing the project manifest.

**Tech Stack:** TypeScript, Node.js, pnpm, Zod, Remotion or Revideo, React, FFmpeg/ffprobe, Playwright, Kokoro or Apple speech synthesis, whisper.cpp/OpenWhispr-compatible local models, optional ComfyUI, Vitest, and JSON Schema.

---

## 1. Product Definition

`explain-to-me` accepts an artifact such as Markdown, plain text, source code, an HTML page, a PDF, or a structured JSON document and produces:

- `video.mp4`
- `audio.wav`
- `captions.vtt` and `captions.srt`
- `manifest.json` containing the complete reproducible production plan
- `report.json` containing timing, cache, quality, and validation results
- an optional editable project directory containing scene and asset files

Initial command shape:

```bash
explain-to-me build input.md \
  --profile fast \
  --duration 90s \
  --audience "software engineers" \
  --style "friendly technical whiteboard"
```

The essential design decision is that an LLM produces a constrained `ProductionManifest`, not arbitrary rendering code. The renderer accepts only known scene types and validated parameters. This makes generation repeatable, cacheable, testable, and safer than executing unconstrained model-authored React or shell code.

## 2. Important Correction: Whisper Is Not the Narrator

OpenWhispr's local setup uses Whisper-family models for local transcription: audio goes in and text comes out.[6] It is valuable here, but it does not perform text-to-speech.

Use Whisper/OpenWhispr-compatible models for:

- checking that synthesized narration matches the intended script;
- recovering word timestamps when the selected TTS engine does not expose them;
- transcribing imported audio or a human-recorded narration track;
- generating captions for artifacts that already contain audio.

Use a TTS engine to turn the approved narration script into audio. Start with macOS speech synthesis as the zero-setup baseline, then make Kokoro the preferred local neural backend. Kokoro's current repository describes an 82-million-parameter Apache-licensed model, and its pipeline exposes token timing fields that can seed word highlighting.[7][8]

whisper.cpp is the preferred standalone verification adapter because it supports CPU-only execution, Apple Silicon optimizations, Core ML acceleration, and multiple subtitle-oriented output modes.[9]

## 3. Recommended Rendering Strategy

### Primary recommendation: deterministic video backbone

Use a deterministic TypeScript renderer for the master timeline. Remotion provides CLI and Node APIs for rendering React compositions, supports concurrent frame rendering, and overlaps frame rendering with encoding.[1] It is the fastest path to a polished first version because layouts, SVG, captions, browser captures, charts, and reusable React components fit naturally into its model.

Remotion is source-available rather than conventionally open source, and its current pricing distinguishes individual/small-company use from automated rendering by larger organizations.[2] Treat that as an architectural constraint, not a footnote.

Therefore:

- implement `RendererAdapter` from day one;
- build the first adapter with Remotion;
- keep the production manifest renderer-neutral;
- add a Revideo proof of concept before declaring the architecture settled.

Revideo is an MIT-licensed TypeScript alternative with a headless Node rendering API, browser workers, WebCodecs frame encoding, and FFmpeg-based audio/final muxing.[3][4] It is the strongest permissively licensed fallback, but it has a smaller ecosystem.

Motion Canvas is worth borrowing ideas from, especially named synchronization cues that can be repositioned against narration audio.[5] It is best treated as a specialist engine for highly choreographed vector or technical scenes rather than the initial master compositor.

### Scene types for the first renderer

1. `title` — headline, subtitle, visual motif
2. `statement` — one central idea with kinetic typography
3. `bullets` — progressive list with emphasis
4. `diagram` — nodes, edges, highlights, and camera focus
5. `code` — syntax-highlighted code with line emphasis
6. `browser` — real Playwright screenshot or short deterministic capture
7. `terminal` — styled terminal transcript or captured command session
8. `comparison` — two-column or matrix comparison
9. `timeline` — chronological explanation
10. `image` — local, stock, or generated still with deterministic motion
11. `avatar` — optional presenter clip
12. `outro` — recap and next action

All factual text, labels, code, charts, logos, and UI screenshots remain deterministic. Generative image/video systems should supply atmosphere and illustrative B-roll, not the information layer.

## 4. End-to-End Pipeline

```text
input artifact
  -> ingest and normalize
  -> extract claims, structure, and source references
  -> write narration and storyboard
  -> validate ProductionManifest
  -> synthesize narration in sentence-sized chunks
  -> measure audio and derive master timeline
  -> obtain deterministic and generated visual assets in parallel
  -> compile scenes into renderer input
  -> render video-only frames
  -> mix narration, music, and effects
  -> mux and encode
  -> run automated audiovisual QC
  -> emit video, captions, manifest, and report
```

### Pipeline rules

- Narration is generated before final scene timing.
- Every audio chunk records exact sample count, duration, text, voice, backend, seed, and timing source.
- Scene boundaries derive from measured audio durations, not estimated reading speed.
- Asset generation runs concurrently after the storyboard is stable.
- Each stage is content-addressed and cached.
- A failed optional stage degrades gracefully: generated video -> generated still -> stock/icon -> typography.
- The deadline manager can skip or downgrade stages to honor the requested build-time budget.

## 5. Speed-versus-Quality Profiles

Profiles are policies, not just resolution presets.

| Profile | Intended outcome | Voice | Visual generation | Video settings | Target behavior |
|---|---|---|---|---|---|
| `preview` | Validate script and timing immediately | macOS system voice | None | 720p, 24 fps, fast codec | Deterministic scenes only; optimize for the first watchable cut |
| `fast` | Daily-use explainer in a couple of minutes | Kokoro, Apple fallback | At most a few cached/generated stills | 1080p, 30 fps | Mostly text, SVG, diagrams, screenshots, and camera motion |
| `balanced` | Better visual variety without losing editability | Kokoro or optional cloned voice | ComfyUI stills, depth/parallax, optional short avatar segment | 1080p, 30 fps, higher quality encode | Deterministic backbone with selective model-generated assets |
| `cinematic` | Showcase-quality production | expressive/cloned voice with post-alignment | Multiple candidates, avatar, selected short generated-video shots | 1440p/4K where justified | Longer deadline, reranking, expensive effects, manual review expected |

Add explicit resource controls:

```bash
--deadline 180s
--max-generated-images 6
--max-generated-video-seconds 0
--max-vram-gb 12
--render-concurrency auto
--allow-cloud false
```

The scheduler assigns a budget to each phase and starts with the best allowed option. If the remaining deadline becomes too small, it chooses a deterministic fallback rather than timing out. The fast path should never depend on full generative video.

## 6. Audio Architecture

### TTS adapters

```ts
interface TtsAdapter {
  synthesize(request: TtsRequest): Promise<AudioChunk[]>;
  capabilities(): TtsCapabilities;
}
```

Implement in this order:

1. `MacOsSpeechAdapter` — quickest proof of the complete pipeline.
2. `KokoroAdapter` — preferred fast local neural narrator.
3. `RecordedVoiceAdapter` — accepts narration recorded by the user.
4. `ChatterboxAdapter` — optional expressive or consented voice-cloning tier.
5. `PiperAdapter` — optional low-resource/language fallback after license review.

The TTS interface must expose whether timing is native, predicted, forced-aligned, or ASR-derived.

### Alignment strategy

1. Always synthesize sentence or short-phrase chunks.
2. Record exact chunk boundaries from sample counts.
3. Use native Kokoro token timings where available.[8]
4. Use whisper.cpp as a lightweight transcript/timing validator.[9]
5. Add forced alignment later if word-level karaoke timing is not accurate enough.

### Audio QC

Reject or flag chunks with:

- clipping;
- excessive leading/trailing silence;
- abnormal duration relative to normalized text length;
- transcription mismatch;
- missing or repeated words;
- sample-rate/channel mismatch.

Do not regenerate the whole narration when one chunk fails. Regenerate only the failed content-addressed chunk, then rebuild the timeline.

## 7. Visual Architecture

### Deterministic asset providers

- React/SVG template library
- Mermaid-to-SVG or a native constrained graph layout
- Shiki syntax highlighting
- Playwright page and component capture
- icon library with license metadata
- user-provided screenshots, logos, images, and clips
- chart renderer driven by explicit data
- FFmpeg transforms for crop, scale, pan, zoom, blur, and final media processing

### Generated stills

Run ComfyUI as an optional local asset service, not as the master timeline. Its workflows can be submitted through a local API and its execution model caches unchanged graph portions, which fits versioned, reusable generation recipes.[10]

Keep every workflow pinned with:

- workflow JSON hash;
- checkpoint and LoRA identifiers;
- model and node licenses;
- seed and prompt;
- input asset hashes;
- generation duration and hardware metadata.

FLUX.2 Klein is a good candidate for the fast/balanced image adapter because the official project describes distilled 4B variants, Apache licensing for the 4B models, and consumer-hardware deployment.[11] Actual speed on this Mac must be benchmarked before setting a deadline guarantee.

Generated text inside images is never authoritative. Overlay all explainer wording with the deterministic renderer.

### Avatar option

An avatar is a scene type, not the foundation of the product. A prepared presenter can make introductions, transitions, and conclusions feel more personal, but a face on screen for the entire video adds generation cost without necessarily improving comprehension.

MuseTalk reports real-time-capable lip-sync on its documented NVIDIA setup and provides an MIT-licensed codebase, with dependent models retaining their own terms.[12] On Apple Silicon, benchmark before offering it in `fast`; otherwise place avatar rendering in `balanced` or cloud-assisted profiles.

### Full generative video

Wan2.2 offers open model families for text/image-to-video and speech/animation workflows, including a smaller TI2V model and much heavier mixture-of-experts variants.[13] These systems belong only in optional short B-roll shots. They are too expensive and nondeterministic to control the factual timeline or satisfy a hard two-minute build target reliably.

The fallback ladder is:

```text
generated video
  -> generated image with depth/parallax
  -> ordinary still with pan/zoom
  -> diagram/iconography
  -> kinetic typography
```

## 8. Production Manifest

Create a renderer-neutral manifest similar to:

```json
{
  "version": "1",
  "title": "Why Whisper is not text-to-speech",
  "profile": "fast",
  "targetDurationMs": 75000,
  "theme": "technical-whiteboard",
  "narration": {
    "voice": "kokoro:af_heart",
    "music": false
  },
  "scenes": [
    {
      "id": "scene-001",
      "kind": "diagram",
      "narration": "Whisper turns audio into text. Text-to-speech goes the other direction.",
      "visual": {
        "nodes": ["Audio", "Whisper", "Text", "TTS", "Narration"],
        "emphasis": ["Whisper", "TTS"]
      },
      "cues": [
        {"atWord": "Whisper", "action": "highlight", "target": "whisper-node"}
      ]
    }
  ]
}
```

Use Zod plus generated JSON Schema. The LLM-facing schema should reject unknown scene kinds, arbitrary file paths, raw shell commands, executable JavaScript, and unbounded URLs.

## 9. Proposed Repository Layout

```text
explain-to-me/
  apps/
    cli/                    # user commands and job progress
    studio/                 # later: local review/edit UI
    renderer-remotion/      # initial production renderer
  packages/
    contracts/              # Zod schemas and shared types
    ingest/                 # artifact normalization
    director/               # script/storyboard/manifest generation
    timeline/               # audio-derived cue and scene timing
    assets/                 # asset provider interfaces and cache
    audio/                  # TTS, alignment, mixing, QC
    renderer-core/          # renderer-neutral contracts
    renderer-revideo/       # license/throughput fallback POC
    quality/                # profiles and deadline scheduler
    validation/             # audiovisual QA and report generation
  services/
    local-models/           # Python adapters for Kokoro/ComfyUI/etc.
  templates/
    technical-whiteboard/
    clean-corporate/
    playful-explainer/
  fixtures/
    inputs/
    golden-manifests/
  docs/
    architecture/
    plans/
```

## 10. Implementation Phases

### Task 1: Record architecture and acceptance benchmarks

**Objective:** Turn the product concept into measurable acceptance criteria before selecting model defaults.

**Files:**
- Create: `README.md`
- Create: `docs/architecture/0001-system-boundaries.md`
- Create: `docs/architecture/0002-renderer-selection.md`
- Create: `docs/benchmarks/acceptance.md`

**Steps:**

1. Define supported MVP input as Markdown/plain text plus local images.
2. Define a 60-second golden explainer fixture.
3. Define success: valid MP4, intelligible audio, caption coverage, no scene overruns, deterministic rerender, and measured wall time.
4. Record separate targets for cold and warm cache.
5. Record Remotion license constraints and the Revideo exit strategy.
6. Commit documentation separately.

**Verification:** A reviewer can answer exactly what the MVP supports, what "fast" means, and which features are explicitly deferred.

### Task 2: Bootstrap the TypeScript monorepo

**Objective:** Create the package boundaries and quality gates.

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `vitest.workspace.ts`
- Create: `apps/cli/`
- Create: `packages/contracts/`

**Steps:**

1. Initialize pnpm workspace and strict TypeScript.
2. Add lint, format, typecheck, and test scripts.
3. Add a `doctor` command that checks Node, FFmpeg, ffprobe, fonts, available TTS backends, GPU/model services, and writable cache space.
4. Write failing CLI smoke tests.
5. Implement the minimum CLI until tests pass.
6. Commit.

**Verification:** `pnpm test && pnpm typecheck && pnpm explain-to-me doctor` pass locally.

### Task 3: Define and validate `ProductionManifest`

**Objective:** Establish the stable contract between AI planning and deterministic execution.

**Files:**
- Create: `packages/contracts/src/production-manifest.ts`
- Create: `packages/contracts/schema/production-manifest.schema.json`
- Create: `packages/contracts/test/production-manifest.test.ts`
- Create: `fixtures/golden-manifests/whisper-vs-tts.json`

**Steps:**

1. Write tests for valid and invalid manifests.
2. Define scene discriminated unions and bounded media references.
3. Reject executable code and unsafe paths.
4. Generate JSON Schema from the canonical types.
5. Validate the golden manifest.
6. Commit.

**Verification:** malformed scene kinds, path traversal, unknown properties, and invalid timings fail with actionable errors.

### Task 4: Implement artifact ingestion and direction

**Objective:** Convert a source artifact into a script and renderer-neutral storyboard.

**Files:**
- Create: `packages/ingest/src/markdown.ts`
- Create: `packages/director/src/director.ts`
- Create: `packages/director/src/prompts/production-manifest.md`
- Create: `packages/director/test/director.test.ts`

**Steps:**

1. Normalize Markdown into sections, code blocks, links, images, and source metadata.
2. Define a provider-neutral LLM interface.
3. Require structured output matching the manifest schema.
4. Add deterministic repair/retry only for schema errors.
5. Add duration budgeting based on narration word count, but treat it as a draft estimate.
6. Commit.

**Verification:** the golden input produces a valid manifest without executing generated code.

### Task 5: Build the audio chunk pipeline with macOS speech

**Objective:** Produce real narration and an exact chunk timeline with no downloaded model dependency.

**Files:**
- Create: `packages/audio/src/tts.ts`
- Create: `packages/audio/src/adapters/macos-speech.ts`
- Create: `packages/audio/src/chunk-manifest.ts`
- Create: `packages/audio/test/macos-speech.test.ts`

**Steps:**

1. Write tests for sentence chunking and concatenated offsets.
2. Generate one audio file per narration chunk.
3. Probe files with ffprobe and record sample counts/durations.
4. Concatenate without losing chunk boundaries.
5. Emit caption segments at sentence granularity.
6. Commit.

**Verification:** the golden narration produces playable audio, monotonic chunk offsets, and captions ending at the measured audio duration.

### Task 6: Add Kokoro and whisper.cpp adapters

**Objective:** Upgrade voice quality and add local transcript/timing QC.

**Files:**
- Create: `services/local-models/kokoro_service.py`
- Create: `packages/audio/src/adapters/kokoro.ts`
- Create: `packages/audio/src/alignment/whisper-cpp.ts`
- Create: `packages/audio/src/qc/transcript-match.ts`
- Create: `packages/audio/test/kokoro-contract.test.ts`

**Steps:**

1. Isolate Python dependencies from the Node workspace.
2. Preserve Kokoro token timing metadata when present.
3. Add a health/capabilities endpoint or subprocess protocol.
4. Run whisper.cpp only when timing or transcript QC is requested.
5. Fuzzy-match recognized words to intended words and report confidence.
6. Fall back to sentence timing when word alignment is unreliable.
7. Commit.

**Verification:** switching TTS adapters does not alter renderer-facing contracts; bad narration chunks are detected and isolated.

### Task 7: Implement the first deterministic renderer

**Objective:** Render the golden manifest into a complete video using only deterministic assets.

**Files:**
- Create: `apps/renderer-remotion/`
- Create: `packages/renderer-core/src/renderer.ts`
- Create: `apps/renderer-remotion/src/compositions/Explainer.tsx`
- Create: `apps/renderer-remotion/src/scenes/`
- Create: `apps/renderer-remotion/test/render-smoke.test.ts`

**Steps:**

1. Implement renderer-neutral input contracts.
2. Build title, statement, bullets, diagram, code, image, and outro scenes.
3. Drive frame durations from the measured timeline.
4. Add captions and safe-area checks.
5. Render a low-resolution smoke video.
6. Render the full golden video.
7. Commit.

**Verification:** ffprobe confirms expected duration, frame rate, video stream, and audio stream; no scene exceeds its assigned interval.

### Task 8: Implement asset providers and caching

**Objective:** Make visual acquisition parallel, reproducible, and cheap to retry.

**Files:**
- Create: `packages/assets/src/provider.ts`
- Create: `packages/assets/src/cache.ts`
- Create: `packages/assets/src/providers/playwright.ts`
- Create: `packages/assets/src/providers/local-file.ts`
- Create: `packages/assets/test/cache.test.ts`

**Steps:**

1. Define an asset request/result contract with provenance and license fields.
2. Implement content-addressed storage.
3. Add local-file and Playwright capture providers.
4. Deduplicate concurrent identical requests.
5. Add cancellation and per-provider deadlines.
6. Commit.

**Verification:** a warm rerun performs no repeated capture or generation work and produces identical asset hashes.

### Task 9: Implement quality profiles and deadline-aware scheduling

**Objective:** Make speed/quality an explicit, testable product feature.

**Files:**
- Create: `packages/quality/src/profiles.ts`
- Create: `packages/quality/src/deadline-scheduler.ts`
- Create: `packages/quality/test/deadline-scheduler.test.ts`

**Steps:**

1. Encode `preview`, `fast`, `balanced`, and `cinematic` policies.
2. Add stage budgets and downgrade rules.
3. Emit progress and downgrade events.
4. Test simulated slow and failed providers.
5. Ensure deterministic fallback completes the job.
6. Commit.

**Verification:** a simulated image/video generator timeout still yields a valid video before the test deadline.

### Task 10: Add optional ComfyUI still generation

**Objective:** Add visual variety without putting model generation on the critical path.

**Files:**
- Create: `packages/assets/src/providers/comfyui.ts`
- Create: `services/local-models/workflows/explainer-still.json`
- Create: `packages/assets/test/comfyui-contract.test.ts`

**Steps:**

1. Detect ComfyUI and required models in `doctor`.
2. Submit a pinned workflow through the local API.
3. Capture workflow/model/node license metadata.
4. Cache by normalized prompt, workflow hash, model hash, inputs, and seed.
5. Implement deadline cancellation and deterministic fallback.
6. Commit.

**Verification:** with ComfyUI unavailable, `fast` still succeeds; with it available, a generated still is incorporated and fully recorded in the report.

### Task 11: Build the Revideo portability spike

**Objective:** Prove that the manifest is not accidentally coupled to Remotion.

**Files:**
- Create: `packages/renderer-revideo/`
- Create: `packages/renderer-revideo/test/golden-render.test.ts`
- Create: `docs/benchmarks/renderer-comparison.md`

**Steps:**

1. Implement title, statement, diagram, and image scenes.
2. Render the same golden manifest with both engines.
3. Measure duration accuracy, render wall time, memory, audio sync, and visual parity.
4. Record missing capabilities and migration cost.
5. Decide whether Revideo remains a fallback or becomes the default.
6. Commit.

**Verification:** both engines accept the same manifest and produce probe-valid media.

### Task 12: Add final audiovisual validation

**Objective:** Prevent a technically successful render from being declared complete when it is silent, truncated, or visually broken.

**Files:**
- Create: `packages/validation/src/media-probe.ts`
- Create: `packages/validation/src/audio-qc.ts`
- Create: `packages/validation/src/frame-sampler.ts`
- Create: `packages/validation/src/report.ts`
- Create: `packages/validation/test/golden-video.test.ts`

**Steps:**

1. Validate streams, duration, resolution, and frame rate with ffprobe.
2. Detect silence, clipping, black frames, frozen stretches, and missing captions.
3. Sample frames at every scene boundary.
4. Optionally run whisper.cpp against final mixed audio.
5. Emit a machine-readable report and concise human summary.
6. Commit.

**Verification:** deliberately silent, truncated, and black test videos fail for the expected reason; the golden video passes.

### Task 13: Add the local Studio after the CLI is stable

**Objective:** Provide review and targeted regeneration without turning the MVP into a full nonlinear editor.

**Files:**
- Create: `apps/studio/`

**Scope:**

- import or open a production manifest;
- preview video and scene boundaries;
- edit script, scene type, visual prompt, and profile;
- regenerate one narration chunk, asset, scene, or the whole video;
- compare preview and final outputs;
- display provenance, license, cache, and timing metadata.

**Verification:** changing one scene invalidates only that scene and downstream mux/report stages, not unrelated generated assets.

## 11. MVP Boundary

The first releasable version should include:

- Markdown/plain-text input;
- schema-constrained direction;
- Apple voice plus Kokoro;
- sentence captions and optional word timing;
- deterministic title, text, bullets, diagram, code, image, and outro scenes;
- Remotion renderer;
- Playwright/local asset providers;
- four quality profiles;
- content-addressed cache;
- ffprobe/audio/frame validation;
- one 60-second golden explainer produced end to end.

Explicitly defer:

- fully generated long-form video;
- automatic full-body presenters;
- collaborative cloud editing;
- a general-purpose NLE timeline;
- arbitrary user-authored renderer code;
- automatic publishing;
- 4K as a default.

## 12. Acceptance Criteria

A milestone is complete only when all of the following are exercised on the actual machine:

1. `explain-to-me build fixtures/inputs/whisper-vs-tts.md --profile preview` produces all promised artifacts.
2. The output video contains both audio and video streams and matches narration duration within a documented tolerance.
3. Captions cover every narration chunk and never move backward in time.
4. The final narration passes transcript-match QC or clearly reports why that check was skipped.
5. A second warm-cache build performs no redundant TTS, capture, or generation work.
6. Killing ComfyUI or withholding optional model assets does not prevent `preview` or `fast` completion.
7. A scene-level edit regenerates only affected stages.
8. The benchmark report records actual wall time, stage timings, hardware, cold/warm cache status, and profile downgrades.
9. Renderer and model licenses are captured with pinned versions.
10. The rendered video is watched end to end; automated probes alone are insufficient for final approval.

## 13. Recommended First Demonstration

Use the subject already exposed by this research: **"Whisper is not text-to-speech."** It naturally exercises the core system:

- input artifact and script generation;
- an audio-flow diagram;
- kinetic labels;
- a short code/CLI card;
- narration and captions;
- a comparison scene;
- deterministic visuals requiring no external image model.

Build it first with the macOS voice and `preview`, then rerun with Kokoro and `fast`. Only after those runs are timed and validated should generated stills or avatars be added.

## Sources

[1] https://www.remotion.dev/docs/render
[2] https://www.remotion.dev/docs/license/pricing
[3] https://github.com/midrender/revideo
[4] https://github.com/midrender/revideo/blob/main/packages/docs/src/content/guide/rendering-videos.mdx
[5] https://motioncanvas.io/docs/time-events
[6] https://github.com/OpenWhispr/openwhispr/blob/main/LOCAL_WHISPER_SETUP.md
[7] https://github.com/hexgrad/kokoro
[8] https://github.com/hexgrad/kokoro/blob/main/kokoro/pipeline.py
[9] https://github.com/ggml-org/whisper.cpp
[10] https://github.com/Comfy-Org/ComfyUI
[11] https://github.com/black-forest-labs/flux2
[12] https://github.com/TMElyralab/MuseTalk
[13] https://github.com/Wan-Video/Wan2.2
