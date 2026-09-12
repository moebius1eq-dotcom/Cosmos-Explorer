# PISCES entrance: final-piece milestone

Scope: replace only the old loading presentation. The finished piece holds in place; there is no camera pass-through, homepage redesign, or new Journey stage. The pre-PISCES version is preserved by `pre-pisces-2026-09-12` and `codex/pre-pisces` at `bc5c693`.

## Local review

Serve this same repository with VS Code Live Server or a local HTTP server. Open `index.html` without a Journey fragment to see the entrance. It plays on every fresh home visit during this milestone; **Replay entrance** repeats it using the already prepared assets. A direct `index.html#departure` or existing scale/progress fragment retains access to the old Journey after preparation. Atlas URLs are unchanged.

Review the very low-contrast outlines, the detached piece's slow drift, its controlled approach, and the short axial seating motion. The background should remain almost black. After seating, the PISCES signature appears and all canvas animation stops. On a phone the camera fits the same composition horizontally. With reduced motion enabled, the outlines remain static and the piece takes its final position only when preparation settles.

## Readiness and fallbacks

`script.js` exposes `window.cosmosAssetsReady`, combining the existing Earth/Moon surface preparation with the actual Three.js texture results from `flight.js`. The entrance consumes this promise. Its 1.6-second reveal is presentation timing, not a loading percentage or permission to finish while assets are unresolved. The approach lasts 2.4 seconds and final seating 210 milliseconds.

Image failures settle on usable shaded or solid-color substitutes. A request still stalled after 15 seconds explicitly chooses that substitute and rejects subsequent late imagery; it does not claim that the missing texture loaded. No session-storage access controls entrance completion. When WebGL or its module is unavailable, SVG renders the same matching outlines with a static completion state. The live status is available to assistive technology without visible loading copy.

The camera pass-through is deferred. For now `entrance.js` owns a small presentation renderer; the preserved Journey renderer prepares its resources but does not draw behind the entrance. Hero and fallback draw loops also stay paused. The entrance caps pixel ratio at 1.5, uses 14 outlines with no particle field, pauses in hidden tabs, and stops rendering after lock. Direct Journey navigation disposes its resources.

## Automated checks

Run `node --test tests/entrance.test.mjs`. These checks cover exact four-edge fit, closed and varied outlines, readiness gating, the ordered approach/seating/locked states, reduced motion, replay and easing without overshoot. JavaScript syntax and Git whitespace checks also pass.

Fresh browser visual and device performance checks remain for local review; the earlier browser-preview denial was not bypassed. No GPU frame-rate claim is made by the unit checks.
