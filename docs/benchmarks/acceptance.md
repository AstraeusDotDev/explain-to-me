# MVP Acceptance Benchmark

- **Status:** Acceptance contract; implementation measurements pending
- **Date:** 2026-10-13
- **System boundaries:** [Architecture Decision 0001](../architecture/0001-system-boundaries.md)
- **Renderer decision:** [Architecture Decision 0002](../architecture/0002-renderer-selection.md)
- **Approved plan:** [Explain-to-Me Implementation Plan](../plans/2026-10-13-explain-to-me-implementation-plan.md)

## Purpose

This document defines how the first releasable system is judged. Values labeled **target** are provisional engineering goals. Values labeled **measured** must come from a real build on the actual machine and may not be inferred, estimated, or copied from provider claims.

No performance target in this document is a current performance promise. The prepared-manifest preview implementation has real measurements recorded in [First-milestone results](milestone-1-results.md); full-MVP cold/warm measurements and acceptance are still pending.

## First milestone acceptance (Task 7)

The first milestone is **prepared manifest to a watchable local video**, not full text-to-video release readiness. Its command is:

```bash
pnpm explain-to-me build --manifest fixtures/golden-manifests/whisper-vs-tts.json --profile preview --duration 60s
```

Required first-milestone gates use the same thresholds as the full functional table below: all six artifacts and matching build identity; probe/decode validity; 59.000–61.000 seconds for container/audio/video ends; at most 250 ms A/V-end and caption-end differences; complete monotonic captions; correct golden scene/cue coverage and one-frame scene tolerance; pinned silence/clipping checks; complete end-to-end human intelligibility/visual review; actual monotonic stage/total timings; license/version provenance; and zero external build-time requests with cloud disabled. Validate unsafe manifest references even though the initial fixture requires no image reads. ASR may be unavailable only with an explicit reason.

Use Apple speech and deterministic golden scenes. No runtime LLM, Kokoro, Whisper model, generated asset service, or standalone browser capture provider is needed. Bundle required runtime assets/fonts before the measured build; dependency installation is separate from zero-egress execution.

At most two duration corrections follow initial synthesis, within pinned conservative speech-rate bounds. Record all attempts and actual measured duration. An infeasible duration fails; do not truncate speech or pad long silence to satisfy the interval. Automatic pass and human approval are separate report states. Write to a unique staging directory and publish final artifacts only after required automated gates pass; human approval is then recorded explicitly.

Warm-cache reuse/determinism comparisons, automatic text direction, Kokoro/fast, the complete image-boundary matrix, static-browser capture tests, and optional-stage scheduling/fault injection are deferred to full-MVP tasks. Revideo comparison and ComfyUI/Studio are post-MVP. These deferrals must be reported as **not yet implemented**, not counted as full-MVP passes. The first milestone records elapsed time against the preview target; a target miss remains visible and is not evidence of a performance guarantee.

## Golden fixture

| Field | Contract |
|---|---|
| Fixture name | `whisper-vs-tts` |
| Input path | `fixtures/inputs/whisper-vs-tts.md` |
| Title/topic | **Whisper is not text-to-speech.** |
| Requested duration | 60 seconds |
| Default acceptance profile | `preview` |
| Secondary profile run | `fast`, after the preview run passes |
| Required visual coverage | Title/statement, audio-to-text vs text-to-audio diagram, kinetic labels, comparison, short CLI/code card, outro |
| Required media sources | Markdown/plain text and optional local images only |
| Forbidden critical-path dependencies | Cloud services, generated video, avatar generation, or optional ComfyUI assets |

The fixture should explain that Whisper-family models transcribe audio into text while a text-to-speech engine turns text into audio. It must be understandable without relying on generated stills or remote media.

### Command under test

```bash
explain-to-me build fixtures/inputs/whisper-vs-tts.md \
  --profile preview \
  --duration 60s
```

The CLI may choose a job output directory, but the directory must contain these stable artifacts:

```text
video.mp4
audio.wav
captions.vtt
captions.srt
manifest.json
report.json
```

## Functional acceptance gates

All required gates must pass for the golden build. A skipped check is a failure unless the row explicitly permits a documented skip.

