import type { ProductionManifest } from "../../contracts/src/production-manifest.js";
import type { Timeline } from "../../timeline/src/timeline.js";

export interface RenderRequest {
  manifest: ProductionManifest;
  timeline: Timeline;
  outputPath: string;
  width: number;
  height: number;
  fps: number;
  concurrency?: number;
}

export interface RenderResult {
  outputPath: string;
  renderer: string;
  browserExecutable: string;
  version: string;
  durationInFrames: number;
  wallTimeMs: number;
  warnings: string[];
  network: { externalAttempts: string[] };
}
