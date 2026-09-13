// Small, static astronomy studies for the PISCES entrance. These are editorial
// glimpses: diagrams and simulated spectra/star fields are illustrations, not data.
const SIZE = 512;
const INK = '#e1e7e8';
const BLUE = '#8eb6ce';
const GOLD = '#d6b782';
const IDS = ['earth', 'moon', 'saturn', 'jupiter', 'mars', 'coordinates', 'sphere', 'orbit', 'parallax', 'spectrum', 'stars', 'solar', 'galaxy', 'geometry', 'key'];

export const CONTENT_CREDITS = [
  'Earth and Moon: the existing locally stored NASA-derived globe assets.',
  'Saturn, Jupiter and Mars: existing NASA imagery; source URLs in assets/atlas-sources.json.',
  'Coordinate grids, orbital geometry, spectra, galaxy and star studies: original schematic illustrations; not observed datasets.'
];

function random(seed) {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
}

function label(c, text, x, y, size = 15, color = INK) {
  c.fillStyle = color;
  c.font = `400 ${size}px monospace`;
  c.fillText(text, x, y);
}

function line(c, points, color = INK, width = 1.3) {
  c.strokeStyle = color;
  c.lineWidth = width;
  c.beginPath();
  points.forEach(([x, y], index) => index ? c.lineTo(x, y) : c.moveTo(x, y));
  c.stroke();
}

function ellipse(c, x, y, rx, ry, angle = 0, color = INK, width = 1.3) {
  c.strokeStyle = color;
  c.lineWidth = width;
  c.beginPath();
  c.ellipse(x, y, rx, ry, angle, 0, Math.PI * 2);
  c.stroke();
}

function disc(c, x, y, r, color = INK) {
  c.fillStyle = color;
  c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
}

function backdrop(c, id) {
  c.clearRect(0, 0, SIZE, SIZE);
  c.fillStyle = '#080c10'; c.fillRect(0, 0, SIZE, SIZE);
  const warm = ['solar', 'jupiter', 'mars', 'saturn', 'galaxy', 'spectrum'].includes(id);
  const g = c.createRadialGradient(270, 240, 15, 270, 240, 410);
  g.addColorStop(0, warm ? '#25221e' : '#15242e');
  g.addColorStop(1, '#080c10');
  c.fillStyle = g; c.fillRect(0, 0, SIZE, SIZE);
}

function starStudy(c, seed = 73, count = 56, connections = false) {
  const rng = random(seed);
  const stars = [];
  for (let n = 0; n < count; n++) {
    const x = 18 + rng() * 476, y = 16 + rng() * 480;
    const r = 0.6 + rng() ** 4 * 2.2;
    stars.push([x, y]);
    disc(c, x, y, r, n % 6 === 0 ? GOLD : '#c6dbe6');
  }
  if (connections) {
    // An intentionally unnamed illustrative asterism, not a claimed constellation.
    line(c, [[62, 306], [147, 202], [251, 230], [308, 122], [429, 176]], '#9daeb8', 1.5);
    line(c, [[147, 202], [211, 382], [332, 403], [429, 176]], '#758c9b', 1.2);
    [[62, 306], [147, 202], [251, 230], [308, 122], [429, 176], [211, 382], [332, 403]].forEach(([x, y]) => {
      disc(c, x, y, 3.1); ellipse(c, x, y, 7, 7, 0, '#7997aa', 0.8);
    });
  }
}

function coordinateGrid(c, alpha = 1) {
  c.save(); c.globalAlpha = alpha;
  for (let i = 0; i < 7; i++) {
    const x = 38 + i * 74;
    line(c, [[x, 56], [x - 30, 474]], '#466373', 0.9);
    line(c, [[14, 73 + i * 63], [494, 73 + i * 63]], '#466373', 0.9);
  }
  label(c, 'α  06h      08h      10h', 46, 39, 17, '#c6d9e5');
  label(c, 'δ +30°', 24, 464, 15, '#c6d9e5');
  c.restore();
}

function sphere(c) {
  c.save(); c.translate(256, 265); c.rotate(-0.25);
  ellipse(c, 0, 0, 189, 189, 0, '#d2dee5', 2.1);
  for (const r of [55, 113, 164]) ellipse(c, 0, 0, r, 189, 0, '#7f9fae', 1.1);
  for (const y of [-128, -68, 0, 68, 128]) ellipse(c, 0, y, Math.sqrt(189 ** 2 - y ** 2), 30 + Math.abs(y) * 0.11, 0, '#7f9fae', 1.1);
  line(c, [[0, -237], [0, 237]], '#c5d8e4', 1.4);
  line(c, [[-222, 0], [222, 0]], GOLD, 1.8);
  line(c, [[0, 0], [128, -117]], INK, 2);
  disc(c, 128, -117, 4.5, GOLD);
  c.restore();
  label(c, 'CELESTIAL SPHERE', 30, 40, 16);
  label(c, 'α / δ', 376, 461, 26, GOLD);
}