| Area | Testable acceptance criterion | Evidence |
|---|---|---|
| Input boundary | Build uses one existing local Markdown/plain-text source and only image targets whose canonical paths remain within the authoritative input or project-assets roots. Nonexistent/dangling targets, escaping `..` traversal, and symlink-resolved escapes are rejected; an in-root symlink resolving to an in-root image is accepted. | CLI tests, fixture matrix, and validation entries in `report.json` |
| Local-first egress | With the default `--allow-cloud false`, all stages make zero external network requests and transmit no source text/images. Both `preview` and `fast` pass under an egress-deny harness. Playwright renders approved local/static content with browser networking disabled. | Deny-harness request log/count, stage audit, and `report.json` cloud-call ledger |
| Artifacts | All six required artifact names exist, are non-empty, and are associated with the same build ID/manifest hash. | File checks and `report.json` |
| Valid MP4 | `ffprobe` parses `video.mp4`; it contains at least one video stream and one audio stream; decode completes without error. | Probe/decode results in `report.json` |
| Duration | For the requested 60-second output, container duration, video-stream end, and audio-stream end must each be within **59.000 through 61.000 seconds inclusive**. Any value outside that closed interval, or any unavailable value, fails. Audio/video end times must additionally differ by no more than 250 ms. | `ffprobe` fields and duration check |
| Intelligible audio | A human watches/listens end to end and can understand the narration without captions; there are no audible dropouts, repeated chunks, clipping, or abnormal leading/trailing silence. Automated leading/trailing-silence and transcript-match thresholds are versioned and pinned validation configuration; a failed threshold fails unless the contract explicitly permits an unavailable ASR check with a reason in `report.json`. Human intelligibility review remains mandatory and manual. | Signed/manual review entry plus pinned audio/transcript QC configuration and results |
| Caption coverage | Every narration chunk maps to at least one caption segment in both VTT and SRT. Caption times are non-negative and monotonic, segments do not overlap backward, and final caption end is within 250 ms of narration end. | Parsed caption/chunk coverage report |
| Scene timing | Each scene starts no earlier than its assigned interval and ends no later than one output frame beyond that interval. Every scene boundary is sampled for visual review. | Timeline/frame checks and sampled-frame records |
| Deterministic rerender | With all reproducibility inputs captured by the complete build record held identical—normalized input, renderer-neutral manifest, resolved asset hashes, adapter/model versions, configuration, seeds, environment, renderer settings, and cached assets—a warm rerender produces identical manifest/timeline/asset hashes and identical decoded video-frame and audio-sample hashes. Container bytes may differ only for explicitly identified metadata fields. | Hash comparison in paired reports |
| Warm-cache reuse | The second unchanged build performs no TTS synthesis, browser/local capture, or model generation work. Cache hits/misses are enumerated by stage. | Warm `report.json` |
| Optional-service failure | `preview` and `fast` complete when ComfyUI and other optional generators are unavailable; downgrade/fallback decisions are recorded. | Fault-injection build report |
| Wall time | Total elapsed wall time and every stage duration are measured with monotonic timestamps and recorded with hardware/environment, profile, renderer, and cache state. | `report.json` benchmark section |
| License record | Renderer and model names, pinned versions, and reviewed license identifiers/terms references are recorded without adding provider/renderer-specific fields to `ProductionManifest`. | `report.json` provenance |
| Human approval | The rendered video is watched end to end; automated probes alone cannot mark the golden build accepted. | Reviewer/date/result in benchmark record |

The overall requested-duration tolerance is pinned now at ±1.000 second for this 60-second fixture and must be versioned in validation configuration. Boundary values of exactly 59.000 or 61.000 seconds pass; values below 59.000 or above 61.000 seconds fail. The separate 250 ms audio/video-end and caption-end tolerances remain fixed and must also pass.

### Required boundary and egress fixtures

Acceptance includes all of the following automated cases:

- an ordinary in-root image reference passes;
- an in-root symlink whose final target is an in-root image passes and records the canonical target;
- any reference containing a lexical `..` path segment fails, including one that would normalize back inside a root;
- a symlink inside an allowed root whose final target is outside both roots fails;
- a nonexistent or dangling image target fails; and
- `preview` and `fast` builds run with `--allow-cloud false` under an external-egress deny/record harness and produce zero attempted external requests across direction, assets, TTS, rendering, and validation.

