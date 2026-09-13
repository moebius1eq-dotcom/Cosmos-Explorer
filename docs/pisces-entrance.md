# PISCES entrance: astronomy montage

Scope: replace only the old loading presentation. The finished piece holds in place; there is no camera pass-through, homepage redesign, or new Journey stage. The pre-PISCES version is preserved by `pre-pisces-2026-09-12` and `codex/pre-pisces` at `bc5c693`.

The initial outline entrance is checkpointed at `c6587a0`, tag `pisces-entrance-initial-2026-09-12`. The subsequent sculptural entrance is checkpointed at `38fb0e0`, tag `pisces-entrance-sculptural-2026-09-12`. Both tags are pushed to the existing GitHub repository.

## Local review

Serve this same repository with VS Code Live Server or a local HTTP server. Open `index.html` without a Journey fragment to see the entrance. It plays on every fresh home visit during this milestone; **Replay entrance** repeats it using the already prepared assets. A direct `index.html#departure` or existing scale/progress fragment retains access to the old Journey after preparation. Atlas URLs are unchanged.

The opening introduces Earth and a coordinate study, followed by an accelerating sequence of astronomy fragments. Pages enter from different depths, flip, slide and briefly align in related pairs. They converge into an irregular editorial mosaic with one empty central region. The final Earth/coordinate composite arrives, seats precisely and sends a restrained brightness/alignment response through its neighbors. The imagery then resolves into the PISCES wordmark and tagline.

The identity is a single shared texture mapped continuously across the assembled fragments. Each image changes into its corresponding part of the lettering; the final title is not a separate caption placed beneath the montage. The image shader preserves the source colors and visible contrast without depending on dim environmental lighting.

Approximate sequence duration with ready assets: 10.88 seconds. Discovery occupies 1.8 seconds, accelerating assembly 3.6 seconds, and convergence 2.2 seconds. Final-piece arrival takes 1.05 seconds, seating 180 milliseconds, neighboring response 650 milliseconds, and identity resolution 1.4 seconds. Additional time at the central gap depends on actual readiness.

## Readiness and fallbacks

`script.js` exposes `window.cosmosAssetsReady`, combining the existing Earth/Moon surface preparation with actual Three.js texture results from `flight.js`. The montage preserves that integration and also waits for its own locally stored image studies to decode. Diagram previews permit discovery and assembly while photos load. Only the combined readiness result permits the final piece to enter; an unresolved load holds the assembled mosaic with its central gap.

Image failures retain populated astronomy diagrams. Requests stalled after 15 seconds select those fallbacks and ignore subsequent late imagery. Paint and update-callback errors cannot leave readiness pending. No session-storage access controls entrance completion. If WebGL or its module is unavailable, Canvas 2D presents the same image/diagram montage and shared identity. Reduced motion uses a static assembled composition with the central gap until assets settle, then shows the finished identity without flips or travel. The live status remains available to assistive technology without visible loading copy.

The entrance uses 15 simple quadrilateral meshes, cached 512-pixel artwork canvases and one shared identity texture. It has no bloom or particle cloud and caps pixel ratio at 1.5. Drawing pauses in hidden tabs and at the readiness hold, and stops after the identity settles. The preserved Journey and hero do not draw behind the entrance. Direct Journey navigation disposes the montage resources.

## Image and diagram sources

Earth and Moon reuse `assets/atlas-earth.png` and `assets/atlas-moon.png`, derived from the NASA imagery already credited in the README. Saturn, Jupiter and Mars reuse the existing mission photographs, with original references in `assets/atlas-sources.json`. The coordinate, celestial-sphere, orbital, parallax, spectral, solar, galaxy and geometry studies are original schematic illustrations. Their spectra and star patterns are not presented as measured datasets or named observed constellations. All studies are brief visual fragments rather than lessons or scale maps.

## Automated checks

Run `node --test tests/entrance.test.mjs tests/entrance-timing.test.mjs`. Twenty checks cover shared mosaic edges, the discovery pair, central-gap preservation, continuous identity coordinates, temporary pairing, finite transforms, acceleration, actual-readiness gating, exact phase boundaries, reduced motion and replay. Syntax and Git whitespace checks pass. Separate artwork contract checks exercised successful decoding, failures, disposal, drawing exceptions and callback exceptions without a browser.

Fresh browser visual and device performance checks remain for local review; the earlier browser-preview denial was not bypassed. No GPU frame-rate claim is made by the unit checks.