function orbits(c) {
  c.save(); c.translate(275, 280); c.rotate(-0.44);
  for (let i = 0; i < 4; i++) ellipse(c, 0, 0, 63 + i * 67, 33 + i * 38, 0, i === 2 ? '#d8c293' : '#8497a3', i === 2 ? 2 : 1.3);
  disc(c, -43, 0, 15, GOLD);
  disc(c, 134, -78, 7.5, '#bfd8e8');
  line(c, [[-43, 0], [134, -78]], '#d8cba7', 1.1);
  c.setLineDash([5, 7]); line(c, [[-244, 0], [244, 0]], '#82949d', 1); c.setLineDash([]);
  c.restore();
  label(c, 'ORBITAL GEOMETRY', 29, 42, 16);
  label(c, 'r = a(1 − e²) / (1 + e cos θ)', 26, 471, 15, '#c3d0d7');
  label(c, 'θ', 301, 244, 24, GOLD);
}

function parallax(c) {
  coordinateGrid(c, 0.28);
  const a = [83, 390], b = [431, 390], s = [251, 116];
  ellipse(c, 256, 390, 177, 43, 0, '#849dad');
  line(c, [a, s, b], INK, 2);
  line(c, [a, b], GOLD, 2);
  c.setLineDash([4, 6]); line(c, [[251, 79], [251, 461]], '#789aaa'); c.setLineDash([]);
  disc(c, ...s, 4.8, INK); disc(c, ...a, 5, BLUE); disc(c, ...b, 5, BLUE);
  c.strokeStyle = GOLD; c.lineWidth = 2; c.beginPath(); c.arc(s[0], s[1], 63, 1.03, 1.57); c.stroke();
  label(c, 'p', 270, 196, 30, GOLD);
  label(c, 'd (pc) = 1 / p (arcsec)', 56, 51, 20);
  label(c, 'STELLAR PARALLAX', 69, 479, 16, '#a0b9c7');
}

function spectrum(c) {
  const g = c.createLinearGradient(0, 0, SIZE, 0);
  g.addColorStop(0, '#60778f'); g.addColorStop(0.25, '#98bdc7');
  g.addColorStop(0.58, '#c3c6a0'); g.addColorStop(0.78, '#d0b477'); g.addColorStop(1, '#a17b68');
  c.fillStyle = g; c.fillRect(0, 140, SIZE, 107);
  const positions = [43, 75, 118, 127, 162, 203, 271, 275, 349, 391, 430, 462];
  positions.forEach((x, i) => { c.fillStyle = i % 3 ? '#242522' : '#0f161d'; c.fillRect(x, 140, 1.5 + i % 4, 107); });
  line(c, [[17, 408], [496, 408]], '#879da8');
  const points = [];
  for (let x = 18; x < 497; x += 2) {
    let y = 318 + Math.sin(x * 0.011) * 10;
    for (const p of positions) y += 50 * Math.exp(-(((x - p) / 3) ** 2));
    points.push([x, y]);
  }
  line(c, points, '#e1d3b3', 1.7);
  label(c, 'ABSORPTION / ILLUSTRATION', 28, 64, 16);
  label(c, 'WAVELENGTH →', 303, 454, 15, '#a7b8c0');
}

function solar(c) {
  const g = c.createRadialGradient(257, 306, 42, 257, 306, 204);
  g.addColorStop(0, '#f1d291'); g.addColorStop(0.67, '#dca85b');
  g.addColorStop(0.96, '#a26937'); g.addColorStop(1, '#513823');
  disc(c, 257, 306, 190, g);
  c.save(); c.beginPath(); c.arc(257, 306, 189, 0, Math.PI * 2); c.clip();
  const rng = random(191);
  for (let i = 0; i < 380; i++) {
    const x = 67 + rng() * 380, y = 116 + rng() * 380;
    disc(c, x, y, 0.6 + rng() * 3.7, rng() > 0.5 ? '#e0ba76' : '#bc8745');
  }
  c.restore();
  for (let i = 0; i < 3; i++) ellipse(c, 258, 305, 202 + i * 10, 202 + i * 10, 0, `rgba(202,157,89,${0.32 - i * 0.09})`, 1);
  label(c, 'OUR STAR', 30, 42, 16, '#dfcba7');
  label(c, 'SOLAR STUDY', 30, 73, 13, '#b5a68e');
}

