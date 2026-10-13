import assert from "node:assert/strict";
import test from "node:test";
import { inspectPcm } from "./qc.js";

test("PCM QC reports clipping and silence against pinned thresholds", () => {
  const sampleRate = 24_000;
  const sampleCount = sampleRate;
  const pcm = Buffer.alloc(sampleCount * 2);
  for (let index = 0; index < sampleCount; index += 1) pcm.writeInt16LE(index < 100 ? 0 : index === 1_000 ? 32_767 : 1_000, index * 2);
  const qc = inspectPcm(pcm, sampleRate);
  assert.equal(qc.sampleCount, sampleCount);
  assert.equal(qc.clippedSamples, 1);
  assert.equal(qc.clippingPass, true);
  assert.ok(qc.leadingSilenceMs < 10);
});
