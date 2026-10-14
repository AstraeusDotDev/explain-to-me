import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { productionManifestSchema, type ProductionManifest } from "../../contracts/src/production-manifest.js";
import { buildTimeline, createSentenceCaptions } from "./timeline.js";

const fixturePath = fileURLToPath(new URL("../../../fixtures/golden-manifests/whisper-vs-tts.json", import.meta.url));

test("timeline uses cumulative measured samples and gives each audio chunk one measured caption", async () => {
  const input: unknown = JSON.parse(await readFile(fixturePath, "utf8"));
  const manifest = productionManifestSchema.parse(input) as ProductionManifest;
  const chunks = manifest.scenes.flatMap((scene) => scene.narration).map((chunk, index) => ({ id: chunk.id, samples: 10_001 + index * 17 }));
  const timeline = buildTimeline(manifest, chunks, 24, 24_000);
  assert.equal(timeline.durationInFrames, Math.ceil((chunks.reduce((sum, chunk) => sum + chunk.samples, 0) * 24) / 24_000));
  assert.equal(timeline.scenes[1]!.from, Math.round((chunks[0]!.samples * 24) / 24_000));
  const captions = createSentenceCaptions(manifest, timeline);
  assert.equal(captions.length, chunks.length);
  for (const [index, caption] of captions.entries()) {
    const timedChunk = timeline.chunks[index]!;
    assert.equal(caption.chunkId, timedChunk.id);
    assert.equal(caption.sceneId, timedChunk.sceneId);
    assert.equal(caption.text, timedChunk.text);
    assert.equal(caption.startMs, timedChunk.startMs);
    assert.equal(caption.endMs, timedChunk.endMs);
  }
});
