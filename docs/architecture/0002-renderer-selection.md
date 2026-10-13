# Architecture Decision 0002: Renderer Selection

- **Status:** Accepted for initial implementation; portability review required
- **Date:** 2026-10-13
- **Related plan:** [Explain-to-Me Implementation Plan](../plans/2026-10-13-explain-to-me-implementation-plan.md)
- **System boundary:** [Architecture Decision 0001](0001-system-boundaries.md)

## Decision

Use Remotion for the first deterministic renderer, accessed only through a renderer-neutral `RendererAdapter`. Keep `ProductionManifest` and timeline contracts free of Remotion types. Before treating the renderer choice as settled, implement the planned Revideo portability spike against the same golden manifest.

This is a delivery choice, not a permanent coupling decision. Keep the neutral adapter boundary from the first milestone, but implement the Revideo comparison after releasable MVP acceptance, before declaring renderer selection settled. Do not delay the first watchable Apple/preview video to build a second renderer.

## Why Remotion first

The planned MVP needs reusable React/TypeScript layouts, SVG diagrams, captions, syntax-highlighted code, browser captures, image motion, frame-accurate timing, and command-line/headless rendering. Remotion is the shortest planned path to those capabilities and has the larger ecosystem assumed by the implementation plan.

The renderer remains downstream of measured audio timing. It receives validated scenes and assigned intervals; it does not determine narration duration or execute model-authored code.

## License constraint

Remotion is source-available rather than conventionally open source. Its license/pricing terms distinguish use cases and may impose different requirements for automated rendering or organizational scale. Therefore:

1. Remotion use must be reviewed against the then-current official license and pricing terms before distribution, hosted automation, or organizational deployment.
2. The build report must record the renderer name/version and the license identifier or reviewed terms reference used for that release.
3. No architecture decision may assume that every future user or deployment qualifies for no-cost Remotion use.
4. Product code must not place Remotion-specific types, components, composition IDs, or configuration in the renderer-neutral manifest.

The approved plan's source for this constraint is the official Remotion license/pricing documentation linked in its Sources section. This decision records the constraint but is not legal advice and does not freeze changing license terms.

## Adapter boundary

The renderer contract must be expressible without React or Remotion concepts. At minimum it accepts:

- a validated `ProductionManifest`;
- a measured timeline with scene, narration, caption, and cue intervals;
- resolved local asset references with provenance;
- output video settings and an output location; and
- deterministic render configuration such as frame rate and dimensions.

It returns:

- rendered video-only or mux-ready media;
- renderer/version metadata;
- frame count and measured render wall time;
- warnings and unsupported-feature diagnostics; and
- deterministic identifiers/hashes needed by validation.

Renderer-specific compilation happens after manifest validation. A renderer may reject an unsupported known scene capability, but it may not mutate the production meaning silently.

## Revideo exit strategy

Revideo is the planned permissively licensed alternative because the implementation plan identifies an MIT-licensed TypeScript renderer with headless rendering and FFmpeg-based final media handling. The exit strategy is concrete:

1. Keep all scene data in shared renderer-neutral contracts.
2. Keep audio synthesis, captions, timeline derivation, asset resolution, caching, muxing policy, and validation outside the Remotion application.
3. Implement `renderer-revideo` for every scene kind and cue capability instantiated by the golden manifest: title, statement/text with kinetic labels, diagram, comparison, code card, and outro, plus any other kind present in the frozen fixture.
4. If a renderer cannot express a non-semantic styling capability directly, resolve it through an explicitly specified deterministic fallback in shared renderer-neutral contracts before adapter compilation. A fallback must preserve text/content, scene kind semantics, assigned interval, cues, and required visual coverage; silent omission or renderer-private reinterpretation is a failure.
5. Render the exact same `whisper-vs-tts` golden manifest through both engines. The Revideo run may not use a reduced fixture, delete scenes/cues, or substitute a renderer-specific manifest.
6. Compare probe validity, scene/timeline accuracy, audio sync, required visual coverage, fallback use, wall time, memory, visual parity, unsupported capabilities, and migration cost.
7. Record the evidence in `docs/benchmarks/renderer-comparison.md` before deciding whether Revideo stays a fallback or becomes the default.

### Exit criteria

Migration away from Remotion must not require changes to:

- the golden source fixture;
- the `ProductionManifest` schema or semantic scene intent;
- narration audio or caption contracts;
- asset provenance/cache records; or
- the public CLI output artifact names.

A renderer change may require renderer-specific scene implementations and styling adjustments. Any manifest schema change required solely by Revideo/Remotion differences indicates a boundary failure and must be corrected in shared contracts rather than exposed to users.

The portability spike fails if either renderer cannot render every scene/cue in the unchanged golden manifest and no predeclared renderer-neutral deterministic fallback covers the capability. Merely producing a valid MP4 from a reduced subset does not pass.

## Rejected alternatives for the initial renderer

| Option | Initial disposition | Reason |
|---|---|---|
| Revideo | Required portability spike/fallback | Strong licensing posture, but the plan expects a smaller ecosystem and requires measured capability comparison. |
| Motion Canvas | Specialist option | Useful cue/synchronization ideas, but not selected as the initial general compositor. |
| Full generative video | Deferred optional B-roll | Too slow and nondeterministic for the factual timeline or a hard build-time budget. |
| Model-authored React/render code | Rejected | Unsafe, difficult to validate, and incompatible with repeatable renderer portability. |

## Consequences

- Initial implementation can use Remotion's productive React model without making it part of the public data contract.
- License suitability remains a release/deployment check, not an undocumented assumption.
- Revideo portability is verified with an implemented comparison rather than claimed from interface design alone.
- Renderer benchmarking uses the same golden fixture and acceptance definitions as the rest of the MVP.
