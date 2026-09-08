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

The polished Earth rendering maps NASA Blue Marble imagery onto a Canvas 2D sphere, then adds directional daylight, a shadowed night side, and a thin atmospheric rim. The Moon uses a deterministic multi-scale surface texture with directional lighting. The sequence now spans a longer scroll distance with a slower initial departure and subtle depth-based star movement.

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
