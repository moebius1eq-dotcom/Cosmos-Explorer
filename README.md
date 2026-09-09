# Cosmos Explorer

Cosmos Explorer is an interactive astronomy experience built around cinematic scrollytelling. It is designed to make the scale and structure of the universe feel immediate before introducing deeper educational material.

[Open Cosmos Explorer](https://moebius1eq-dotcom.github.io/Cosmos-Explorer/)

![Cosmos Explorer opening view](assets/cosmos-explorer-preview.png)

## Current experience

The site is one continuous, reversible camera journey across eight observation scales:

1. Earth and Moon
2. Inner Solar System
3. Full Solar System
4. Stellar neighborhood
5. Milky Way
6. Local Group
7. Cosmic web and Laniākea
8. Observable universe

Scrolling controls scale, position, and opacity directly. Earth begins as a curved limb, resolves into a full globe, recedes beside the Moon, and then becomes one orbit around the Sun. Each previously enormous structure contracts before the next scale appears. Scrolling upward reverses the same camera path without a section cut.

The Earth-system index stop holds both bodies in frame with the `384,400 KM` mean lunar-distance marker. The end-state return action resolves to this same frame, so its URL, reload state, and visible destination remain consistent.

Earth uses NASA Blue Marble imagery with inverse spherical projection, directional light, a curved terminator, and a thin atmospheric rim. The Moon uses NASA LROC imagery under the same light direction. The later stages use cached procedural renderings for the Sun, orbital systems, stellar neighborhood, spiral galaxies, cosmic web, and observable horizon.

The stellar-neighborhood hold places the Sun and Alpha Centauri beside Proxima Centauri, Barnard's Star, and Sirius. These reference stars contract into the same point as the camera resolves the Milky Way.

The Milky Way hold marks the galactic center and connects it to the Sun in the Orion Spur with an approximate `26,000 LY` measurement. The annotation contracts with the galaxy before the Local Group appears.

The Local Group hold places the Milky Way beside Andromeda and Triangulum, with the Large and Small Magellanic Clouds retained as named Milky Way satellites. Additional dwarf galaxies remain unlabeled to preserve the group scale without filling the frame with interface text.

The 72-viewport timeline gives the opening Earth departure the most weight before gradually accelerating. Planet diameters retain meaningful relative relationships where legible, while separations and later structures are composed for clarity rather than presented as a literal spatial map.

The inner-system hold identifies Mercury, Venus, Earth, and Mars beside their plotted positions. The full Solar System hold then identifies Jupiter, Saturn, Uranus, and Neptune and resolves the main asteroid belt between the inner and outer planets. Each label set fades before the next scale so the wider journey retains its sparse visual rhythm.

## Navigation and access

The header index jumps to any scale without creating a separate scene. Every destination has a shareable URL fragment and works with browser Back and Forward controls. Manual scrolling updates the current fragment after movement settles. The final frame includes a `RETURN TO EARTH` action that closes the journey into a loop.

A semantic outline exposes the same scale relationships and measurements to assistive technology. The index traps keyboard focus while open, closes with Escape, and marks the active scale. Reduced-motion mode freezes ambient animation while preserving direct scroll control.

## Rendering

The experience uses HTML, CSS, and Canvas 2D with no framework or build step. Planetary and procedural textures are cached before scrolling, canvas updates are synchronized to display frames, and deterministic stars remain stable across resizing. Animation pauses while the page is hidden.

The first-visit loader waits for both its minimum cinematic duration and planetary surface preparation. If an image is unavailable, shaded fallback spheres keep the journey usable.

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

- [x] Build the observatory opening and Earth–Moon departure.
- [x] Continue through the inner and outer Solar System.
- [x] Extend through stellar, galactic, cosmic-web, and observable-universe scales.
- [x] Add responsive navigation, shareable scale links, reduced motion, and semantic access.
- [ ] Refine pacing and composition from real-device feedback.
- [ ] Add environmental entry points for deeper astronomy topics.
- [ ] Build reusable data-driven explorers, beginning with the Solar System.

## Built with

- HTML
- CSS
- Vanilla JavaScript
- Canvas 2D

## Image credits

- Earth texture: [Equirectangular Projected Earth for “LARGEST”](https://svs.gsfc.nasa.gov/3615), NASA/Goddard Space Flight Center Scientific Visualization Studio. Blue Marble Next Generation data courtesy of Reto Stöckli, NASA/GSFC, and NASA Earth Observatory.
- Moon texture: [CGI Moon Kit](https://svs.gsfc.nasa.gov/4720/), NASA Scientific Visualization Studio, Ernie Wright; LRO/LROC data. The local `moon-lroc.jpg` is the original `lroc_color_poles_1k.jpg` visualization map.
