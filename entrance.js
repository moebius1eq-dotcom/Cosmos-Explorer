import { createEntranceTimeline } from './entrance-timing.js';
import { createMontageArtwork } from './entrance-artwork.js';
import { createMontageRenderer, createCanvasMontage } from './entrance-renderer.js';

const entrance = document.querySelector('.pisces-entrance');
const mount = entrance.querySelector('.entrance-scene');
const status = entrance.querySelector('.entrance-status');
const replay = entrance.querySelector('.entrance-replay');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const timeline = createEntranceTimeline();
const journeyTitle = document.title;
document.title = 'PISCES — Piece together the universe';
const background = [...document.querySelectorAll('.site-header, #scale-index, main')];
const priorInert = background.map(element => element.inert);
background.forEach(element => { element.inert = true; });

let frame = 0, previous = 0, dismissed = false, lastState = 'discovery';
let snapshot, presentation, readyResult, graphicsFallback = false;
const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
const artwork = createMontageArtwork({ onUpdate(id) { presentation?.update(id); requestFrame(); } });
const canvasFallback = () => createCanvasMontage({ mount, artwork, onInvalidate: requestFrame });
try {
  const THREE = await import('./vendor/three.module.js');
  presentation = createMontageRenderer({ THREE, mount, artwork, pointer, onInvalidate: requestFrame,
    onLost() {
      presentation.dispose(); graphicsFallback = true; presentation = canvasFallback();
      requestFrame();
    },
  });
} catch {
  graphicsFallback = true;
  presentation = canvasFallback();
}

function tick(now) {
  frame = 0;
  if (dismissed || document.hidden || !presentation) return;
  const delta = previous ? Math.min(now - previous, 50) : 0;
  previous = now;
  snapshot = timeline.step(delta, reduced.matches);
  pointer.x += (pointer.targetX - pointer.x) * .07;
  pointer.y += (pointer.targetY - pointer.y) * .07;
  presentation.draw(snapshot, reduced.matches);
  entrance.dataset.state = snapshot.state;
  if (snapshot.state === 'locked' && lastState !== 'locked') {
    entrance.setAttribute('aria-busy', 'false');
    status.textContent = readyResult?.fallback || graphicsFallback
      ? 'PISCES. Piece together the universe. Ready with simplified graphics.'
      : 'PISCES. Piece together the universe. Ready.';
    replay.hidden = false;
    replay.setAttribute('aria-disabled', 'false');
  }
  lastState = snapshot.state;
  // The finished identity remains here. There is no pass-through or automatic exit.
  if (!reduced.matches && snapshot.state !== 'locked' && snapshot.state !== 'awaiting') requestFrame();
}
function requestFrame() {
  if (!frame && !dismissed && !document.hidden) frame = requestAnimationFrame(tick);
}

function dismissForJourney() {
  if (dismissed) return;
  dismissed = true;
  cancelAnimationFrame(frame);
  presentation.dispose(); artwork.dispose();
  entrance.hidden = true;
  document.title = journeyTitle;
  background.forEach((element, index) => { element.inert = priorInert[index]; });
  document.body.classList.remove('is-loading');
  document.body.classList.add('is-ready');
  window.dispatchEvent(new Event('cosmos:entrance-dismissed'));
  window.restoreJourneyLocation?.('auto');
}
const journeyHash = () => /^#(departure|earth-system|inner-solar-system|solar-system|stellar-neighborhood|milky-way|local-group|cosmic-web|observable-universe|flight=)/.test(location.hash);
replay.addEventListener('click', () => {
  if (replay.getAttribute('aria-disabled') === 'true') return;
  timeline.reset(); lastState = 'discovery'; previous = 0;
  entrance.dataset.state = 'discovery'; entrance.setAttribute('aria-busy', 'true');
  replay.setAttribute('aria-disabled', 'true');
  status.textContent = 'Replaying the PISCES entrance.';
  requestFrame();
});
entrance.addEventListener('pointermove', event => {
  if (reduced.matches || event.pointerType === 'touch' || lastState === 'locked') return;
  pointer.targetX = event.clientX / Math.max(1, innerWidth) * 2 - 1;
  pointer.targetY = 1 - event.clientY / Math.max(1, innerHeight) * 2;
  requestFrame();
}, { passive: true });
document.addEventListener('visibilitychange', () => {
  cancelAnimationFrame(frame); frame = 0; previous = 0;
  if (!document.hidden) requestFrame();
});
window.addEventListener('resize', () => {
  if (dismissed) return;
  presentation.resize();
  if (snapshot) presentation.draw(snapshot, reduced.matches);
});
reduced.addEventListener('change', () => { previous = 0; requestFrame(); });
window.addEventListener('hashchange', () => { if (readyResult && journeyHash()) dismissForJourney(); });
requestFrame();
Promise.all([window.cosmosAssetsReady, artwork.ready]).then(([journey, images]) => {
  readyResult = { fallback: journey.fallback || images.failedAssets.length > 0,
    failedAssets: [...journey.failedAssets, ...images.failedAssets] };
  timeline.ready();
  previous = 0;
  if (journeyHash()) dismissForJourney();
  else requestFrame();
});
