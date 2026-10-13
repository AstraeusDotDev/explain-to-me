# Explain-to-Me Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Build a local-first system that converts a source artifact into a narrated, captioned, visually engaging explainer video in roughly a few minutes, with explicit speed-versus-quality profiles.

**Architecture:** A TypeScript orchestrator converts the input into a validated production manifest, generates narration first, derives the master timeline from measured audio, acquires or creates visual assets, and renders the final composition through a deterministic video engine. Model-backed stages are adapters behind stable interfaces, so fast local fallbacks can replace slow or unavailable generators without changing the project manifest.

**Tech Stack:** TypeScript, Node.js, pnpm, Zod, Remotion or Revideo, React, FFmpeg/ffprobe, Playwright, Kokoro or Apple speech synthesis, whisper.cpp/OpenWhispr-compatible local models, optional ComfyUI, Vitest, and JSON Schema.

---

## Build Progress

The prepared-manifest prototype is implemented, and the user approved progression. PCM/render caching and the local Kokoro portion of Task 10 were brought forward for the next iteration under [the phase-2 execution plan](phase-2-cache-and-natural-narration.md). Measured evidence is in [phase-2 results](../benchmarks/phase-2-results.md). Human watch/listen approval and whole-process egress proof are still pending; this is not full-MVP acceptance. Resume with Task 9 ingestion/direction after voice feedback, rather than repeating the prototype or cache build.

## Execution Priority (Approved Revision)

First prove a prepared manifest -> Apple speech -> measured timeline -> deterministic rendering -> captions/mux -> validation -> human-reviewed local video. This first milestone does not include automated direction, neural speech models, caching guarantees, or multiple quality policies. Those follow a successful end-to-end run. The ADRs and acceptance benchmark define the safety/acceptance details; the revised task order below is authoritative for execution.

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
- add a Revideo proof of concept after the releasable MVP, before declaring the renderer architecture settled; it must render the unchanged complete golden manifest, not a reduced subset.

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
- The deadline manager may skip or downgrade optional stages, reserving time for mandatory production and validation. An infeasible mandatory-stage deadline fails explicitly; it is not a guarantee of completion.
- With `--allow-cloud false` (default), all build stages must make zero external requests. Prepared-manifest execution bypasses direction; the later template director provides a guaranteed offline fallback.
- Requested duration and measured duration are distinct. Allow at most two corrections after initial synthesis, within pinned conservative voice-rate bounds; fail explicitly if duration/intelligibility requirements cannot be met. Never truncate narration or insert long silence to manufacture a pass.

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
    "voicePreference": "local-neural",
    "music": false
  },
  "scenes": [
    {
      "id": "scene-001",
      "kind": "diagram",
      "narration": [{"id": "chunk-001", "text": "Whisper turns audio into text. Text-to-speech goes the other direction."}],
      "visual": {
        "nodes": [
          {"id": "audio-node", "label": "Audio"},
          {"id": "whisper-node", "label": "Whisper"},
          {"id": "text-node", "label": "Text"},
          {"id": "tts-node", "label": "TTS"},
          {"id": "narration-node", "label": "Narration"}
        ],
        "emphasis": ["whisper-node", "tts-node"]
      },
      "cues": [
        {"chunkId": "chunk-001", "tokenIndex": 0, "action": "highlight", "target": "whisper-node", "timingFallback": "sentence-start"}
      ]
    }
  ]
}
```

Cue indices are zero-based against versioned narration token normalization. Resolved cue timestamps, selected provider voices, and timing-fallback use belong in the build record. This example illustrates intent, not a finalized schema or the complete golden fixture.

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

## 10. Implementation Phases — Revised Execution Order

The first milestone is a real, watchable local video, not the complete framework. Tasks 1–7 establish that milestone without an LLM, downloaded speech model, cloud service, browser capture provider, or generated visual dependency. Tasks 8–13 complete the releasable MVP. Tasks 14–16 are post-MVP work.

Implement each code task with failing tests first, observe the failure, implement the minimum behavior, rerun relevant tests/typechecks, and commit only the task's files. The steps below are task boundaries; split them into small TDD increments during execution. Do not create empty packages for later phases.

### Task 1: Reconcile architecture and freeze the first milestone

**Objective:** Establish one consistent acceptance contract before coding.

**Files:** `README.md`, `docs/architecture/0001-system-boundaries.md`, `docs/architecture/0002-renderer-selection.md`, `docs/benchmarks/acceptance.md`, this plan.

**Steps:**
1. Record the first milestone and distinguish it from releasable MVP acceptance.
2. Keep the offline policy, canonical local-file boundary, full golden-fixture portability rule, and renderer-neutral intent/build-record separation authoritative.
3. Define duration correction, cue identities, and downstream invalidation semantics.
4. Check documentation consistency and commit documentation separately.

**Verification:** `git diff --check`; all documents identify prepared-manifest execution as the first milestone, not a completed text-to-video product.

### Task 2: Bootstrap only the executable spine

**Objective:** Create the minimum TypeScript workspace and CLI needed for the local golden path.

**Files:** `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, test configuration appropriate to pinned Vitest, `apps/cli/`, `packages/contracts/`.