The Playwright acceptance fixture uses only bundled or directly injected static content and blocks all browser network requests. A page that attempts any HTTP(S) request or remote subresource fails validation rather than being captured.

## Performance targets versus measurements

### Definitions

- **Cold cache:** no reusable project cache entries for the fixture. Required installed binaries/models may already exist; installation/download time is excluded and the exact preconditions must be recorded.
- **Warm cache:** an immediately repeated build with identical inputs and configuration after one successful cold build. TTS, capture, and generation cache entries are available.
- **Wall time:** monotonic elapsed time from accepted CLI invocation to all required artifacts being fully written and validation/report generation completing.
- **Target:** provisional threshold used to guide implementation. It is not a measured claim.
- **Measured:** observed value from the machine named in `report.json`.

### Provisional targets

| Profile / fixture | Cold-cache target | Warm-cache target | Measured cold | Measured warm | Status |
|---|---:|---:|---:|---:|---|
| `preview`, 60-second golden | <= 180 s | <= 120 s | Not measured | Not measured | Target only |
| `fast`, 60-second golden | <= 180 s | <= 120 s | Not measured | Not measured | Target only |

These targets align with the plan's deadline-oriented, “couple of minutes” intent without asserting that the unimplemented system already achieves it. `fast` means a deadline-aware 1080p-oriented policy using Kokoro when available, Apple speech fallback, deterministic scenes, and at most a few cached/generated stills; it must not depend on full generative video. `preview` prioritizes the earliest watchable deterministic cut, normally at 720p/24 fps with the system voice.

A target miss must be reported with stage timings and any downgrade decisions. Do not relabel a miss as measured success or change a target after seeing results without a dated rationale. Targets can be revised after the first real benchmark, but measured rows remain historical evidence.

## Benchmark procedure

1. Record commit, operating system, CPU, memory, GPU, renderer/version, Node/pnpm/FFmpeg versions, TTS adapter/version, profile settings, and whether optional services are available.
2. Remove only the fixture's content-addressed cache entries; do not include dependency/model installation in wall time.
3. Run the golden `preview` command and capture monotonic total/stage timings.
4. Verify artifact presence, probe/decode results, the fixed duration bounds, timeline bounds, caption coverage, pinned audio/silence QC, hashes, licenses, local-file boundary fixtures, zero-egress evidence, and fallback/downgrade events.
5. Watch the complete video and record the reviewer result.
6. Repeat the identical command without clearing caches.
7. Verify cache reuse and deterministic hashes, then record warm wall time.
8. Repeat under the `fast` profile after preview acceptance.
9. Run at least one fault-injection build with optional visual-generation services unavailable.
10. Run the canonical-path/symlink fixture matrix and the no-external-egress harness for both `preview` and `fast` with cloud disabled.
11. Store the raw results without replacing targets or previous measurements.

## Result record template

| Field | Cold run | Warm run |
|---|---|---|
| Commit | TBD | Same commit required |
| Build/report ID | TBD | TBD |
| Profile | TBD | Same profile required |
| Cache classification | Cold | Warm |
| Total wall time | TBD | TBD |
| Target | TBD | TBD |
| Target result | TBD | TBD |
| MP4 probe/decode | TBD | TBD |
| Audio intelligibility/QC | TBD | TBD |
| Pinned silence configuration/result | TBD | TBD |
| Caption coverage | TBD | TBD |
| Scene overrun count | TBD | TBD |
| Determinism comparison | Baseline hashes | TBD |
| Redundant TTS/capture/generation calls | N/A | Must be zero |
| External requests with cloud disabled | Must be zero | Must be zero |
| Human end-to-end review | TBD | TBD |
| Notes/downgrades | TBD | TBD |

## Deferred acceptance areas

This benchmark does not require fully generated long-form video, full-body presenters, collaborative cloud editing, a general-purpose NLE timeline, arbitrary user-authored renderer code, automatic publishing, default 4K output, the Studio UI, remote input ingestion, or source formats beyond Markdown/plain text plus local images.