function galaxy(c) {
  const rng = random(918);
  c.save(); c.translate(263, 268); c.rotate(-0.38); c.scale(1, 0.7);
  const halo = c.createRadialGradient(0, 0, 4, 0, 0, 243);
  halo.addColorStop(0, '#e8cba5'); halo.addColorStop(0.11, '#a48768');
  halo.addColorStop(0.38, '#494647'); halo.addColorStop(1, 'rgba(42,48,55,0)');
  disc(c, 0, 0, 250, halo);
  // Static density and extinction strokes give the study structure without a
  // per-frame particle simulation or a claim that this is a photograph.
  for (let arm = 0; arm < 3; arm++) {
    for (let lane = 0; lane < 19; lane++) {
      const points = [];
      for (let i = 0; i < 83; i++) {
        const r = 27 + i * 2.55 + (lane - 9) * 1.5;
        const angle = arm * Math.PI * 2 / 3 + i * 0.05 + Math.sin(i * 0.17) * 0.045;
        points.push([Math.cos(angle) * r, Math.sin(angle) * r]);
      }
      line(c, points, lane < 4 ? 'rgba(20,25,31,0.42)' : 'rgba(143,163,182,0.10)', lane < 4 ? 2.1 : 3.9);
    }
  }
  for (let i = 0; i < 230; i++) {
    const r = Math.sqrt(rng()) * 226, angle = rng() * Math.PI * 2;
    disc(c, Math.cos(angle) * r, Math.sin(angle) * r, 0.5 + rng(), i % 6 ? '#8496a7' : '#c5ac8b');
  }
  const core = c.createRadialGradient(0, 0, 0, 0, 0, 46);
  core.addColorStop(0, '#eddbc0'); core.addColorStop(0.35, '#c0a47f'); core.addColorStop(1, 'rgba(137,108,78,0)');
  disc(c, 0, 0, 46, core); c.restore();
  label(c, 'GALACTIC STRUCTURE', 26, 39, 16);
  label(c, 'DISK / BULGE / DUST', 26, 478, 14, '#a8b7c1');
}

function geometry(c) {
  const a = [81, 408], b = [439, 408], v = [342, 102];
  line(c, [a, b, v, a], '#dbe5e9', 2.2);
  c.setLineDash([5, 7]); line(c, [v, [342, 408]], '#98adb8', 1.2); c.setLineDash([]);
  line(c, [[324, 408], [324, 390], [342, 390]], '#98adb8', 1.1);
  c.strokeStyle = GOLD; c.lineWidth = 2; c.beginPath(); c.arc(...a, 83, -0.864, 0); c.stroke();
  label(c, 'θ', 168, 382, 30, GOLD);
  label(c, 'h', 355, 264, 25); label(c, 'd', 239, 441, 25);
  label(c, 'tan θ = h / d', 26, 58, 25, INK);
  label(c, 'ANGLE → DISTANCE', 28, 484, 15, '#b4c8d3');
}

function planetFallback(c, id) {
  const warm = ['saturn', 'jupiter', 'mars'].includes(id);
  const color = id === 'moon' ? '#b7bdbe' : warm ? '#c4a178' : '#739eaf';
  const g = c.createRadialGradient(189, 183, 8, 263, 281, 221);
  g.addColorStop(0, color); g.addColorStop(0.65, warm ? '#665440' : '#3a5666'); g.addColorStop(1, '#0a0f14');
  if (id === 'saturn') ellipse(c, 256, 277, 274, 72, -0.42, '#c7b79b', 17);
  disc(c, 262, 270, id === 'saturn' ? 121 : 204, g);
  c.save(); c.translate(262, 270); c.rotate(-0.28);
  const radius = id === 'saturn' ? 121 : 204;
  for (const w of [0.3, 0.65, 0.91]) ellipse(c, 0, 0, radius * w, radius, 0, 'rgba(203,221,229,0.40)', 1.2);
  ellipse(c, 0, 0, radius, radius * 0.24, 0, 'rgba(203,221,229,0.60)', 1.4);
  c.restore();
  label(c, id === 'key' ? 'A CONNECTED UNIVERSE' : id.toUpperCase(), 27, 41, 17, INK);
  label(c, 'GEOMETRIC STUDY', 27, 480, 13, '#a9bbc5');
}

function fallback(c, id) {
  backdrop(c, id);
  if (id === 'coordinates') { coordinateGrid(c); starStudy(c, 18, 42, true); }
  else if (id === 'sphere') sphere(c);
  else if (id === 'orbit') orbits(c);
  else if (id === 'parallax') parallax(c);
  else if (id === 'spectrum') spectrum(c);
  else if (id === 'stars') { starStudy(c, 62, 71, true); label(c, 'THE PATTERN BETWEEN', 29, 42, 16); }
  else if (id === 'solar') solar(c);
  else if (id === 'galaxy') galaxy(c);
  else if (id === 'geometry') geometry(c);
  else planetFallback(c, id);
}