**Steps:**
1. Pin Node/pnpm/dependency versions; add strict TypeScript, lint, format, typecheck, and test scripts.
2. Write failing CLI argument and doctor tests.
3. Implement `doctor` for Node, FFmpeg, ffprobe, Apple speech, bundled fonts, and writable output/cache locations. Optional backends are informational, not blockers.
4. Add CLI parsing for the first milestone command; do not claim build success until Task 7 wires execution.

**Verification:** `pnpm test && pnpm typecheck && pnpm explain-to-me doctor`; no unnecessary later-stage packages.

### Task 3: Freeze the manifest, cue contract, and golden fixture

**Objective:** Establish renderer-neutral production intent without model generation.

**Files:** `packages/contracts/src/production-manifest.ts`, `packages/contracts/schema/production-manifest.schema.json`, `packages/contracts/test/production-manifest.test.ts`, `fixtures/inputs/whisper-vs-tts.md`, `fixtures/golden-manifests/whisper-vs-tts.json`.

**Steps:**
1. Write validation tests for scene discriminated unions, unknown fields, unsafe references, duplicate IDs, dangling cue targets, and invalid timing intent.
2. Give diagram nodes and all cue targets stable IDs. Anchor speech cues by chunk ID plus normalized token index, never an ambiguous word string.
3. Freeze a prepared manifest covering title/statement, diagram, kinetic labels, comparison, code card, and outro.
4. Generate JSON Schema from canonical contracts; validate the fixture.
5. Keep providers, renderer settings, resolved timings, and environment in the build record, not production intent.

**Verification:** `pnpm test && pnpm typecheck`; the prepared manifest validates and requires no runtime model call or remote assets.

### Task 4: Produce Apple narration and measured timing

**Objective:** Turn the golden script into playable narration and sentence captions with exact chunk boundaries.

**Files:** `packages/audio/src/tts.ts`, `packages/audio/src/adapters/macos-speech.ts`, `packages/audio/src/chunk-manifest.ts`, `packages/audio/test/macos-speech.test.ts`, `packages/timeline/src/timeline.ts`, `packages/timeline/test/timeline.test.ts`.

**Steps:**
1. Test deterministic chunk IDs, sentence segmentation, normalization, and cumulative sample offsets.
2. Synthesize chunks with Apple speech through argument-safe subprocess calls; normalize to one documented PCM sample rate/channel layout.
3. Measure decoded sample counts, concatenate chunks, derive scene intervals, and emit VTT/SRT sentence captions.
4. Resolve token-index cues only when reliable timing exists; otherwise use a declared sentence-level fallback, recorded in the report.
5. Test frame-boundary rounding and monotonic captions without accumulated scene drift.

