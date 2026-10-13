# Milestone 1 parallel implementation contract

Owner/orchestrator: Luna. Build only prepared-manifest preview, not full MVP. No commits or pushes by workers. Keep tests lean; real output is the principal integration check.

## Shared TypeScript data shapes

Use these exact exported shapes from packages/contracts/src/production-manifest.ts (optional visual fields bounded by schema; unknown properties rejected):

    type SceneKind = 'title' | 'statement' | 'diagram' | 'comparison' | 'code' | 'outro';
    interface NarrationChunk { id: string; text: string }
    interface VisualNode { id: string; label: string }
    interface Cue { chunkId: string; tokenIndex: number; action: 'highlight'; target: string; timingFallback: 'sentence-start' }
    interface Scene {
      id: string; kind: SceneKind; title: string;
      narration: NarrationChunk[];
      visual: { subtitle?: string; lines?: string[]; nodes?: VisualNode[];
        edges?: {from: string; to: string}[];
        left?: {title: string; lines: string[]}; right?: {title: string; lines: string[]};
        code?: string };
      cues?: Cue[];
    }
    interface ProductionManifest { version: '1'; title: string; profile: 'preview'; targetDurationMs: number; theme: 'technical-whiteboard'; scenes: Scene[] }

No external paths/assets in this initial contract. Schema must bound text/scene/chunk sizes, reject duplicate IDs, dangling edge/cue targets and chunk refs, negative/out-of-range token indices. Token normalization: trim and split on whitespace. Tokens are zero-based; reliable word timings are not required; use declared sentence-start cue fallback and report it.

Timeline exports from packages/timeline/src/timeline.ts:

    interface TimedChunk { id: string; sceneId: string; text: string; startMs: number; endMs: number }
    interface TimedScene { sceneId: string; startMs: number; endMs: number; from: number; durationInFrames: number }
    interface Timeline { fps: number; durationMs: number; durationInFrames: number; chunks: TimedChunk[]; scenes: TimedScene[] }

Sample counts at normalized PCM 24000 Hz mono establish chunk offsets. Frame boundaries use cumulative rounded sample-derived time, not per-scene duration accumulation. Last video frame count is ceil(total audio seconds * fps).

## Renderer boundary (owned by renderer worker)

packages/renderer-core/src/renderer.ts:

    interface RenderRequest { manifest: ProductionManifest; timeline: Timeline; outputPath: string; width: number; height: number; fps: number; concurrency?: number }
    interface RenderResult { outputPath: string; renderer: string; version: string; durationInFrames: number; wallTimeMs: number; warnings: string[]; network: {externalAttempts: string[]} }
    export async function renderVideo(request: RenderRequest): Promise<RenderResult>

renderVideo is exported by apps/renderer-remotion/src/render.ts. Renderer-core defines neutral types only; entry point bundles Composition and renders video-only H264 using pinned Remotion 4.0.535. Renderer worker writes only apps/renderer-remotion/** and packages/renderer-core/**. Export types by relative source imports. Core worker owns all root configs/package installation and other packages/apps. No workspace package aliases required; use relative imports and tsx.

## Runtime pipeline (owned by core worker)

CLI: pnpm explain-to-me doctor; pnpm explain-to-me build --manifest fixtures/golden-manifests/whisper-vs-tts.json --profile preview --duration 60s [--output <new directory>] [--voice Samantha]. Default 1280x720, 24 fps. Manifest contents/source assets remain local. No build-time downloads: preinstall renderer browser during setup, not inside build. Prepared text input build is unsupported and must explain milestone scope.

Core worker can import renderVideo per boundary above but must not edit renderer worker files. Use actual Apple say, FFmpeg normalization/concat/mux, frame-accurate timeline, sentence captions, max two rate corrections after initial synthesis (three synthesis attempts total), conservative pinned rate range 130-200 WPM. Produce a ~145-word technical script so this range can meet 60 seconds without rewriting/padding/truncating. Record voice/rate/sample counts/duration attempts. If outside +/-1 second fail explicitly.

Write unique staging, refuse preexisting output targets, rename after automated checks. All successful builds produce video.mp4, audio.wav, captions.vtt, captions.srt, manifest.json, report.json. Probe/decode, 59-61 seconds for golden requested duration, A/V-end <=250ms, caption-end <=250ms, clipping/silence checks with pinned thresholds, scene-boundary frame samples, actual monotonic stage/total timings, renderer/version/license record, skipped ASR reason, human review pending (never auto-approve). If egress harness proof is unavailable say unverified, not proven zero egress. Renderer records browser external attempts and rejects them.

## Tooling

Use personal Codex ChatGPT subscription, gpt-6-luna max reasoning. macOS: Node v25.8.1, FFmpeg/ffprobe/say installed; pnpm not globally installed. Install pnpm via npm exec or project tooling, avoid changing global config. Pin stable TypeScript 5.x rather than auto-adopting a newly released major. Root dependencies include react/react-dom, remotion/@remotion/bundler/@remotion/renderer all same 4.0.535; zod, tsx, TypeScript and React/Node types. Setup downloads are allowed, build-time egress is not. Do not modify Hermes/Codex configuration or credentials.
