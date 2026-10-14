# Phase 3: Document-to-Video, Sentence Timing, and Source Visuals

> For Hermes: execute with bounded parallel Codex workers, disjoint file ownership, lean checks, and real rendered output. Use personal gpt-6-luna/max development agents; do not use developer subscriptions as runtime director APIs.

Goal: a fresh local Markdown/plain-text engineering document produces a narrated video without a hand-authored manifest.

Architecture: safe ingest -> explicit local-model or extractive director -> validated neutral intent -> measured sentence/phrase audio chunks -> deterministic bullet/code/image scenes -> cached render/mux/QC. All model runtime calls stay local. Setup downloads are separate from builds.

## Implementation scope

- Markdown headings, prose, lists, code fences, inert links, and local raster image references. No URL fetching, source execution, PDF/web ingestion, SVG/HTML execution, avatars, generative visuals, or Studio.
- A truthful extractive/template fallback and a concrete local Qwen3-4B-Instruct-2507 Q4_K_M director using installed llama.cpp. Model planning is schema-constrained and references source block IDs; deterministic compilation selects exact code and approved assets. Human review still assesses factual/semantic quality.
- Sentence/phrase-sized TTS, measured caption boundaries, stable cue remapping, pronunciation dictionary overrides in spokenText while retaining readable display text. Do not claim word alignment.
- Bullet scenes and local PNG/JPEG/WebP images. Asset IDs/relative references in intent; canonical approved reads and verified hashes in execution. Copy assets into outputs for portable rerender.

## Ownership

