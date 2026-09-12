const REVEAL_DURATION = 1800;
const PHASE_DURATION = { approaching: 3000, seating: 240, settling: 1100 };
const NEXT_PHASE = { approaching: 'seating', seating: 'settling', settling: 'locked' };
const clamp = value => Math.max(0, Math.min(1, value));
const ease = value => {
  const t = clamp(value);
  return t * t * t * (t * (6 * t - 15) + 10);
};

// Call ready() only after resources have settled. Time controls choreography,
// never readiness; elapsed counts visible animation time and freezes at lock.
export function createEntranceTimeline() {
  let elapsed = 0, phaseElapsed = 0, resourcesReady = false, state = 'waiting';

  function snapshot(reduced) {
    const resonance = state === 'locked' ? 1 : state === 'settling' ? phaseElapsed / PHASE_DURATION.settling : 0;
    return {
      state,
      elapsed,
      reveal: reduced || state === 'locked' ? 1 : ease(elapsed / REVEAL_DURATION),
      approach: state === 'waiting' ? 0 : state === 'approaching' ? ease(phaseElapsed / PHASE_DURATION.approaching) : 1,
      seat: state === 'waiting' || state === 'approaching' ? 0 : state === 'seating' ? ease(phaseElapsed / PHASE_DURATION.seating) : 1,
      resonance,
      brand: ease((resonance - .5) * 2),
    };
  }

  return {
    ready() { resourcesReady = true; },
    reset() {
      elapsed = 0;
      phaseElapsed = 0;
      state = 'waiting';
    },
    step(delta, reduced = false) {
      if (state === 'locked') return snapshot(reduced);
      if (resourcesReady && reduced) {
        state = 'locked';
        phaseElapsed = 0;
        return snapshot(true);
      }

      let remaining = Number.isFinite(delta) ? Math.max(0, delta) : 0;
      if (state === 'waiting') {
        const consumed = resourcesReady
          ? Math.min(remaining, Math.max(0, REVEAL_DURATION - elapsed))
          : remaining;
        elapsed += consumed;
        remaining -= consumed;
        if (!resourcesReady || elapsed < REVEAL_DURATION) return snapshot(reduced);
        state = 'approaching';
      }

      // Preserve excess delta at every boundary, including a zero-time step
      // after readiness arrives late. Discard time beyond the final lock.
      while (state !== 'locked') {
        const duration = PHASE_DURATION[state];
        const consumed = Math.min(remaining, duration - phaseElapsed);
        phaseElapsed += consumed;
        elapsed += consumed;
        remaining -= consumed;
        if (phaseElapsed < duration) break;
        state = NEXT_PHASE[state];
        phaseElapsed = 0;
        if (remaining === 0) break;
      }
      return snapshot(reduced);
    },
  };
}
