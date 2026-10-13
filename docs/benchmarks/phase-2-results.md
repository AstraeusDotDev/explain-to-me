# Phase 2: Cached Builds and Neural Narration — Execution Results

Status: implemented and exercised. Human narrator preference/full watch-through and whole-process zero-egress proof remain pending. User approval to progress is not treated as a fabricated watch/listen record.

## Delivered

Local Kokoro neural TTS with af_heart default, af_bella/am_michael listening samples, explicit Apple fallback, bounded speed correction, pinned model/runtime provenance, and persistent content-addressed PCM/render caches. Auto mode prefers installed Kokoro; explicit unavailable Kokoro fails. No cloud inference.

Cache entries are atomic/private, payload-digest checked and bound to their request key. In-flight factory deduplication is per cache instance, not a cross-process build lock. Separate simultaneous cold CLI builds may duplicate work; they do not publish partial cache entries.

## Actual measurements

Required packages/models/browser were preinstalled; setup/download time is excluded. Cold means no reusable entries for the tested request. Recorded time covers invocation through automated validation, not report publication. Targets are not retroactively changed.

Early implementation measurements (before executable-identity review fixes):

| Run | Backend / voice | Seconds through validation | Narration hits / misses | Render cache hit |
|---|---|---:|---:|---|
| phase-2-kokoro-cold | kokoro / af_heart | 64.779 | 0 / 18 | False |
| phase-2-kokoro-warm | kokoro / af_heart | 2.149 | 18 / 0 | True |
| phase-2-visual-edit | kokoro / af_heart | 36.218 | 18 / 0 | False |
| phase-2-apple-compat | apple / Samantha | 47.015 | 0 / 18 | False |
| phase-2-apple-warm | apple / Samantha | 2.239 | 18 / 0 | True |

Initial neural MP4 duration: 60.666667 seconds, 1280×720 at 24 fps. A/V end difference: 0.667 ms. Final neural speed: 1.189; duration attempts: 3 (at most two corrections). All current automated media gates passed.

The unchanged neural warm build generated zero missing narration chunks and zero new frames. Decoded video-frame and audio-sample digests matched cold versus warm; evidence: `out/phase-2-kokoro-warm/comparison.json`. Visual-only subtitle editing reused all narration and regenerated rendering. Apple cold/warm compatibility also passed with unchanged warm synthesis/render reuse.

Typechecking and eight focused tests passed. Real render/probe/decode output remains the main integration evidence. This is not full-MVP acceptance.

## Voice listening samples

`out/phase-2-voice-samples/af_heart.wav`, `af_bella.wav`, and `am_michael.wav` contain the same comparison text. They contain roughly 12–13 seconds of speech each and took roughly two seconds each to synthesize after model load. Actual samples/timings are in `samples.json`. Naturalness and preferred voice require human listening; probes cannot approve those qualities.

## Setup and reproducibility

Run `python3 scripts/setup-kokoro.py` during setup only. Python 3.11 uses `.venv-kokoro`; exact dependencies are in `services/local-models/requirements-kokoro.txt`. Kokoro ONNX v1.0 full-precision weights use release `model-files-v1.1`.

Model SHA256: `beb0d1848dee9a49da392cc3df26958d46cfa35d321edf434f52949153f0df3a`.
Voice pack SHA256: `bca610b8308e8d99f32e6fe4197e7ec01679264efed0cac9140fe9c29f1fbf7d`.

Both assets matched release digests. Model `provenance.json` and output reports record actual model/runtime hashes and source references. kokoro-onnx code is recorded as MIT and Kokoro weights as Apache-2.0; deployment/license suitability is not automatically approved.

## Final reviewed code

Both executable-identity issues from review were corrected: the render key uses the renderer's actual browser selection/version/mode, and Apple hashes/invokes/records the same absolute `/usr/bin/say`. Doctor now prints all collected checks when a browser version probe fails and returns a readiness failure; normal and intentionally failed probes were exercised.

Fresh reviewed-cache neural run: **64.770 seconds** through validation. Unchanged reviewed-cache warm run: **2.162 seconds**. Final MP4 duration: **60.791667 seconds**. Cold narration misses/writes: 18/18; warm narration hits/misses: 18/0; warm render hit: True.

Final cold/warm decoded video/audio hashes match; raw evidence: `out/phase-2-final-warm/comparison.json`. Reviewed Apple synthesis was also exercised cold/warm against the same canonical binary, yielding 18 warm hits and zero misses. Typechecking and all eight tests pass. Sampled neural frames show no observed clipping/overlap; subjective narration quality and full watch/listen remain a user gate. Fresh uncached neural generations are not asserted bit-identical; the demonstrated exact warm reproduction reuses cached PCM and video.

## Delivery / remaining gates

Main output: `out/phase-2-final-cold/video.mp4`, with the other five required artifacts and scene samples. Original prototype: `out/milestone-1-final/video.mp4`.

Renderer-observed external attempts were zero in successful runs; whole-process deny/record proof remains unverified. Captions/cues within measured multi-sentence chunks remain proportional estimates, not forced alignment. Human full watch/listen and narrator preference remain pending. Automatic direction (Task 9), ASR transcript QC, richer profiles, generated assets, and Studio are deferred.

Next: user voice feedback, then safe Markdown/plain-text ingestion with an explicit offline director.
