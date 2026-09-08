# Cosmos Explorer

Cosmos Explorer is an interactive astronomy experience built around cinematic scrollytelling. It is designed to make the scale and structure of the universe feel immediate before introducing deeper educational material.

## Current milestone: V2 opening experience

The first V2 milestone focuses only on the site's entrance:

- a restrained observatory loading sequence
- a layered canvas starfield with subtle pointer parallax
- the main **COSMOS EXPLORER** hero composition
- a minimal scroll prompt
- the beginning of the first scroll transition, revealing Earth and the journey's departure point
- responsive behavior and reduced-motion support

The other exploration areas—Solar System, Stars, Black Holes, Galaxies, and Universe—are intentionally deferred until the opening experience is tested and approved.

## Run locally

No packages or build tools are required. Open `index.html` directly, or serve the folder with any simple local web server.

## Project structure

```text
index.html   Page structure and accessible content
style.css    Visual system, layout, and transitions
script.js    Loading sequence, starfield, pointer depth, and scroll state
```

## Design direction

The interface combines the quiet precision of a scientific observatory with cinematic space-documentary pacing. The palette stays nearly black and off-white, typography carries the first view, and motion is deliberately subtle. The project avoids card-heavy layouts, saturated neon gradients, decorative HUD clutter, and unnecessary dependencies.

## Roadmap

1. Refine the V2 opening from real-device feedback.
2. Expand the scale journey from Earth through the observable universe.
3. Add large environmental entry points for each astronomy topic.
4. Build reusable data-driven explorers, beginning with the Solar System.

## Built with

- HTML
- CSS
- Vanilla JavaScript
- Canvas 2D
