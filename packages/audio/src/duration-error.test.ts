import assert from "node:assert/strict";
import test from "node:test";
import { narrationDurationError } from "./duration-error.js";

test("duration refusal preserves measurements and gives script-aware recovery steps", () => {
  const measured = "Narration could not reach 60.000s. Measured: 130 WPM → 57.842s";
  const error = narrationDurationError(measured);
  assert.ok(error instanceof Error);
  assert.ok(error.message.startsWith(measured));
  assert.match(error.message, /shorter target or add reviewed narration/u);
  assert.match(error.message, /shorten the script or allow more time/u);
  assert.match(error.message, /saved manifest/u);
  assert.match(error.message, /document direction may change the script/u);
  assert.match(error.message, /never truncated or padded/u);
});
