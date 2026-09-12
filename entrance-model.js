// Shared edges make the center piece fit its four neighbors exactly.
export const PIECE_SIZE = 1.58;
const clamp = value => Math.max(0, Math.min(1, value));
export const ease = value => { const t = clamp(value); return t * t * t * (t * (6 * t - 15) + 10); };
const noise = (x, y, salt) => { const n = Math.sin(x * 127.1 + y * 311.7 + salt * 73.3) * 43758.5453; return n - Math.floor(n); };

function corner(x, y) {
  return [(x - .5 + (noise(x, y, 1) - .5) * .13) * PIECE_SIZE,
    (y - .5 + (noise(x, y, 2) - .5) * .13) * PIECE_SIZE];
}

export function edgePoints(x, y, vertical = false) {
  const a = corner(x, y), b = corner(x + !vertical, y + vertical);
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const sign = noise(x, y, vertical ? 3 : 4) > .5 ? 1 : -1;
  const depth = .68 + noise(x, y, 5) * .23;
  const skew = (noise(x, y, 6) - .5) * .09;
  const segments = [
    [[0, 0], [.12, 0], [.25, 0], [.36 + skew, 0]],
    [[.36 + skew, 0], [.43 + skew, 0], [.31 + skew, .10], [.36 + skew, .16]],
    [[.36 + skew, .16], [.41 + skew, .24], [.59 + skew, .23], [.64 + skew, .15]],
    [[.64 + skew, .15], [.69 + skew, .09], [.57 + skew, 0], [.64 + skew, 0]],
    [[.64 + skew, 0], [.77, 0], [.88, 0], [1, 0]],
  ];
  const result = [];
  segments.forEach((points, segment) => {
    for (let i = segment ? 1 : 0; i <= 12; i++) {
      const t = i / 12, u = 1 - t;
      const weights = [u ** 3, 3 * u * u * t, 3 * u * t * t, t ** 3];
      const along = points.reduce((sum, p, j) => sum + p[0] * weights[j], 0);
      const normal = points.reduce((sum, p, j) => sum + p[1] * weights[j], 0) * sign * depth;
      result.push([a[0] + dx * along - dy * normal, a[1] + dy * along + dx * normal]);
    }
  });
  return result;
}

export function pieceOutline(column, row) {
  const sides = [edgePoints(column, row), edgePoints(column + 1, row, true),
    edgePoints(column, row + 1).reverse(), edgePoints(column, row, true).reverse()];
  return sides.flatMap((side, index) => index ? side.slice(1) : side)
    .map(([x, y]) => [x - column * PIECE_SIZE, y - row * PIECE_SIZE]);
}

// Time here is visible animation time, not a substitute for asset readiness.
export function createEntranceTimeline() {
  let elapsed = 0, phaseElapsed = 0, ready = false, state = 'waiting';
  return {
    ready() { ready = true; },
    reset() { elapsed = 0; phaseElapsed = 0; state = 'waiting'; },
    step(delta, reduced = false) {
      elapsed += Math.max(0, delta);
      if (ready && reduced) state = 'locked';
      if (state === 'waiting' && ready && elapsed >= 1600) { state = 'approaching'; phaseElapsed = 0; }
      if (state === 'approaching') {
        phaseElapsed += Math.max(0, delta);
        if (phaseElapsed >= 2400) { state = 'seating'; phaseElapsed = 0; }
      } else if (state === 'seating') {
        phaseElapsed += Math.max(0, delta);
        if (phaseElapsed >= 210) { state = 'locked'; phaseElapsed = 0; }
      }
      return { state, elapsed, reveal: reduced ? 1 : ease(elapsed / 1600),
        approach: state === 'waiting' ? 0 : state === 'approaching' ? ease(phaseElapsed / 2400) : 1,
        seat: state === 'locked' ? 1 : state === 'seating' ? ease(phaseElapsed / 210) : 0 };
    },
  };
}