**Verification:** playable `audio.wav`, sample-based offsets, both caption formats, and final caption end within the pinned tolerance. Live Apple-speech integration is exercised, not only mocked.

### Task 5: Implement bounded duration control

**Objective:** Make the requested duration enforceable rather than a word-count estimate.

**Files:** `packages/timeline/src/duration-policy.ts`, `packages/timeline/test/duration-policy.test.ts`, `packages/audio/src/duration-correction.ts`.

**Steps:**
1. Record requested duration, measured narration duration, tolerance, and correction attempts separately.
2. Use a pinned maximum of two corrections after initial synthesis. For prepared-manifest execution, adjust Apple speech rate within a documented conservative range; never silently truncate words or add long silence to manufacture a pass.
3. Regenerate only chunks whose effective text/voice/rate changed, then remeasure and rebuild the timeline.
4. If no intelligible in-range result is obtained, fail clearly; do not publish a successful build report.
5. Add below/inside/above-tolerance, exhausted-retry, and changed-chunk tests. Later direction may explicitly rewrite narration under the same bounded policy, producing a new validated manifest.

**Verification:** the golden narration is within 59.000–61.000 seconds; boundary tests pass and infeasible inputs fail with actual measured duration and corrective guidance.

### Task 6: Render deterministic scenes through the adapter

**Objective:** Produce video frames for the complete golden manifest.

**Files:** `packages/renderer-core/src/renderer.ts`, `apps/renderer-remotion/src/compositions/Explainer.tsx`, `apps/renderer-remotion/src/scenes/`, `apps/renderer-remotion/test/render-smoke.test.ts`.

**Steps:**
1. Define neutral renderer requests containing validated intent, measured timeline, approved local assets, and render settings.
2. Implement title, statement/kinetic labels, diagram, comparison, code, and outro; add bullets/image before releasable MVP acceptance.
3. Use bundled fonts, seeded animation, and the measured timeline; prohibit external browser requests.
4. Smoke-render a short low-resolution fixture, then the unchanged complete golden manifest at preview settings.

**Verification:** video-only media decodes, every golden scene/cue is represented, and scene intervals obey the one-frame tolerance. This is not yet final build success.

### Task 7: Wire build, mux, validation, and atomic publication — First Milestone

**Objective:** One command produces all six artifacts and a watchable local video.

**Files:** `apps/cli/src/build.ts`, `packages/audio/src/mux.ts`, `packages/validation/src/media-probe.ts`, `packages/validation/src/report.ts`, `apps/cli/test/build.integration.test.ts`.

**Command:**
```bash
pnpm explain-to-me build --manifest fixtures/golden-manifests/whisper-vs-tts.json --profile preview --duration 60s
```

**Steps:**
1. Connect manifest validation, Apple narration, bounded duration correction, timeline/captions, rendering, audio muxing, and validation.
2. Write into a unique staging directory; refuse destructive output collisions. Publish a completed output directory only after required automated gates pass; preserve actionable failure diagnostics separately.
3. Emit `video.mp4`, `audio.wav`, `captions.vtt`, `captions.srt`, `manifest.json`, and `report.json` with matching build identity and provenance.
4. Probe/decode MP4; check actual container/audio/video duration, audio/video-end sync, captions, scene boundaries, silence/clipping, and sampled frames.
5. Capture monotonic total/stage timings, version/license metadata, effective rate/cue fallbacks, and zero-egress evidence. Record unavailable ASR explicitly; never pretend it ran.
6. Watch/listen end to end and record manual approval separately from automated pass status.

**Verification:** run the command on the actual machine; all six artifacts exist, the video passes the first-milestone gates in the benchmark, and human review confirms it is intelligible and watchable. Report actual elapsed time, not estimated throughput. Stop here for review before expanding scope.

### Task 8: Add content-addressed caching and invalidation

**Objective:** Avoid redundant work while keeping changes correct.