Parent owns contracts, CLI, setup scripts, docs, fixtures, integration and real runtime validation.
Ingest/director worker owns packages/ingest/** and packages/director/** only.
Audio worker owns packages/audio/** and packages/timeline/** only.
Visual worker owns apps/renderer-remotion/** and packages/renderer-core/** only.
No worker commits or pushes. No overlapping source edits. Parent performs real Metal/TTS/browser tests outside worker sandbox.

## Shared APIs

Ingest: packages/ingest/src/markdown.ts exports loadDocument(inputPath, {projectRoot?}?) -> Promise<SourceDocument>; resolveManifestAssets(manifest, inputFile, {projectRoot?}?) -> Promise<ResolvedAsset[]>.

SourceBlock: {id,kind:'heading'|'paragraph'|'list'|'code'|'image',text,startLine,endLine,heading?:string,lines?:string[],language?:string,assetId?:string}.
ResolvedAsset: {id,source:string relative path,path:string canonical,sha256,mimeType:'image/png'|'image/jpeg'|'image/webp',sizeBytes:number,alt:string}.
SourceDocument: {sourcePath:string canonical,root:string,sha256,title,blocks:SourceBlock[],assets:ResolvedAsset[],warnings:string[]}.
Limits: source 256KiB; image 8MiB each/32MiB total/max8. Reject lexical '..', absolute/remote image refs, unsupported signatures, dangling targets and out-of-root symlink targets. Source argument itself authorizes a regular .md/.txt file. Code fences and embedded HTML never execute; images inside code are not read. Links are inert. Use ADR0001 root/canonical containment rules.

Director: packages/director/src/director.ts exports directDocument(doc, {durationMs,audience?,style?,mode?:'auto'|'template'|'local',cacheDir?,workDir?}) -> Promise<{manifest,method:'template-extractive'|'local-model',warnings:string[],provenance:Record<string,unknown>,cacheStats:{hits,misses,writes,corruptions},sourceReferences:Record<string,string[]>}>; localDirectorReadiness() -> {ready,reason}.

Local model: .explain-to-me/models/director/Qwen3-4B-Instruct-2507-Q4_K_M.gguf; provenance.json next to it. llama-server existing /opt/homebrew/bin/llama-server, version0.6.0/build11429/commitd81235049. Spawn an owned server on a short Unix socket in a private 0700 temporary directory with --offline --no-webui --parallel1 --ctx-size8192 --threads6 --gpu-layersall --log-disable. Use an allowlisted child environment, not inherited LLAMA/RPC/proxy configuration. No runtime downloads. HTTP uses the private socket directly, not a released/rebound TCP port or proxy. POST/v1/chat/completions supports response_format:{type:'json_object',schema:...}; per-position tuple constraints bind focus and assigned source IDs. Use temperature0,seed42,max_tokens1536 and bounded JSON/timeout. At most one repair retry for schema/source-reference/budget errors; do not manufacture narration on model failure. Auto fallback is explicit and reports actual method. Never log prompts/source/model response bodies. Kill/wait only the owned process and remove its socket directory, including on timeouts/errors. Cache validated direction with source/asset/model/runtime/director-code/prompt/options identity, no ephemeral socket/workdir salt. Source mappings do not prove semantic correctness.

Audio: packages/audio/src/prepare-narration.ts exports prepareNarration(manifest, pronunciationMap?:Record<string,string>) -> {manifest,stats:Record<string,number>,warnings:string[]}. Use Intl sentence segmentation, bounded phrase splitting for long captions, stable derived IDs <=64 chars, global <=128 chunks, perScene<=32. Remap chunk/token cues to derived chunks. Apply literal whole-term pronunciation overrides only to spokenText; never modify displayed text/code. Neutralize/reject Apple control markup rather than execute it. Audio adapters synthesize spokenText ?? text; returned sample count mapping retains IDs. Timeline captions are one segment per actual measured audio chunk, not word-proportioned guesses. Human pacing remains a listening gate.

Contracts (parent extended): SceneKind includes bullets/image; visual.assetId?; NarrationChunk.spokenText?; ProductionManifest.assets?:LocalAssetIntent[] where intent={id,source:bounded relative local path,sha256,mimeType}. Image scenes require approved IDs; bullets require lines. No model-authored asset paths or render code.

Renderer: RenderRequest.assets?:Record<string,{path:string canonical,sha256,mimeType}>. Copy/hash-check those approved raster bytes into private bundled assets; browser only sees the actual own serving origin. Compile image sources via staticFile/Img; no file:// or remote URLs. Intent never contains data URLs/absolute paths. Caption/cue display uses measured chunk intervals and original text directly. Preserve previous scene semantics and cache/browser auditing.

## Acceptance and execution

- A fresh engineering Markdown document with code, bullets and a local image produces all six artifacts without a prepared manifest, through the real local director and Kokoro.
- Script/storyboard and source-reference/provenance records are inspectable; code/assets match source and no invented paths or unknown IDs pass.
- Captions map exactly to measured sentence/phrase chunk intervals; pronunciation changes spoken output only.
- Warm unchanged rerun skips model direction, TTS and frame rendering. A source/asset change invalidates relevant keys.
- Existing --manifest path still works; template fallback is exercised and not labeled AI summarization.
- A small boundary/segmentation test set, typecheck, one real rendered demonstration and visual inspection suffice. Do not grow a large testing framework.
- Document actual wall/stage times, pending human approval, and unverified whole-process egress honestly. Commit locally after spec/quality review; do not push.

## Verified implementation checkpoint

- Safe ingestion, local/extractive direction, sentence preparation, pronunciation, bullets and copied image rendering are integrated; twelve focused tests and project typecheck pass.
- Fresh Markdown -> real private-socket local model -> Kokoro -> all six artifacts passed at `out/phase-3-reviewed-cold`; an unchanged warm run passed at `out/phase-3-reviewed-warm`. Measured validation wall time: 52.90 s cold / 3.44 s warm. Cached decoded video/audio match.
- Plain-text/template, original prepared input, portable saved-manifest rerender, visual-only narration reuse, source/asset direction invalidation and valid unused declared images were exercised. Actual details and failed attempts are recorded in `docs/benchmarks/phase-3-results.md`.
- Independent specification review passed; quality findings were addressed and final re-review is required before committing.
- Full watch/listen approval, whole-process zero-egress proof and commercial license suitability remain pending, not implementation successes.
