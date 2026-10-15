# Central-command integration plan

**Scope:** Add a reusable local CLI launcher and central-command discovery instructions/skills. Do not commit, push, tag, change visibility, or alter existing production cuts. Use current reviewed 0.2 working code and record dirty state rather than imply a released tag.

1. Create Python stdlib launcher `scripts/agent-explainer.py` with doctor/build commands, explicit private workspace, contained inputs/cache/temp/jobs, unique outputs, bounded owned subprocesses and report-gated success. Capture package version, Git commit/dirty state and source fingerprint.
2. Write focused unittest coverage first: containment/symlink refusal, unique jobs, version metadata, QC failure/missing artifacts, timeout cleanup and no success on CLI failure. Use a clearly labeled test fixture subprocess; no fixture output is runtime media evidence.
3. Add central-command AGENTS.md/CLAUDE.md entry points, Claude/Codex project skill adapters and `docs/explain-to-me.md`. Standard CLI and enhanced-production runbooks must be separate; music/cartoon/per-sentence pacing remain private one-off workflows, not invented 0.2 flags.
4. Copy only the public neutral golden manifest into a dedicated private central-command integration fixture. Run doctor and one real build through the launcher from central-command, check report/artifacts/job provenance and workspace containment. Do not touch client sources or previous outputs.
5. Verify focused tests/static syntax, document links and software repo status. Report exact artifact paths and activation instructions. Existing sessions may require restart because top-level skill directories are new.
