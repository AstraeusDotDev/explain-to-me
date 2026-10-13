import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { productionManifestJsonSchema } from "../src/production-manifest.js";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(scriptDir, "../schema/production-manifest.schema.json");
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(productionManifestJsonSchema, null, 2)}\n`, "utf8");
process.stdout.write(`Wrote ${outputPath}\n`);
