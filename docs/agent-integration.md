# Agent integration

Use `python3 scripts/agent-explainer.py doctor --workspace /absolute/private/workspace` followed by `build --workspace ... --manifest /absolute/private/workspace/story.json --tts apple --duration 60s`. For text input, use `--input source.md --director local --tts kokoro --voice af_heart` with installed optional models. Python 3.9+, Git and the normal runtime prerequisites are required. Invoke the script by absolute path from any working directory; it resolves its own software checkout.

The private workspace must already exist outside the software checkout. Input and pronunciation-map paths must remain within it after symlink resolution. Unique jobs, explicit cache/temp roots, subprocess deadlines and QC-gated JSON results keep orchestration separate from production implementation. No shell interpolation, model installs, Git updates or uploads are performed.

Job files live under `<workspace>/.explain-to-me/jobs/<unique-id>/`: `job.json`, `build.log` and `output/`. Source version/commit/dirty state/fingerprint and artifact hashes provide provenance; they do not certify a released tag, factual correctness or whole-process no-egress. The wrapper trusts the local CLI's configured QC report and checks required artifacts/gates; it is not an independent decoder or an execution sandbox.

`state: automated-ready` is not human approval. Read `humanReview` and `egress` separately. Failures/cancellations return nonzero and retain diagnostics; do not share logs without redaction. A source/input change during a job refuses readiness. Do not edit the software tree while a build is running.

Per-project agent skills should point to this launcher and document explicit input/output bindings. Do not advertise music/cartoon/per-sentence-rate flags in 0.2: those remain separate production workflows. Keep private adapters and stories outside the reusable source tree. Run launcher tests with `pnpm test:agent` (or `python3 -m unittest discover -s scripts -p 'test_agent_explainer.py'`).
