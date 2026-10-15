# Contributing

Thanks for helping make explanations clearer. This is an early, macOS-first CLI project by Tommy Allsup. Start with the [README](README.md) and [roadmap](ROADMAP.md).

## Before starting

For a substantial feature, open an issue to agree on scope. Small fixes, documentation improvements and synthetic examples are welcome. Keep changes focused; do not mix feature work with unrelated refactoring.

Use Node.js 24+ and pnpm 10.18.3. The README shows setup without a global pnpm installation. Full narration/rendering checks require macOS prerequisites; unit tests and typechecking also run in Linux CI.

## Check a change

```bash
npm exec --cache .cache/npm --offline --yes --package=pnpm@10.18.3 -- pnpm typecheck
npm exec --cache .cache/npm --offline --yes --package=pnpm@10.18.3 -- pnpm test
```

Tests inherit `TMPDIR`. If your terminal supplies an extremely long temporary path, select a shorter user-owned temporary root before running socket-path tests. No models or browser downloads are needed for the static CI checks.

- Add a focused regression test for changed behavior; run it before and after the fix.
- Preserve the validated manifest boundary, bounded local assets, private socket transport and owned-process cleanup.
- Run a representative media build when audio, timing or rendering changes; documentation-only changes do not need a render.
- Include actual commands/results and limitations in the pull request. Do not substitute automated checks for human approval.
- Keep generated outputs, model weights, caches, credentials and client/private material out of commits and issue attachments.
- Use synthetic, shareable fixtures. Imported assets must have documented redistribution permission.

## Pull requests

Explain the problem, narrow solution and checks. Update relevant docs when commands or supported behavior change. New public CLI/project-format contracts should be discussed before implementation.

Project code is MIT-licensed; contributions must be compatible with that license. Third-party dependencies and supplied models/assets retain their own terms. See [third-party notices](THIRD_PARTY_NOTICES.md).

For vulnerabilities, follow [SECURITY.md](SECURITY.md), not a public bug report.
