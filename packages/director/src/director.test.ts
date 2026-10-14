import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";
import { directDocument } from "./director.js";
import type { SourceDocument } from "../../ingest/src/markdown.js";

test("template director keeps source references and compiles bullet, code, and image scenes", async () => {
  const tempRoot = await mkdtemp(join(process.cwd(), ".cache", "director-test-"));
  try {
    const doc: SourceDocument = {
      sourcePath: join(tempRoot, "lesson.md"),
      root: tempRoot,
      sha256: "b".repeat(64),
      title: "Local data flow",
      warnings: [],
      assets: [{
        id: "asset-1",
        source: "diagram.png",
        path: join(tempRoot, "diagram.png"),
        sha256: "a".repeat(64),
        mimeType: "image/png",
        sizeBytes: 8,
        alt: "A local diagram",
      }],
      blocks: [
        { id: "block-1", kind: "heading", text: "Local data flow", startLine: 1, endLine: 1 },
        { id: "block-2", kind: "paragraph", text: "A local queue holds tasks until a worker is ready. The worker removes one task at a time.", startLine: 3, endLine: 3, heading: "Local data flow" },
        { id: "block-3", kind: "list", text: "Queue the task\nRun the worker", lines: ["Queue the task", "Run the worker"], startLine: 5, endLine: 6, heading: "Local data flow" },
        { id: "block-4", kind: "code", text: "const count = items.length;\n", lines: ["const count = items.length;", ""], language: "ts", startLine: 8, endLine: 10, heading: "Local data flow" },
        { id: "block-5", kind: "image", text: "A local diagram", startLine: 12, endLine: 12, heading: "Local data flow", assetId: "asset-1" },
      ],
    };
    const result = await directDocument(doc, {
      durationMs: 60_000,
      mode: "template",
      cacheDir: join(tempRoot, "cache"),
      workDir: tempRoot,
    });

    assert.equal(result.method, "template-extractive");
    assert.equal(result.manifest.scenes.length, 5);
    assert.equal(result.manifest.scenes[1]?.kind, "bullets");
    assert.deepEqual(result.manifest.scenes[1]?.visual.lines, ["Queue the task", "Run the worker"]);
    assert.equal(result.manifest.scenes[2]?.kind, "code");
    assert.equal(result.manifest.scenes[2]?.visual.code, "const count = items.length;\n");
    assert.equal(result.manifest.scenes[3]?.kind, "image");
    assert.equal(result.manifest.scenes[3]?.visual.assetId, "asset-1");
    assert.deepEqual(result.sourceReferences["body-1"], ["block-3", "block-2"]);
    assert.deepEqual(result.sourceReferences["body-2"], ["block-4"]);
    assert.deepEqual(result.sourceReferences["body-3"], ["block-5"]);
    assert.ok(result.manifest.scenes.flatMap((scene) => scene.narration).every((chunk) => chunk.spokenText === chunk.text));
    assert.equal(result.cacheStats.writes, 1);
    const repeated = await directDocument(doc, { durationMs: 60_000, mode: "template", cacheDir: join(tempRoot, "cache"), workDir: tempRoot });
    assert.equal(repeated.cacheStats.hits, 1);
    assert.deepEqual(repeated.manifest, result.manifest);
    const changedAsset = await directDocument({ ...doc, assets: doc.assets.map((asset) => ({ ...asset, sha256: "c".repeat(64) })) }, {
      durationMs: 60_000, mode: "template", cacheDir: join(tempRoot, "cache"), workDir: tempRoot,
    });
    assert.equal(changedAsset.cacheStats.misses, 1);
    assert.equal(changedAsset.manifest.assets?.[0]?.sha256, "c".repeat(64));
    const changedSource = await directDocument({ ...doc, sha256: "d".repeat(64) }, {
      durationMs: 60_000, mode: "template", cacheDir: join(tempRoot, "cache"), workDir: tempRoot,
    });
    assert.equal(changedSource.cacheStats.misses, 1);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});
