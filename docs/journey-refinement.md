# Journey refinement — 2026-09-10

Checkpoint: `cb226aa`. Scope: refine the existing journey; no additional scale stages or page redesign.

## Visual and pacing changes

- Earth retains its thin blue atmosphere; near-Earth fill is cool and Solar System fill is restrained warm reflected light.
- The stellar field has muted red/orange, yellow-white and blue-white populations with a skewed luminosity distribution. Foreground-star intensity declines through the Local Group.
- Galaxy geometry uses unequal arm phases, a diffuse disk, a Gaussian central bar/bulge, vertical outer-disk warp and a different phase for Andromeda. Warm central populations and cooler scattered disk populations replace uniform blue-white particles.
- A coherent density field and arm-edge attenuation approximate patchy dust extinction. This is illustrative brightness attenuation, not radiative-transfer modeling or an observed map.
- Filaments vary in width, bend and brightness. Dense nodes and faint connections replace uniformly populated straight edges; sparse outliers soften the geometry.
- Planet close passes occupy a wider portion of their existing intervals. The galactic and Local Group passes have more scroll distance before the cosmic-web transition. Playback is approximately four minutes. Wheel amplification is reduced from 2.8 to 2.0, retaining momentum and immediate reversal.
- One annotation appears at a time with progress-based fades. Labels use a common upper-right anchor, 12/9 px desktop type and 10/8 px mobile type. Titles, interaction controls, line opacity and spacing retain the existing hierarchy.
- Object titles and inspection targets stay with the visible subject through handoffs. Marker projection now updates the camera matrix first, eliminating one-frame placement lag.

## Annotation references

All quantities are rounded and independent of the composed scene geometry. References checked on 2026-09-10.

| Quantity | Display | Reference |
| --- | --- | --- |
| Earth–Moon mean separation | 384,400 km | [NASA Moon facts](https://science.nasa.gov/moon/facts/) |
| Earth–Sun mean separation | 1 AU ≈ 149.6 million km | [NASA/JPL astrodynamic parameters](https://ssd.jpl.nasa.gov/astro_par.html) |
| Sun to Galactic Center | ≈ 26,000 light-years | [NASA Imagine the Universe](https://imagine.gsfc.nasa.gov/science/featured_science/milkyway/index.html) |
| Milky Way stellar disk diameter | ≈ 100,000 light-years | [NASA Imagine the Universe](https://imagine.gsfc.nasa.gov/science/featured_science/milkyway/index.html) |
| Andromeda distance from Earth | ≈ 2.5 million light-years | [NASA Andromeda](https://science.nasa.gov/photojournal/andromeda/) |
| Local Group | Million-light-year scales; no rigid boundary asserted | Same Andromeda distance provides the nearby-group scale reference |
| Observable diameter today | ≈ 92 billion light-years | [NASA: How Big Is Space?](https://www.nasa.gov/science-research/astrophysics/how-big-is-space-we-asked-a-nasa-expert-episode-61/) |

The last quantity uses NASA's rounded estimate; it is not light-travel distance or an assertion that the horizon is a physical wall. The atlas and fallback labels use the same rounding. The cosmic-web annotation identifies an illustration of galaxy density and deliberately makes no unverified measurement from its geometry.

## Performance audit

Browser: Chrome, 1366×768, software WebGL (SwiftShader). These measurements are development diagnostics, not a claim about laptop GPU FPS.

- Geometry population: 65,500 to 47,500 particles, a 27.5% reduction.
- Sphere mesh: 96×64 to 64×48 segments, roughly half the triangles per sphere. Close-up silhouettes checked visually.
- Pixel-ratio cap: 1.75 to 1.5, reducing the maximum render-target pixel count by about 26.5% on high-DPI screens.
- Repeated identical progress calls: 30 calls at each of seven scales produced zero extra WebGL renders after the first frame. Texture completion and resize force a refresh.
- Moving samples: 20 animation-frame samples at each of seven scales measured median JavaScript render submission of approximately 0.2–0.4 ms, with measured sample maxima around 0.3–0.6 ms. These timings exclude GPU execution.
- Visible draw calls ranged from 2 to 15; the maximum occurs while the Solar System and galaxy overlap. Hidden solar geometry is disabled after that transition.
- The old Canvas starfield no longer runs its animation loop while the 3D journey is visible. Hidden legacy labels no longer receive dozens of style writes each frame. Caption text changes only when its subject or chapter changes. Reusable vectors replace per-frame camera/projection allocations.
- Rendering stops for unchanged progress and hidden documents; resize, texture completion and visibility restoration invalidate the frame.

## Review and verification

A complete traversal used repeated 120-unit mouse-wheel impulses separated by 220 ms. Every planetary visit and subsequent scale was reached in order. Planet titles typically remained through six or seven impulses; the galactic passage lasted about 25. Handoff review caught and fixed titles changing before their visible subjects.

Reviewed desktop frames at Earth, Venus, the stellar transition, Milky Way, Andromeda, cosmic web and observable universe, plus mobile framing. Interaction checks cover deterministic camera reversal, Play/Pause, hamburger/Escape, scale navigation, mobile inspection links, Observatory navigation and graphics-context fallback. Real mouse/GPU feel remains a local user review item.