function paintPhoto(c, image, id) {
  backdrop(c, id);
  const enlarged = id === 'key' ? 1.55 : id === 'earth' || id === 'moon' ? 1.14 : 1;
  const scale = Math.max(SIZE / image.naturalWidth, SIZE / image.naturalHeight) * enlarged;
  const w = image.naturalWidth * scale, h = image.naturalHeight * scale;
  const x = (SIZE - w) * 0.5 + (id === 'key' ? 99 : id === 'earth' ? 22 : 0);
  const y = (SIZE - h) * 0.5 + (id === 'key' ? 79 : 10);
  c.save(); c.filter = 'brightness(1.24) contrast(1.04)'; c.drawImage(image, x, y, w, h); c.restore();
  // The atlas sources include their own black sky; white measurement marks and
  // a photographic crop make each fragment legible while it is moving.
  const shade = c.createLinearGradient(0, 0, 0, 140);
  shade.addColorStop(0, 'rgba(2,5,8,0.66)'); shade.addColorStop(1, 'rgba(2,5,8,0)');
  c.fillStyle = shade; c.fillRect(0, 0, SIZE, 140);
  if (id === 'key') {
    coordinateGrid(c, 0.65);
    label(c, 'OBSERVATION → UNDERSTANDING', 25, 92, 13, INK);
    ellipse(c, 251, 273, 191, 88, -0.3, '#d6c8a8', 1.6);
    line(c, [[29, 339], [139, 281], [315, 189], [489, 99]], 'rgba(227,235,238,0.7)', 1.1);
  } else {
    label(c, id.toUpperCase(), 27, 42, 18);
    label(c, id === 'earth' ? 'BLUE MARBLE' : id === 'moon' ? 'LUNAR SURFACE' : 'PLANETARY STUDY', 27, 66, 11, '#b7c6d0');
    for (let i = 0; i < 11; i++) line(c, [[28 + i * 17, 476], [28 + i * 17, i % 5 ? 480 : 486]], '#b6cbd5', 1);
  }
}

/**
 * Construct every canvas synchronously, then replace photo studies only when
 * their existing local images have decoded. A failed/slow asset retains its
 * labeled diagram. No render-loop work or synthetic loading percentages.
 */
export function createMontageArtwork({ onUpdate = () => {} } = {}) {
  const tiles = new Map();
  const failedAssets = [];
  const pending = new Set();
  let disposed = false;
  for (const id of IDS) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = SIZE;
    fallback(canvas.getContext('2d'), id); tiles.set(id, canvas);
  }
  const sources = [
    ['assets/atlas-earth.png', ['earth', 'key']],
    ['assets/atlas-moon.png', ['moon']],
    ['assets/atlas-saturn.jpg', ['saturn']],
    ['assets/atlas-jupiter.jpg', ['jupiter']],
    ['assets/atlas-mars.jpg', ['mars']]
  ];
  const jobs = sources.map(([src, ids]) => new Promise(resolve => {
    const image = new Image();
    let settled = false;
    const finish = (failed, cancelled = false) => {
      if (settled) return;
      settled = true; clearTimeout(timer); pending.delete(cancel);
      image.onload = image.onerror = null;
      try {
        if (!cancelled && !disposed) {
          if (failed) failedAssets.push(src);
          else for (const id of ids) {
            const canvas = tiles.get(id);
            try {
              paintPhoto(canvas.getContext('2d'), image, id);
            } catch {
              if (!failedAssets.includes(src)) failedAssets.push(src);
              // Reset drawing state as well as pixels: a failed drawImage can
              // leave a saved filter/transform active midway through painting.
              try {
                canvas.width = SIZE;
                fallback(canvas.getContext('2d'), id);
              } catch { /* Readiness must also settle if the canvas is lost. */ }
            }
            // A renderer update is optional. Its failure must not strand the
            // real asset-readiness promise or suppress the other image tiles.
            try { onUpdate(id, canvas); } catch { /* Isolate subscriber errors. */ }
          }
        }
      } finally {
        resolve();
      }
    };
    const cancel = () => finish(false, true);
    const timer = setTimeout(() => finish(true), 15000);
    pending.add(cancel);
    image.onload = async () => {
      try { if (image.decode) await image.decode(); finish(false); }
      catch { finish(true); }
    };
    image.onerror = () => finish(true);
    image.src = new URL(src, import.meta.url).href;
  }));
  return {
    tiles,
    ready: Promise.all(jobs).then(() => ({ failedAssets: [...failedAssets] })),
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const cancel of [...pending]) cancel();
      pending.clear();
    }
  };
}
