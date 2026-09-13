// An irregular editorial mosaic, assembled from astronomy imagery and diagrams.
// Its shared corners keep the final typography continuous across every fragment.
const columns = [-4.5, -2.65, -.90, .92, 2.75, 4.5];
const rows = [-2.15, -.68, .78, 2.15];
const ids = ['spectrum', 'mars', 'orbit', 'jupiter', 'geometry',
  'earth', 'coordinates', 'key', 'saturn', 'sphere',
  'parallax', 'solar', 'stars', 'moon', 'galaxy'];
const stations = [
  [-3.5, -1.55, .3], [-2.2, -2.65, 1.4], [-.6, -1.9, 0], [3, -2.1, -.7], [4.4, 2.5, -1],
  [-2.3, .75, 2], [-.5, 1.6, .7], [-3.2, 2.4, 5], [.2, -.2, 2.7], [3.6, -.4, 1.3],
  [-4.1, 2.2, -2], [-.9, 3.2, -2.8], [1, 2.6, -1.5], [2.2, 1.4, -.6], [4.4, 1.2, -2.1],
];
const order = ['earth', 'coordinates', 'moon', 'orbit', 'saturn', 'spectrum',
  'sphere', 'jupiter', 'parallax', 'stars', 'mars', 'geometry', 'solar', 'galaxy'];
const pairings = { earth: [-1.85, .8, 1.8, .12, .42], coordinates: [0, .8, 1.8, .12, .42],
  moon: [2.0, .6, .5, .32, .62], orbit: [2.0, -.85, .5, .32, .62] };

export const compositionBounds = { left: -4.65, right: 4.65, bottom: -2.30, top: 2.30 };
export const clamp = value => Math.max(0, Math.min(1, value));
export function smooth(value) { const t = clamp(value); return t * t * (3 - 2 * t); }
const mix = (a, b, t) => a + (b - a) * t;
const corner = (x, y) => [columns[x] + (x && x < 5 ? Math.sin(x * 2 + y * 4) * .11 : 0),
  rows[y] + (y && y < 3 ? Math.sin(x * 3 + y) * .10 : 0)];
export const fragments = ids.map((id, index) => {
  const x = index % 5, y = Math.floor(index / 5);
  const points = [corner(x, y), corner(x + 1, y), corner(x + 1, y + 1), corner(x, y + 1)];
  const center = points.reduce((sum, p) => [sum[0] + p[0] / 4, sum[1] + p[1] / 4], [0, 0]);
  return { id, index, points, center, station: stations[index], order: order.indexOf(id) };
});

export function fragmentPose(fragment, state, reduced = false) {
  const { id, index, center, station, order } = fragment;
  const final = id === 'key';
  const settled = state.state === 'locked';
  const wave = Math.sin(Math.PI * state.resonance) * Math.exp(-Math.pow((state.resonance * 6 - Math.hypot(...center)) / .8, 2));
  if (final) {
    const t = smooth(state.finalPiece);
    return {
      position: [mix(station[0], center[0], t), mix(station[1], center[1], t) + Math.sin(Math.PI * t) * .32,
        station[2] * (1 - t) + .075 * t * (1 - state.seat) - wave * .015],
      rotation: [.28 * (1 - t), -.65 * (1 - t), -.12 * (1 - t)],
      opacity: state.finalPiece > 0 || state.seat > 0 || settled ? 1 : 0,
      scale: 1 + .16 * (1 - t), wave,
    };
  }
  if (reduced) return { position: [...center, 0], rotation: [0, 0, 0], opacity: 1, scale: 1, wave: 0 };
  const first = order < 2;
  const revealAt = first ? 0 : .025 + (order - 2) * .042;
  const age = clamp((state.assembly - revealAt) / (1 - revealAt));
  const entry = smooth(age / .42);
  const origin = first ? (order === 0 ? [-1.2, .4, 1.5] : [1.15, -.4, .3])
    : [(index % 2 ? -1 : 1) * (6.8 + index * .13), ((index % 4) - 1.5) * 2.2, index % 3 === 0 ? 5.2 : -5.5];
  const convergence = smooth(clamp((state.convergence - order * .008) / .88));
  const travelling = 1 - convergence;
  const motion = Math.sin(age * Math.PI) * .15;
  const pairing = pairings[id];
  const pairCue = pairing ? Math.sin(Math.PI * clamp((state.assembly - pairing[3]) / (pairing[4] - pairing[3]))) ** 2 * (first ? 1 : entry) : 0;
  const position = station.map((value, axis) => {
    const assembled = axis < 2 ? center[axis] : 0;
    let crossing = mix(origin[axis], value, entry) + (axis === 0 ? motion * (index % 2 ? 1 : -1) : 0);
    if (pairing) crossing = mix(crossing, pairing[axis], pairCue);
    return mix(crossing, assembled, convergence);
  });
  position[2] -= wave * .015;
  const flip = first ? 0 : (1 - entry) * (index % 3 === 0 ? Math.PI * 1.05 : -.9);
  return {
    position,
    rotation: [((1 - entry) * .28 + Math.sin(index) * .10 * entry) * travelling * (1 - pairCue),
      (flip + Math.cos(index) * .13 * entry) * travelling * (1 - pairCue),
      ((1 - entry) * (index % 2 ? .25 : -.20) + Math.sin(index * 2) * .08 * entry) * travelling * (1 - pairCue)],
    opacity: first ? smooth((state.discovery - order * .40) / .32) : smooth(age / .09),
    scale: mix(1 + Math.sin(age * Math.PI) * (id === 'saturn' ? .42 : .12), 1, convergence),
    wave,
  };
}
