# Cosmos Explorer

Cosmos Explorer is an interactive astronomy experience built around cinematic scrollytelling. It is designed to make the scale and structure of the universe feel immediate before introducing deeper educational material.

## Current milestone: V2 opening experience

The first V2 milestone focuses only on the site's entrance:

- a restrained observatory loading sequence
- a layered canvas starfield with subtle pointer parallax
- the main **COSMOS EXPLORER** hero composition
- a minimal scroll prompt
- the beginning of the first scroll transition, revealing Earth and the journey's departure point
- a reversible, scroll-controlled transition from Earth's curved limb to the full Earth–Moon system
- responsive behavior and reduced-motion support

### Earth–Moon journey milestone

The first scale transition now uses a sticky viewport and a procedural Canvas 2D scene. Scrolling controls the camera distance directly: Earth's atmospheric limb rises into view, the full globe recedes into space, the Moon appears, and a sparse `384,400 KM` lunar-distance marker establishes the first change in scale. Reversing the scroll reverses the entire camera move.

Earth uses the existing NASA Blue Marble surface/cloud composite, inverse spherical projection, a curved day/night terminator, and a thin atmospheric rim. The Moon uses NASA's LROC surface mosaic and the same directional sunlight. Both projected spheres are cached once after their images load, so scrolling only moves and scales them.

The sequence now spans 900 viewport heights. A logarithmic scale curve keeps the opening departure slow before accelerating into the Earth-Moon system. The diameter ratio is accurate; the Earth-Moon separation is compressed for legibility, so this is a cinematic scale illustration rather than a literal distance diagram.

The journey now continues without a section cut from the Earth-Moon system to a heliocentric view. The camera reveals the Solar System, stellar neighborhood, Milky Way, and Local Group before contracting the named galaxies into a single marker within a procedural network of filaments, clusters, and voids. That web then recedes into a bounded observable volume surrounded by a subdued last-scattering surface, ending at the approximate `93 BILLION LIGHT-YEARS` diameter of the observable universe. The horizon is presented as the limit of what can be observed, not as a physical edge. Positions and scales are composed for legibility rather than presented as a literal spatial map.

The header index provides direct access to all eight observation scales. Selecting a destination maps to the corresponding point in the same continuous scroll timeline, and the current scale remains marked when the index is reopened.

A semantic outline carries the same measurements and scale relationships for assistive technology, while the visual canvas remains decorative. The index contains keyboard focus while open and supports Escape to return to the journey.

Canvas updates are synchronized to display frames during scrolling and resizing. The background stars use deterministic positions, so changing viewport size or device orientation does not regenerate the sky, and animation pauses while the page is hidden.

## Run locally

No packages or build tools are required. Open this cloned repository in VS Code and serve it with Live Server, or run `python -m http.server 8000` and open `http://localhost:8000`.

Use a local HTTP server instead of opening `index.html` directly. Browser security can block the image pixel reads needed for spherical projection on `file://` URLs. If a texture fails, a shaded fallback sphere keeps the journey usable.

## Project structure

```text
index.html   Page structure and accessible content
style.css    Visual system, layout, and transitions
script.js    Loading sequence, starfield, pointer depth, and scroll state
```

## Design direction

The interface combines the quiet precision of a scientific observatory with cinematic space-documentary pacing. The palette stays nearly black and off-white, typography carries the first view, and motion is deliberately subtle. The project avoids card-heavy layouts, saturated neon gradients, decorative HUD clutter, and unnecessary dependencies.

## Roadmap

1. Refine the V2 opening and Earth–Moon pullback from real-device feedback.
2. Continue the scale journey into the inner and full Solar System.
3. Extend the journey through stellar, galactic, and observable-universe scales.
4. Add large environmental entry points for each astronomy topic.
5. Build reusable data-driven explorers, beginning with the Solar System.

## Built with

- HTML
- CSS
- Vanilla JavaScript
- Canvas 2D

## Image credits

- Earth texture: [Equirectangular Projected Earth for “LARGEST”](https://svs.gsfc.nasa.gov/3615), NASA/Goddard Space Flight Center Scientific Visualization Studio. Blue Marble Next Generation data courtesy of Reto Stöckli, NASA/GSFC, and NASA Earth Observatory.
- Moon texture: [CGI Moon Kit](https://svs.gsfc.nasa.gov/4720/), NASA Scientific Visualization Studio, Ernie Wright; LRO/LROC data. The local `moon-lroc.jpg` is the original `lroc_color_poles_1k.jpg` visualization map.
