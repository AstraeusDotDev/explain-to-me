# First-milestone execution results

Status: working prepared-manifest prototype; automated media checks passed. Full milestone acceptance remains pending end-to-end human approval and process-wide external-egress proof. This is not full MVP acceptance.

## Verified execution

Command: `npm exec --cache .cache/npm --offline --yes pnpm@10.18.3 -- explain-to-me build --manifest fixtures/golden-manifests/whisper-vs-tts.json --profile preview --duration 60s --output out/milestone-1-final`

- Build ID: `5992c914-4f84-4329-9c96-6e97cafea626`
- Actual build timestamp: `2026-10-13T16:39:44.731Z`
- Output: `out/milestone-1-final/`
- Container/video duration: 59.875 s
- Audio-stream duration: 59.845 s
- A/V end difference: 30.000 ms
- Narration PCM duration: 59.844375 s
- Resolution/frame rate: 1280×720 / 24 fps
- Measured invocation through automated validation: 47.456 s (report writes/publication are not included in this field)
- Renderer wall time: 33.627 s
- Apple voice: Samantha; final requested rate 184 WPM
- Duration attempts: 3, within the two-correction limit
- Clipped samples: 0
- Required artifact names: all six present and non-empty
- Scene-boundary images: 12
- Renderer-observed external requests: 0; whole-process egress remains unverified
- CPU: Apple M4 Pro; logical CPUs: 14
- Actual render browser: `/Users/tommy.allsup/Development/sandbox/explain-to-me/node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell`

Typechecking passed. Four focused contract/timeline/audio-QC tests passed. Tests remain intentionally lean; actual render/probe/decode and sampled visual inspection are the main implementation evidence. The sampled frames show readable layouts with no observed clipping/overlap. This does not replace the required full human watch/listen.

## Artifacts

`video.mp4`, `audio.wav`, `captions.vtt`, `captions.srt`, `manifest.json`, `report.json`; scene-boundary samples under `samples/` and a review contact sheet when generated.

## Remaining gates / limitations

- Human intelligibility, pacing, and complete watch-through: pending; never automatically approved.
- Whole-process no-egress deny/record harness: not run. The renderer restricts browser requests to its actual serving origin and reported no external attempts on the successful headless run.
- Sentence captions/cue subdivisions within measured multi-sentence chunks are proportional estimates, not forced alignment.
- Remotion distribution/organizational license suitability requires human review; build provenance records pinned versions and the terms reference without claiming legal approval.
- No automatic director, Kokoro, ASR transcript check, persistent content cache, or fast/balanced/cinematic execution yet.
- Warm-cache benchmark/determinism proof: deferred, not passed by assumption.

## Integration fixes exercised

Speech-rate plateau detection preserves the bounded retry policy. Setup installs Remotion Headless Shell rather than permitting normal Chrome background networking. Muxing preserves final video frames without `-shortest`; PNG boundary extraction uses frame indices. Caption endpoints preserve measured chunk boundaries without floating-point overlap. Failed builds retain diagnostic staging records and do not publish successful output.

## Resume

Watch `out/milestone-1-final/video.mp4` first. Obtain human feedback; close remaining first-milestone gates or explicitly revise their acceptance scope before calling the milestone fully accepted. Then proceed to Task 8 caching, not generated assets or Studio.
