const PHASES = ['discovery', 'assembly', 'convergence', 'awaiting', 'final-piece', 'seating', 'settling', 'identity', 'locked'];
const DURATION = { discovery: 1800, assembly: 3600, convergence: 2200, 'final-piece': 1050, seating: 180, settling: 650, identity: 1400 };
const clamp = value => Math.max(0, Math.min(1, value));
const ease = value => {
  const t = clamp(value);
  return t * t * t * (t * (6 * t - 15) + 10);
};

// Procedural previews may assemble while resources load. Only ready() releases
// the central piece; visible time never substitutes for that readiness signal.
export function createEntranceTimeline() {
  let elapsed = 0, phaseElapsed = 0, resourcesReady = false, state = 'discovery';

  function snapshot() {
    const index = PHASES.indexOf(state);
    const progress = (phase, curve = ease) => {
      const target = PHASES.indexOf(phase);
      if (index < target) return 0;
      if (index > target) return 1;
      return curve(clamp(phaseElapsed / DURATION[phase]));
    };
    return {
      state,
      elapsed,
      discovery: progress('discovery'),
      // Equal-time intervals gather progressively more of the montage.
      assembly: progress('assembly', t => t * t),
      convergence: progress('convergence'),
      finalPiece: progress('final-piece'),
      seat: progress('seating'),
      resonance: progress('settling', t => t),
      brand: progress('identity'),
      reveal: state === 'discovery' ? ease(phaseElapsed / 500) : 1,
    };
  }

  return {
    ready() { resourcesReady = true; },
    reset() {
      elapsed = 0;
      phaseElapsed = 0;
      state = 'discovery';
    },
    step(delta, reduced = false) {
      if (state === 'locked') return snapshot();
      let remaining = Number.isFinite(delta) ? Math.max(0, delta) : 0;
      if (reduced) {
        state = resourcesReady ? 'locked' : 'awaiting';
        phaseElapsed = 0;
        if (state === 'locked') return snapshot();
      }

      // Carry excess delta through exact boundaries. An unresolved gate
      // consumes visible waiting time; a final lock consumes no further time.
      while (state !== 'locked') {
        if (state === 'awaiting') {
          if (!resourcesReady) {
            elapsed += remaining;
            break;
          }
          state = 'final-piece';
        }
        const duration = DURATION[state];
        const consumed = Math.min(remaining, duration - phaseElapsed);
        phaseElapsed += consumed;
        elapsed += consumed;
        remaining -= consumed;
        if (phaseElapsed < duration) break;
        state = PHASES[PHASES.indexOf(state) + 1];
        phaseElapsed = 0;
      }
      return snapshot();
    },
  };
}