**Files:** `packages/assets/src/cache.ts`, `packages/assets/test/cache.test.ts`, `apps/cli/src/build-graph.ts`, `apps/cli/test/invalidation.test.ts`.

**Steps:**
1. Key stages by normalized inputs, relevant configuration/version, seeds, and dependency hashes; use atomic writes and deduplicate concurrent identical requests.
2. Cache narration chunks, static assets, resolved timelines, and suitable render outputs.
3. Test unchanged reruns, text edits, voice/rate changes, visual-only edits, corruption, and interrupted writes.
4. Narration-duration edits invalidate the downstream timeline/captions/composition, mux, and validation. Preserve unrelated audio/assets; never promise whole-video encoding is scene-local.

**Verification:** second unchanged build performs no redundant synthesis/capture/generation; pinned decoded media and intent/timeline hashes match, with cache evidence in paired reports.

### Task 9: Add safe ingestion and an explicit director

**Objective:** Complete the text-to-video path without hiding a cloud dependency.

**Files:** `packages/ingest/src/markdown.ts`, `packages/ingest/test/local-boundary.test.ts`, `packages/director/src/director.ts`, `packages/director/src/adapters/template.ts`, `packages/director/test/director.test.ts`, `docs/architecture/0003-director-backends.md`.

**Steps:**
1. Normalize local Markdown/plain text; enforce ADR 0001 canonical roots, traversal/symlink rules, limits, and non-execution policy.
2. Implement a deterministic extractive/template director as the guaranteed offline fallback. State its limitations; do not label template extraction as AI summarization.
3. Define the model adapter and schema-error retry contract, treating source content as untrusted data.
4. Before adding a local model adapter, record the concrete runtime/model, installed prerequisites, license, output reliability, and real hardware benchmark in ADR 0003. Until selected and exercised, report it unavailable rather than assuming a local LLM exists.
5. Cloud direction is optional, configured explicitly, and requires `--allow-cloud true`. Subscription-backed development tools are not implicit runtime API adapters.
6. Integrate bounded narration rewriting for directors that support it; retain conservative speech-rate correction and explicit failure for infeasible durations.

**Verification:** the documented text-input golden command completes with cloud disabled using the offline fallback; a configured model adapter, if implemented, is tested separately. Invalid or unsupported input fails safely.

### Task 10: Upgrade voice and optional transcript QC

**Objective:** Add Kokoro and whisper.cpp only after the complete Apple path works.

**Files:** `services/local-models/kokoro_service.py`, `packages/audio/src/adapters/kokoro.ts`, `packages/audio/src/alignment/whisper-cpp.ts`, `packages/audio/src/qc/transcript-match.ts`, adapter contract tests.

**Steps:** isolate Python dependencies; pin models/licenses; expose capabilities/health; retain timing provenance; test missing services, unreliable word timing, bad chunks, and deadline cancellation; use Apple/sentence fallback where allowed.

**Verification:** golden builds exercise both real TTS backends when installed; unavailable ASR is explicitly reported; switching providers leaves public intent contracts neutral.

### Task 11: Complete deterministic assets and scene coverage

**Objective:** Support local images, bullets, and safe static browser captures.

**Files:** `packages/assets/src/provider.ts`, `packages/assets/src/providers/local-file.ts`, `packages/assets/src/providers/playwright.ts`, provider tests, remaining renderer scene components.

**Steps:** enforce bounded media IDs and canonical reads; capture provenance/licenses; bundle static browser content/fonts; block and record browser network attempts; add per-provider deadlines/cancellation and cache reuse.

**Verification:** ordinary/in-root symlink fixtures pass, traversal/dangling/escaping fixtures fail; a remote subresource attempt fails; unchanged captures are cached; all declared MVP scenes render.

### Task 12: Add measured quality policies and deadline scheduling

**Objective:** Expand from one reliable preview policy to explicit speed/quality choices.

**Files:** `packages/quality/src/profiles.ts`, `packages/quality/src/deadline-scheduler.ts`, scheduler tests.

