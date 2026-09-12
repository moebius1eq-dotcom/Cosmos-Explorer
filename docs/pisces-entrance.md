# PISCES entrance: final-piece milestone

Scope: replace only the old loading presentation. The finished piece holds in place; there is no camera pass-through, homepage redesign, or new Journey stage. The pre-PISCES version is preserved by `pre-pisces-2026-09-12` and `codex/pre-pisces` at `bc5c693`.

The initial outline-based entrance is separately checkpointed at `c6587a0`, annotated tag `pisces-entrance-initial-2026-09-12`. The revised composition uses five unique polygonal fragments, beveled thickness, rough dark surfaces and restrained raking illumination. They partition a single irregular structure without a tile grid or conventional jigsaw connectors.

## Local review

Serve this same repository with VS Code Live Server or a local HTTP server. Open `index.html` without a Journey fragment to see the entrance. It plays on every fresh home visit during this milestone; **Replay entrance** repeats it using the already prepared assets. A direct `index.html#departure` or existing scale/progress fragment retains access to the old Journey after preparation. Atlas URLs are unchanged.

Review the fragments' depth and silhouettes, the detached piece's slow drift, the neighboring fragments' alignment, and the short axial seating motion. A faint response crosses the assembled seams before PISCES emerges on its front surface, sharing its perspective. There is no separate caption underneath. Pointer movement changes perspective slightly so the different depths produce parallax. The background stays almost black. After completion, rendering stops until pointer input or resize. On a phone the camera fits the composition horizontally. Reduced motion disables drift, parallax and docking travel; the finished structure and title appear only when preparation settles.

## Readiness and fallbacks

`script.js` exposes `window.cosmosAssetsReady`, combining the existing Earth/Moon surface preparation with the actual Three.js texture results from `flight.js`. This loading integration is unchanged by the sculptural revision. The entrance consumes this promise. Its 1.8-second reveal is presentation timing, not a loading percentage or permission to finish while assets are unresolved. The approach lasts 3 seconds, seating 240 milliseconds, and structural settling 1.1 seconds. Lettering appears during the latter half of settling.

Image failures settle on usable shaded or solid-color substitutes. A request still stalled after 15 seconds explicitly chooses that substitute and rejects subsequent late imagery; it does not claim that the missing texture loaded. No session-storage access controls entrance completion. When WebGL or its module is unavailable, SVG renders the same filled silhouettes with a static completion state. The live status is available to assistive technology without visible loading copy.

The camera pass-through is deferred. For now `entrance.js` owns a small presentation renderer; the preserved Journey renderer prepares its resources but does not draw behind the entrance. Hero and fallback draw loops also stay paused. The entrance caps pixel ratio at 1.5, uses five low-complexity meshes and one lettering texture, has no particle field or postprocessing, and pauses in hidden tabs. Direct Journey navigation disposes its resources.

## Automated checks

Run `node --test tests/entrance.test.mjs tests/entrance-timing.test.mjs`. Fifteen checks cover complete partition area, matching internal fractures, precise final alignment, restrained structural displacement, readiness gating, phase boundaries, reduced motion and replay. JavaScript syntax and Git whitespace checks also pass.

Fresh browser visual and device performance checks remain for local review; the earlier browser-preview denial was not bypassed. No GPU frame-rate claim is made by the unit checks.
