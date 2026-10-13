# Phase 2: Cached Builds and Natural Local Narration

> For Hermes: implement in parallel, with disjoint file ownership and lean checks. Personal Codex subscription; gpt-6-luna with max reasoning for bounded dev work.

Goal: improve the narrator and eliminate repeated synthesis/render work on unchanged builds.

Architecture: preserve the measured-audio/neutral-manifest pipeline. Add a local Kokoro ONNX adapter with explicit model/runtime provenance and bounded speed corrections. Cache PCM chunks and rendered video using content-addressed keys; regenerate only affected dependency closures.

Tech stack: existing TypeScript/Remotion/FFmpeg; isolated Python 3.11, kokoro-onnx 0.6.1, full-precision Kokoro v1.0 weights from model-files-v1.1; no cloud inference.

## Approved reprioritization

User approved progression from the first prototype and asked for a more human-sounding narrator. Execute Task 8 caching and the Kokoro portion of Task 10 together, ahead of automatic direction (Task 9). ASR, full egress harness, input formats, and Studio remain out of scope. Do not interpret general praise as a recorded full human watch/listen approval.

## Tasks and ownership

1. Cache worker: create packages/assets/src/cache.ts and focused cache tests only. Export ContentAddressedCache constructor(root), key(namespace, JSON-compatible input), read(key), write(key, Buffer), getOrCreate(key, async factory), snapshotStats(). Keys are SHA256 of canonical JSON plus namespace/version. Stats shape: {hits, misses, writes, corruptions}. Validate key format, reject corrupt entries using content digest metadata, atomic/private writes, per-instance concurrent `getOrCreate` factory deduplication. Separate concurrent CLI processes may duplicate cold work; a cross-process build lock is deferred. No CLI/audio/root edits.
2. Audio worker: packages/audio/** and services/local-models/kokoro_synthesize.py only. Parent installs Python/model assets. Implement backend selection apple/kokoro/auto in synthesizeNarration, preserve existing options/result compatibility where practical. Add per-chunk cache via shared cache API. Default neural voice af_heart; alternate af_bella/am_michael samples. No CLI/root/cache edits. No sandboxed macOS say/Chrome diagnostics: parent performs real execution.
3. Parent: setup model/dependencies with hashes/licenses, integrate CLI --tts auto|apple|kokoro and voice defaults, doctor readiness, cache/report integration including video-only render reuse, preserve output refusals and measured timing. Missing explicitly requested Kokoro fails; auto may use Apple only with clear fallback evidence.
4. Parent: spec review followed by code-quality review, typecheck and small tests; render real neural cold/warm builds, compare decoded frame/audio hashes, exercise one visual-only edit, produce voice samples, update README/results, commit locally. User listening remains the voice-quality approval gate.

## Audio interface additions

SynthesisOptions: backend?: 'apple'|'kokoro'|'auto'; cacheDir?: string; voice may be 'auto' to select af_heart or Samantha for actual backend. Preserve manifest, targetDurationMs, workDir.

NarrationSynthesis: add backend ('apple'|'kokoro'), engine string, warnings string[], cacheStats {hits,misses,writes,corruptions}, provenance JSON record; finalRateWpm optional (Apple only), speed optional (Kokoro). Duration attempts may have optional rateWpm/speed. Still return PCM path, sample counts, duration, voice, sampleRate/channels. Preserve max two corrections and +/-1-second final tolerance; Kokoro speed bounded 0.8–1.25. No padding/truncation or pretending arbitrary stretch is more natural.

Export kokoroReadiness() returning {ready:boolean,reason:string} synchronously (local prerequisites only) for CLI backend selection. Runtime paths: .venv-kokoro/bin/python; .explain-to-me/models/kokoro/kokoro-v1.0.onnx; voices-v1.0.bin; provenance.json. Read provenance and actual runtime/model hashes into cache keys. Python bridge accepts JSON stdin {modelPath,voicesPath,voice,speed,chunks:[{id,text,outputPath}]} and emits one JSON stdout result. Load model once per invocation, emit diagnostics only to stderr, synthesize missing chunks only, strict voice/number/input limits, 24000Hz mono signed16 little-endian PCM outputs. Do not download or fetch during runtime.

Model release: https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.1
Model SHA256 beb0d1848dee9a49da392cc3df26958d46cfa35d321edf434f52949153f0df3a
Voices SHA256 bca610b8308e8d99f32e6fe4197e7ec01679264efed0cac9140fe9c29f1fbf7d
kokoro-onnx code MIT; Kokoro model Apache-2.0; bundle actual dependency versions and reviewed-source references, not a legal approval assertion.

## Acceptance

- Real Kokoro narrated golden video, all six artifacts and existing media gates pass.
- Warm unchanged build performs zero synthesis and zero frame rendering; stats show actual reuse.
- Decoded audio/video hashes match cold versus warm.
- Visual-only edit reuses narration while invalidating video render.
- Three real neural voice sample WAVs for listening; no assertion that human naturalness is objectively proven by probes.
- Original Apple command still works; unavailable neural dependencies fail clearly or explicitly auto-fallback.
- Preserve truthful pending human/whole-process egress status. Installation downloads are setup, not build-time dependencies.

Testing remains lean: focused cache/selection checks, existing four tests, and actual cold/warm rendered output. Do not expand into a large test framework.
