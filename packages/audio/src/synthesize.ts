import { spawnSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ProductionManifest } from "../../contracts/src/production-manifest.js";
import { normalizeTokens } from "../../contracts/src/production-manifest.js";

export const PCM_SAMPLE_RATE = 24_000;
export const PCM_CHANNELS = 1;
export const MIN_RATE_WPM = 130;
export const MAX_RATE_WPM = 200;
export const MAX_DURATION_CORRECTIONS = 2;
export const DURATION_TOLERANCE_MS = 1_000;

export interface SpeechRateAttempt {
  attempt: number;
  rateWpm: number;
  sampleCount: number;
  durationMs: number;
  withinTolerance: boolean;
}

export interface SynthesizedChunk {
  id: string;
  samples: number;
}

export interface NarrationSynthesis {
  pcmPath: string;
  chunks: SynthesizedChunk[];
  sampleRate: number;
  channels: number;
  totalSamples: number;
  durationMs: number;
  voice: string;
  finalRateWpm: number;
  attempts: SpeechRateAttempt[];
}

export interface SynthesisOptions {
  manifest: ProductionManifest;
  voice: string;
  targetDurationMs: number;
  workDir: string;
}

const narrationItems = (manifest: ProductionManifest) => manifest.scenes.flatMap((scene) => scene.narration);

export async function synthesizeNarration(options: SynthesisOptions): Promise<NarrationSynthesis> {
  const chunks = narrationItems(options.manifest);
  const wordCount = chunks.reduce((total, chunk) => total + normalizeTokens(chunk.text).length, 0);
  if (wordCount === 0) throw new Error("Cannot synthesize an empty narration script");
  if (!Number.isFinite(options.targetDurationMs) || options.targetDurationMs <= 0) {
    throw new Error("Target duration must be a positive number of milliseconds");
  }

  let rateWpm = clampRate(Math.round((wordCount * 60_000) / options.targetDurationMs));
  const attempts: SpeechRateAttempt[] = [];
  let lastOutput: { pcmPath: string; chunks: SynthesizedChunk[]; totalSamples: number; durationMs: number } | undefined;

  for (let attempt = 1; attempt <= MAX_DURATION_CORRECTIONS + 1; attempt += 1) {
    const attemptResult = await synthesizeAtRate(chunks, options.voice, rateWpm, options.workDir, attempt);
    const durationMs = (attemptResult.totalSamples / PCM_SAMPLE_RATE) * 1_000;
    const withinTolerance = Math.abs(durationMs - options.targetDurationMs) <= DURATION_TOLERANCE_MS;
    attempts.push({
      attempt,
      rateWpm,
      sampleCount: attemptResult.totalSamples,
      durationMs,
      withinTolerance,
    });
    lastOutput = { ...attemptResult, durationMs };
    if (withinTolerance) break;
    if (attempt === MAX_DURATION_CORRECTIONS + 1) break;

    const previous = attempts.at(-2);
    // Apple voices can quantize rate requests: a small WPM change may produce
    // byte-identical audio. Escape that plateau without adding another retry.
    const onPlateau = previous !== undefined && previous.sampleCount === attemptResult.totalSamples;
    const direction = durationMs > options.targetDurationMs ? 1 : -1;
    const desiredRate = onPlateau
      ? clampRate(rateWpm + direction * Math.max(10, Math.ceil(rateWpm * 0.1)))
      : clampRate(Math.round(rateWpm * (durationMs / options.targetDurationMs)));
    rateWpm = desiredRate === rateWpm
      ? clampRate(rateWpm + direction)
      : desiredRate;
  }

  if (!lastOutput || !attempts.at(-1)?.withinTolerance) {
    const summary = attempts.map((item) => `${item.rateWpm} WPM → ${(item.durationMs / 1_000).toFixed(3)}s`).join(", ");
    throw new Error(
      `Narration could not reach ${ (options.targetDurationMs / 1_000).toFixed(3) }s within ±1.000s after ${attempts.length} synthesis attempt(s) (rate bounds ${MIN_RATE_WPM}-${MAX_RATE_WPM} WPM). Measured: ${summary}`,
    );
  }

  return {
    pcmPath: lastOutput.pcmPath,
    chunks: lastOutput.chunks,
    sampleRate: PCM_SAMPLE_RATE,
    channels: PCM_CHANNELS,
    totalSamples: lastOutput.totalSamples,
    durationMs: lastOutput.durationMs,
    voice: options.voice,
    finalRateWpm: attempts.at(-1)!.rateWpm,
    attempts,
  };
}

