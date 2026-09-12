// Five unique faces partition one irregular structure. Shared coordinates define
// its fractures; there is no tile grid, repeated cut, or jigsaw connector.
const A = [-.92, -.96], B = [.88, -.72], C = [1.04, .75];
const D = [-.50, 1.04], E = [-1.12, .20];
export const perimeter = [[-3.65, -1.75], [2.70, -1.60], [3.55, -.35],
  [3.12, 1.68], [-2.50, 1.82], [-3.85, .40]];
const [P, Q, R, S, T, U] = perimeter;

export const fragments = [
  { id: 'lower', points: [P, Q, B, A], offset: [.12, -.28, -.95], rotation: [-.14, -.05, .025] },
  { id: 'right', points: [Q, R, S, C, B], offset: [.38, -.05, -.45], rotation: [-.035, .10, -.055] },
  { id: 'upper', points: [S, T, D, C], offset: [-.10, .30, -1.25], rotation: [.12, .06, -.045] },
  { id: 'left', points: [T, U, P, A, E, D], offset: [-.30, .04, -.60], rotation: [.05, -.12, .02] },
  { id: 'keystone', points: [A, B, C, D, E], offset: [2.45, .85, 2.25], rotation: [.35, -.48, -.45] },
];

export function centroid(points) {
  return points.reduce((sum, [x, y]) => [sum[0] + x / points.length, sum[1] + y / points.length], [0, 0]);
}

export function area(points) {
  return Math.abs(points.reduce((sum, [x, y], i) => {
    const next = points[(i + 1) % points.length];
    return sum + x * next[1] - next[0] * y;
  }, 0)) / 2;
}

export function smooth(value) {
  const t = Math.max(0, Math.min(1, value));
  return t * t * t * (t * (6 * t - 15) + 10);
}

export function fragmentPose(fragment, snapshot, reduced = false) {
  const center = centroid(fragment.points);
  const final = fragment.id === 'keystone';
  const alignment = final ? snapshot.approach : smooth((snapshot.approach - .32) / .68);
  const remaining = 1 - alignment;
  const time = reduced ? 0 : snapshot.elapsed * .00012;
  const drift = snapshot.state === 'waiting' ? 1 : remaining;
  const distance = Math.hypot(...center);
  const wave = Math.exp(-Math.pow((snapshot.resonance * 6 - distance) / .8, 2))
    * Math.sin(Math.PI * snapshot.resonance);
  return {
    position: [center[0] + fragment.offset[0] * remaining + Math.sin(time + distance) * .022 * drift,
      center[1] + fragment.offset[1] * remaining + Math.sin(time * .7 + distance) * .016 * drift,
      fragment.offset[2] * remaining + (final ? .085 * alignment * (1 - snapshot.seat) : 0) - wave * .012],
    rotation: fragment.rotation.map((angle, axis) => angle * remaining
      + (reduced ? 0 : Math.sin(time * .7 + distance + axis) * .012 * drift)),
    wave,
  };
}
