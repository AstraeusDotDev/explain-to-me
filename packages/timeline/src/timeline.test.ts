import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { productionManifestSchema, type ProductionManifest } from "../../contracts/src/production-manifest.js";
import { buildTimeline, createSentenceCaptions } from "./timeline.js";

const fixturePath = fileURLToPath(new URL("../../../fixtures/golden-manifests/whisper-vs-tts.json", import.meta.url));

test("timeline uses cumulative measured samples for scene frames and sentence captions", async () => {
  const input: unknown = JSON.parse(await readFile(fixturePath, "utf8"));
  const manifest = productionManifestSchema.parse(input) as ProductionManifest;
  const chunks = manifest.scenes.flatMap((scene) => scene.narration).map((chunk, index) => ({ id: chunk.id, samples: 10_001 + index * 17 }));
  const timeline = buildTimeline(manifest, chunks, 24, 24_000);
  assert.equal(timeline.durationInFrames, Math.ceil((chunks.reduce((sum, chunk) => sum + chunk.samples, 0) * 24) / 24_000));
  assert.equal(timeline.scenes[1]!.from, Math.round((chunks[0]!.samples * 24) / 24_000));
  const captions = createSentenceCaptions(manifest, timeline);
  assert.equal(new Set(captions.map((caption) => caption.chunkId)).size, chunks.length);
  assert.ok(captions.every((caption) => caption.endMs > caption.startMs));
});
