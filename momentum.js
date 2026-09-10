// Wheel impulses advance a target; elapsed-time damping keeps the camera moving
// between notches. Touch, keyboard, links and reduced motion retain native scrolling.
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let target = scrollY, frame = 0, previous = 0;
  function stop() { cancelAnimationFrame(frame); frame = 0; target = scrollY; }
  function advance(now) {
    const dt = Math.min(now - previous, 50);
    previous = now;
    target = Math.max(0, Math.min(target, document.documentElement.scrollHeight - innerHeight));
    const next = scrollY + (target - scrollY) * (1 - Math.exp(-dt / 300));
    window.scrollTo({ top: Math.abs(target - next) < 1 ? target : next, behavior: 'instant' });
    if (Math.abs(target - scrollY) > 1) frame = requestAnimationFrame(advance);
    else frame = 0;
  }
  window.addEventListener('wheel', event => {
    if (reduced.matches || event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY) ||
        document.body.matches('.is-loading, .index-open, .navigation-open') || event.target.closest('dialog, input, textarea, select')) return;
    event.preventDefault();
    if (!frame) target = scrollY;
    const delta = event.deltaY * (event.deltaMode === 1 ? 24 : event.deltaMode === 2 ? innerHeight : 1);
    // Reversing the wheel immediately cancels the previous direction's momentum.
    if (Math.sign(delta) !== Math.sign(target - scrollY)) target = scrollY;
    target = Math.max(0, Math.min(target + delta * 2.0, document.documentElement.scrollHeight - innerHeight));
    if (!frame) { previous = performance.now(); frame = requestAnimationFrame(advance); }
  }, { passive: false });
  ['pointerdown', 'touchstart', 'keydown', 'popstate', 'resize'].forEach(type => window.addEventListener(type, stop, { passive: true }));
  document.addEventListener('visibilitychange', stop);
  reduced.addEventListener('change', stop);
})();