export async function writeWavFromPcm(pcmPath: string, wavPath: string): Promise<void> {
  runProcess("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-nostdin", "-y",
    "-f", "s16le", "-ar", String(PCM_SAMPLE_RATE), "-ac", String(PCM_CHANNELS),
    "-i", pcmPath, "-c:a", "pcm_s16le", "-f", "wav", wavPath,
  ]);
}

export function extractPcmDataFromWav(wave: Buffer): Buffer {
  if (wave.toString("ascii", 0, 4) !== "RIFF" || wave.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error("Apple say output is not a RIFF/WAVE file");
  }
  let sampleRate: number | undefined;
  let channels: number | undefined;
  let bitsPerSample: number | undefined;
  let formatCode: number | undefined;
  let data: Buffer | undefined;
  for (let offset = 12; offset + 8 <= wave.byteLength;) {
    const name = wave.toString("ascii", offset, offset + 4);
    const size = wave.readUInt32LE(offset + 4);
    const chunkStart = offset + 8;
    const chunkEnd = chunkStart + size;
    if (chunkEnd > wave.byteLength) throw new Error(`Apple say returned a truncated WAVE ${name} chunk`);
    if (name === "fmt " && size >= 16) {
      formatCode = wave.readUInt16LE(chunkStart);
      channels = wave.readUInt16LE(chunkStart + 2);
      sampleRate = wave.readUInt32LE(chunkStart + 4);
      bitsPerSample = wave.readUInt16LE(chunkStart + 14);
    } else if (name === "data") {
      data = wave.subarray(chunkStart, chunkEnd);
    }
    offset = chunkEnd + (size % 2);
  }
  if (formatCode !== 1 || channels !== PCM_CHANNELS || sampleRate !== PCM_SAMPLE_RATE || bitsPerSample !== 16) {
    throw new Error(`Apple say must return signed 16-bit PCM at ${PCM_SAMPLE_RATE} Hz mono; received ${formatCode ?? "unknown"}/${bitsPerSample ?? "unknown"}-bit/${channels ?? "unknown"}ch/${sampleRate ?? "unknown"}Hz`);
  }
  if (!data || data.byteLength < 2 || data.byteLength % 2 !== 0) {
    throw new Error("Apple say returned an empty or invalid PCM data chunk");
  }
  return data;
}

export function runProcess(command: string, args: string[], timeoutMs = 120_000): string {
  const result = spawnSync(command, args, { encoding: "utf8", timeout: timeoutMs, maxBuffer: 8 * 1024 * 1024 });
  if (result.error) throw new Error(`${command} could not run: ${result.error.message}`);
  if (result.status !== 0) {
    const diagnostic = [result.stderr, result.stdout].filter(Boolean).join("\n").trim();
    throw new Error(`${command} exited with status ${result.status}${diagnostic ? `: ${diagnostic}` : ""}`);
  }
  return result.stdout ?? "";
}

function clampRate(rateWpm: number): number {
  return Math.max(MIN_RATE_WPM, Math.min(MAX_RATE_WPM, rateWpm));
}

async function synthesizeAtRate(
  chunks: ReturnType<typeof narrationItems>,
  voice: string,
  rateWpm: number,
  workDir: string,
  attempt: number,
): Promise<{ pcmPath: string; chunks: SynthesizedChunk[]; totalSamples: number }> {
  const pcmBuffers: Buffer[] = [];
  const measuredChunks: SynthesizedChunk[] = [];

  for (const [index, chunk] of chunks.entries()) {
    const base = join(workDir, `attempt-${attempt}-chunk-${String(index + 1).padStart(2, "0")}`);
    const wavePath = `${base}.wav`;
    runProcess("say", [
      "-v", voice,
      "-r", String(rateWpm),
      "--file-format=WAVE",
      `--data-format=LEI16@${PCM_SAMPLE_RATE}`,
      `--channels=${PCM_CHANNELS}`,
      "-o", wavePath,
      chunk.text,
    ]);
    const wave = await readFile(wavePath);
    let pcm: Buffer;
    try {
      pcm = extractPcmDataFromWav(wave);
    } catch (error) {
      throw new Error(`Apple say failed to produce PCM for narration chunk ${chunk.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
    const samples = pcm.byteLength / 2;
    measuredChunks.push({ id: chunk.id, samples });
    pcmBuffers.push(pcm);
  }

  const outputPath = join(workDir, `narration-attempt-${attempt}.pcm`);
  const combined = Buffer.concat(pcmBuffers);
  await writeFile(outputPath, combined);
  return { pcmPath: outputPath, chunks: measuredChunks, totalSamples: combined.byteLength / 2 };
}
