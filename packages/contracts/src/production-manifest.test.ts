import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { productionManifestSchema } from "./production-manifest.js";

const fixturePath = fileURLToPath(new URL("../../../fixtures/golden-manifests/whisper-vs-tts.json", import.meta.url));

test("golden manifest is bounded and accepts all required scene kinds", async () => {
  const input: unknown = JSON.parse(await readFile(fixturePath, "utf8"));
  const result = productionManifestSchema.safeParse(input);
  assert.equal(result.success, true);
  if (result.success) assert.deepEqual(new Set(result.data.scenes.map((scene) => scene.kind)), new Set(["title", "statement", "diagram", "comparison", "code", "outro"]));
});

test("manifest rejects unknown properties and dangling cue references", async () => {
  const base = JSON.parse(await readFile(fixturePath, "utf8")) as Record<string, unknown>;
  const unknownProperty = productionManifestSchema.safeParse({ ...base, externalAsset: "https://example.invalid/file.png" });
  assert.equal(unknownProperty.success, false);

  const scenes = base.scenes as Array<Record<string, unknown>>;
  const diagram = scenes[2]!;
  diagram.cues = [{ chunkId: "missing-chunk", tokenIndex: 0, action: "highlight", target: "audio-input", timingFallback: "sentence-start" }];
  const danglingCue = productionManifestSchema.safeParse(base);
  assert.equal(danglingCue.success, false);
});
