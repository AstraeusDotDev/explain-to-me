import type { ProductionManifest } from "../../contracts/src/production-manifest.js";
import { normalizeTokens } from "../../contracts/src/production-manifest.js";

export interface TimedChunk {
  id: string;
  sceneId: string;
  text: string;
  startMs: number;
  endMs: number;
}

export interface TimedScene {
  sceneId: string;
  startMs: number;
  endMs: number;
  from: number;
  durationInFrames: number;
}

export interface Timeline {
  fps: number;
  durationMs: number;
  durationInFrames: number;
  chunks: TimedChunk[];
  scenes: TimedScene[];
}

export interface ChunkSampleCount {
  id: string;
  samples: number;
}

export interface CaptionSegment {
  chunkId: string;
  sceneId: string;
  text: string;
  startMs: number;
  endMs: number;
}

export function buildTimeline(
  manifest: ProductionManifest,
  measuredChunks: ChunkSampleCount[],
  fps = 24,
  sampleRate = 24_000,
): Timeline {
  if (!Number.isInteger(fps) || fps <= 0) throw new Error("fps must be a positive integer");
  if (!Number.isInteger(sampleRate) || sampleRate <= 0) throw new Error("sampleRate must be a positive integer");

  const samplesById = new Map(measuredChunks.map((chunk) => [chunk.id, chunk.samples]));
  const expectedChunkIds = manifest.scenes.flatMap((scene) => scene.narration.map((chunk) => chunk.id));
  if (samplesById.size !== measuredChunks.length) throw new Error("Measured narration contains duplicate chunk ids");
  if (expectedChunkIds.length !== measuredChunks.length || expectedChunkIds.some((id) => !samplesById.has(id))) {
    throw new Error("Measured sample counts must match every manifest narration chunk exactly");
  }

  let cumulativeSamples = 0;
  const chunks: TimedChunk[] = [];
  const scenes: TimedScene[] = [];
  for (const scene of manifest.scenes) {
    const sceneStartSamples = cumulativeSamples;
    for (const narration of scene.narration) {
      const samples = samplesById.get(narration.id);
      if (!samples || !Number.isSafeInteger(samples) || samples <= 0) {
        throw new Error(`Narration chunk ${narration.id} has an invalid sample count`);
      }
      const startSamples = cumulativeSamples;
      cumulativeSamples += samples;
      chunks.push({
        id: narration.id,
        sceneId: scene.id,
        text: narration.text,
        startMs: samplesToMs(startSamples, sampleRate),
        endMs: samplesToMs(cumulativeSamples, sampleRate),
      });
    }
    scenes.push({
      sceneId: scene.id,
      startMs: samplesToMs(sceneStartSamples, sampleRate),
      endMs: samplesToMs(cumulativeSamples, sampleRate),
      from: frameBoundary(sceneStartSamples, fps, sampleRate),
      durationInFrames: 0,
    });
  }

  const durationMs = samplesToMs(cumulativeSamples, sampleRate);
  const durationInFrames = Math.ceil((cumulativeSamples * fps) / sampleRate);
  for (let index = 0; index < scenes.length; index += 1) {
    const current = scenes[index]!;
    const next = scenes[index + 1];
    const endFrame = next ? next.from : durationInFrames;
    current.durationInFrames = Math.max(1, endFrame - current.from);
  }

  return { fps, durationMs, durationInFrames, chunks, scenes };
}

export function createSentenceCaptions(
  manifest: ProductionManifest,
  timeline: Timeline,
  sampleRate = 24_000,
): CaptionSegment[] {
  const sceneById = new Map(manifest.scenes.map((scene) => [scene.id, scene]));
  const captions: CaptionSegment[] = [];
  for (const timedChunk of timeline.chunks) {
    const sentences = splitSentences(timedChunk.text);
    const tokenCounts = sentences.map((sentence) => normalizeTokens(sentence).length);
    const totalTokens = tokenCounts.reduce((sum, count) => sum + count, 0);
    const totalSamples = Math.round(((timedChunk.endMs - timedChunk.startMs) * sampleRate) / 1_000);
    let completedTokens = 0;
    const sceneId = timedChunk.sceneId;
    if (!sceneById.has(sceneId)) throw new Error(`Timeline references unknown scene ${sceneId}`);

    sentences.forEach((sentence, index) => {
      const startSamples = Math.round((completedTokens / totalTokens) * totalSamples);
      completedTokens += tokenCounts[index]!;
      const endSamples = index === sentences.length - 1
        ? totalSamples
        : Math.round((completedTokens / totalTokens) * totalSamples);
      captions.push({
        chunkId: timedChunk.id,
        sceneId,
        text: sentence,
        startMs: timedChunk.startMs + samplesToMs(startSamples, sampleRate),
        endMs: index === sentences.length - 1 ? timedChunk.endMs : timedChunk.startMs + samplesToMs(endSamples, sampleRate),
      });
    });
  }
  return captions;
}

export function renderWebVtt(captions: CaptionSegment[]): string {
  return `WEBVTT\n\n${captions.map((caption, index) => `${index + 1}\n${formatTimestamp(caption.startMs, ".")} --> ${formatTimestamp(caption.endMs, ".")}\n${caption.text}`).join("\n\n")}\n`;
}

export function renderSrt(captions: CaptionSegment[]): string {
  return `${captions.map((caption, index) => `${index + 1}\n${formatTimestamp(caption.startMs, ",")} --> ${formatTimestamp(caption.endMs, ",")}\n${caption.text}`).join("\n\n")}\n`;
}

function samplesToMs(samples: number, sampleRate: number): number {
  return (samples * 1_000) / sampleRate;
}

function frameBoundary(samples: number, fps: number, sampleRate: number): number {
  return Math.round((samples * fps) / sampleRate);
}

function splitSentences(text: string): string[] {
  return text.trim().split(/(?<=[.!?])\s+/u).map((sentence) => sentence.trim()).filter(Boolean);
}

function formatTimestamp(milliseconds: number, decimal: "." | ","): string {
  const roundedMs = Math.max(0, Math.round(milliseconds));
  const hours = Math.floor(roundedMs / 3_600_000);
  const minutes = Math.floor((roundedMs % 3_600_000) / 60_000);
  const seconds = Math.floor((roundedMs % 60_000) / 1_000);
  const fraction = roundedMs % 1_000;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}${decimal}${String(fraction).padStart(3, "0")}`;
}
