/** Keep narrator measurements intact while explaining how to recover from an infeasible target. */
export function narrationDurationError(measurements: string): Error {
  return new Error(`${measurements}\nTry a shorter target or add reviewed narration if the script is too short; shorten the script or allow more time if it is too long. Rebuild a saved manifest to keep narration fixed: changing duration during document direction may change the script. Speech is never truncated or padded to force the target.`);
}
