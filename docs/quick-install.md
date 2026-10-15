# An agent, a tiny director's chair, and your first explainer

This guide installs the **v0.2.0 source release on macOS** and renders a bundled example with Apple speech. It doesn't require an LLM or Kokoro model. For the shortest copy/paste request, use the [README installer prompt](../README.md#let-your-agent-handle-setup).

## Copy this prompt into your coding agent

```text
Set up Explain-to-Me v0.2.0 on this Mac and make its first demo video.
Repository: https://github.com/TommyAllsup/explain-to-me

1. Read README.md, docs/quick-install.md, docs/agent-integration.md, and
   THIRD_PARTY_NOTICES.md at v0.2.0. Inspect the machine's prerequisites.
   Full video builds need macOS, Node.js 24+ with npm, Git, FFmpeg/ffprobe,
   Python 3.9+ for the agent launcher, and Apple's Samantha voice.
2. Use a new source checkout at ~/Developer/explain-to-me-v0.2.0 unless
   that path is already occupied. Do not reset or change an existing checkout.
   Clone the v0.2.0 tag and record its commit. Follow the pinned pnpm install
   and explicit Remotion Headless Shell setup commands in the README.
3. Resolve missing prerequisites within the environment's installation policy.
   If a system prerequisite needs my action, report the exact remedy. Don't
   silently substitute a cloud API, download optional models, or edit the source.
4. Create a new private workspace at ~/Movies/explain-to-me-demo outside the
   software checkout; choose an unused name if occupied. Copy the bundled manifest.
   Run the agent launcher doctor, then build with --tts apple --voice Samantha
   --duration 60s. Follow the exact launcher commands below. Keep inputs,
   generated media, caches, and logs in that workspace. Don't publish/upload them.
5. Inspect the launcher's exit status, JSON, and report. Report the source tag and
   commit, doctor outcome, job JSON, video, captions, and manifest paths. Open the
   movie if possible. Explain failures accurately and keep their diagnostics.
   Treat automated-ready as automated checks passed, not human approval.

Give me a short result with clickable output paths. Then I can review the movie
and give you a real document. Tiny movie premiere. Sensible receipts.
```

## Exact setup commands

Run from a terminal on macOS. Choose different paths if either destination belongs to an existing project. These commands use a checkout under `~/Developer` and a separate workspace under `~/Movies`:

```bash
mkdir -p ~/Developer
git clone --branch v0.2.0 https://github.com/TommyAllsup/explain-to-me.git ~/Developer/explain-to-me-v0.2.0
cd ~/Developer/explain-to-me-v0.2.0
git rev-parse HEAD

npm exec --cache .cache/npm --yes --package=pnpm@10.18.3 -- pnpm install --frozen-lockfile
node --input-type=module -e 'import {ensureBrowser} from "@remotion/renderer"; await ensureBrowser({chromeMode:"headless-shell"});'

mkdir -m 700 ~/Movies/explain-to-me-demo
cp -n fixtures/golden-manifests/whisper-vs-tts.json ~/Movies/explain-to-me-demo/story.json
```

If the workspace already exists, stop and choose an unused name throughout these commands. `cp -n` preserves an existing `story.json`; it doesn't verify that an existing story is the bundled fixture.

Setup intentionally downloads project dependencies and the browser. If FFmpeg is missing and Homebrew is available, `brew install ffmpeg` supplies FFmpeg and ffprobe. Check voices with `say -v '?'`; install Samantha through macOS settings if needed. The [README](../README.md#quickstart-roll-your-first-tiny-movie) lists runtime requirements. Linux static checks don't establish support for full Linux video builds.

## Check, build, collect the popcorn

The launcher locates its own software checkout, so these commands work from any current directory:

```bash
python3 ~/Developer/explain-to-me-v0.2.0/scripts/agent-explainer.py doctor \
  --workspace ~/Movies/explain-to-me-demo

python3 ~/Developer/explain-to-me-v0.2.0/scripts/agent-explainer.py build \
  --workspace ~/Movies/explain-to-me-demo \
  --manifest ~/Movies/explain-to-me-demo/story.json \
  --tts apple --voice Samantha --duration 60s --label first-movie
```

Each invocation prints one JSON result and returns nonzero on failure. A successful build reports `state: automated-ready`, artifact hashes, and the job's `output` directory. The video is `<output>/video.mp4`. Open the returned path using `open /absolute/path/to/video.mp4`.

Each unique job lives at `<workspace>/.explain-to-me/jobs/<id>/`, with `job.json`, `build.log`, and build `output/`. Caches and temporary data stay under the workspace's `.explain-to-me/`. A successful doctor run has `state: doctor-passed`; it doesn't create a movie.

Don't edit the source checkout or input during a job: the launcher detects changes and refuses readiness. Its `humanReview` and `egress` fields are separate from automated QC. The wrapper isn't an execution sandbox or an independent media decoder. Review the script, watch/listen to the movie, and redact logs before sharing them.

## Give it your own document

Place your `.md` or `.txt` file inside the private workspace. For a first document build with no additional models:

```bash
python3 ~/Developer/explain-to-me-v0.2.0/scripts/agent-explainer.py build \
  --workspace ~/Movies/explain-to-me-demo \
  --input ~/Movies/explain-to-me-demo/my-document.md \
  --director template --tts apple --voice Samantha --duration 60s \
  --label my-document
```

Template mode selects text from the input; it doesn't semantically summarize it. The source must be a real file within the workspace, including after symlink resolution. Use a short workspace path if local direction later runs into Unix-socket path limits.

For optional local model direction and neural narration, follow the [README model setup](../README.md#let-a-local-model-direct-it) first, then use `--director local --tts kokoro --voice af_heart`. Review model and dependency terms separately. The launcher never installs models or updates the checkout for you.

The cartoon release movie and its music were custom production work. There are no `--cartoon` or `--music` flags in 0.2. The built-in renderer uses technical-whiteboard scenes at 720p/24 fps.