**Steps:** add fast after measuring preview; define balanced/cinematic as documented policies without pretending deferred generators exist; reserve time for rendering/mux/validation; bound cancellation and optional stages; emit downgrade events.

**Verification:** fault-injected optional-stage slowness falls back within a controlled test budget. Impossible mandatory-stage deadlines fail explicitly; a valid-video guarantee is not claimed for arbitrary deadlines.

### Task 13: Complete releasable MVP validation and benchmarks

**Objective:** Exercise every full-MVP acceptance gate before declaring release readiness.

**Files:** `packages/validation/src/audio-qc.ts`, `packages/validation/src/frame-sampler.ts`, golden/bad-media tests, `docs/benchmarks/acceptance.md` measured records.

**Steps:** test silent/truncated/black media; distinguish intentional static scenes from broken freezes; run preview/fast cold/warm builds, determinism comparisons, boundary fixtures, external-egress deny harness, and optional-service fault injection; pin QC thresholds; retain raw reports; watch complete outputs.

**Verification:** every applicable full-MVP acceptance row has real evidence and required human approval. Target misses remain reported misses.

### Task 14: Revideo portability spike — Post-MVP, before renderer settlement

**Files:** `packages/renderer-revideo/`, golden render tests, `docs/benchmarks/renderer-comparison.md`.

Render the unchanged complete golden manifest with both engines, covering every instantiated scene and cue or predeclared neutral fallback. Compare timing, sync, visual coverage, wall time, memory, licensing, and migration cost. A reduced fixture is not a pass. Keep adapter boundaries from Task 3; do not build a second engine before the first local milestone.

### Task 15: Optional ComfyUI assets — Post-MVP

**Files:** `packages/assets/src/providers/comfyui.ts`, pinned workflows and contract tests.

Add generated stills only after real benchmarks, license review, caching, provenance, and bounded cancellation. Absence of ComfyUI must never break preview/fast. Generated video and avatars remain separate deferred experiments.

### Task 16: Local Studio — Post-MVP

**Files:** `apps/studio/` and invalidation integration tests.

Add manifest review, preview, script/visual edits, targeted regeneration, and provenance display. Visual-only edits retain unrelated narration/assets; narration edits retain unrelated chunks/assets but invalidate affected downstream timing and composition. Verify reuse explicitly; do not promise scene-local final encoding.

## 11. MVP Boundary

The first milestone is the prepared-manifest Apple/preview video defined in Task 7. It is intentionally narrower than release readiness. The first releasable version should include:

- Markdown/plain-text input;
- schema-constrained direction with a guaranteed offline extractive/template fallback and explicit model-adapter availability;
- Apple voice plus Kokoro;
- sentence captions and optional word timing;
- deterministic title, statement/kinetic labels, bullets, diagram, comparison, code, image, and outro scenes;
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

The releasable MVP is complete only when all of the following are exercised on the actual machine. The narrower first-milestone gates are separately defined in `docs/benchmarks/acceptance.md`:

1. `explain-to-me build fixtures/inputs/whisper-vs-tts.md --profile preview` produces all promised artifacts.
2. The output video contains both audio and video streams and matches narration duration within a documented tolerance.
3. Captions cover every narration chunk and never move backward in time.
4. The final narration passes transcript-match QC or clearly reports why that check was skipped.
5. A second warm-cache build performs no redundant TTS, capture, or generation work.
6. Killing ComfyUI or withholding optional model assets does not prevent `preview` or `fast` completion.
7. Visual-only edits preserve unrelated narration/assets. Narration-duration edits invalidate downstream timeline/captions/composition, mux, and validation while preserving unrelated chunks/assets.
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

Build the prepared golden manifest first with the macOS voice and `preview`, including mux/validation and an end-to-end human watch. Then add caching and offline direction, rerun with Kokoro and `fast`, and complete full MVP acceptance. Portability work, generated stills, and Studio follow the releasable MVP; avatars remain deferred.

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
