import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";
import { loadDocument, resolveManifestAssets } from "./markdown.js";

test("inline and multiline code image syntax never reads assets", async () => {
  const root = await mkdtemp(join(process.cwd(), ".cache", "inline-code-test-"));
  try {
    await writeFile(join(root, "pixel.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const source = join(root, "inline.md");
    await writeFile(source, [
      "# Code stays inert",
      "Literal `![Inline](missing-inline.png)` and ``with ` ticks ![Nested](missing-nested.png)``.",
      "A `multiline span",
      "![Multiline](missing-multiline.png)",
      "ends here` and `😀` ![Visible](pixel.png).",
    ].join("\n"));
    const doc = await loadDocument(source, { projectRoot: root });
    assert.equal(doc.assets.length, 1);
    assert.equal(doc.assets[0]?.source, "pixel.png");
    assert.equal(doc.blocks.filter((block) => block.kind === "image").length, 1);
    await writeFile(source, "A stray `\n\n![Visible](pixel.png)\n\nLater `inline code`.\n");
    const unmatched = await loadDocument(source, { projectRoot: root });
    assert.equal(unmatched.assets.length, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("ingests supported blocks and rejects unsafe local image references", async () => {
  const tempRoot = await mkdtemp(join(process.cwd(), ".cache", "ingest-test-"));
  try {
    const sourcePath = join(tempRoot, "lesson.md");
    const imagePath = join(tempRoot, "pixel.png");
    await writeFile(imagePath, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    await writeFile(sourcePath, [
      "# Safe Notes",
      "",
      "Text **one** and [two](https://example.invalid).",
      "",
      "<script>",
      "![Hidden](missing-html.png)",
      "</script>",
      "",
      "~~~md",
      "<script>echo</script>",
      "![Ignored](missing.png)",
      "~~~",
      "",
      "- Alpha",
      "- Beta",
      "",
      "![Diagram](pixel.png)",
      "",
    ].join("\n"));

    const doc = await loadDocument(sourcePath, { projectRoot: tempRoot });
    assert.equal(doc.title, "Safe Notes");
    assert.equal(doc.assets.length, 1);
    assert.equal(doc.assets[0]?.mimeType, "image/png");
    assert.equal(doc.assets[0]?.source, "pixel.png");
    assert.deepEqual(doc.blocks.map((block) => block.kind), ["heading", "paragraph", "code", "list", "image"]);
    assert.equal(doc.blocks[1]?.text, "Text one and two.");
    assert.equal(doc.blocks[2]?.text, "<script>echo</script>\n![Ignored](missing.png)\n");
    assert.deepEqual(doc.blocks[3]?.lines, ["Alpha", "Beta"]);
    assert.equal(doc.blocks[4]?.assetId, doc.assets[0]?.id);

    const sourceDir = join(tempRoot, "source");
    await mkdir(sourceDir);
    await writeFile(join(tempRoot, "outside.png"), Buffer.from("not an image"));
    const traversalPath = join(sourceDir, "traversal.md");
    await writeFile(traversalPath, "![Outside](../outside.png)");
    await assert.rejects(loadDocument(traversalPath, { projectRoot: tempRoot }), /forbidden \.\. segment/u);

    const invalidImagePath = join(sourceDir, "invalid.md");
    await writeFile(join(sourceDir, "invalid.png"), Buffer.from("<svg></svg>"));
    await writeFile(invalidImagePath, "![Invalid](invalid.png)");
    await assert.rejects(loadDocument(invalidImagePath, { projectRoot: tempRoot }), /only PNG, JPEG, and WebP/u);

    const projectAssets = join(tempRoot, "assets");
    await mkdir(projectAssets);
    const suppliedAsset = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    await writeFile(join(projectAssets, "prepared.png"), suppliedAsset);
    const manifestPath = join(sourceDir, "prepared.json");
    await writeFile(manifestPath, "{}");
    const resolved = await resolveManifestAssets({
      assets: [{
        id: "prepared-image",
        source: "prepared.png",
        sha256: createHash("sha256").update(suppliedAsset).digest("hex"),
        mimeType: "image/png",
      }],
    }, manifestPath, { projectRoot: tempRoot });
    assert.equal(resolved[0]?.path, join(projectAssets, "prepared.png"));
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});
