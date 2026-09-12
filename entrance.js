import { fragments, centroid, fragmentPose, smooth } from './entrance-model.js';
import { createEntranceTimeline } from './entrance-timing.js';

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

let frame = 0, previous = 0, dismissed = false, lastState = 'waiting';
let snapshot, presentation, THREE, readyResult;
const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };

function makeWebGLPresentation() {
  const renderer = new THREE.WebGLRenderer({ alpha: false, antialias: true, powerPreference: 'low-power' });
  renderer.setClearColor(0x020303);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .85;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  mount.append(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, .1, 80);
  const assembly = new THREE.Group();
  assembly.rotation.set(-.18, -.22, .035);
  scene.add(assembly);
  const ambient = new THREE.AmbientLight(0x8e9b9e, .18);
  scene.add(ambient);
  const key = new THREE.DirectionalLight(0xe4ece8, 2.4);
  key.position.set(-3, 5, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xa0b5bc, 1.15);
  rim.position.set(5, 1, -1);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0xc9bbae, .28);
  fill.position.set(-2, -3, 3);
  scene.add(fill);
  const resources = [];
  const pieces = fragments.map(fragment => {
    const center = centroid(fragment.points);
    const shape = new THREE.Shape(fragment.points.map(([x, y]) =>
      new THREE.Vector2((x - center[0]) * .994, (y - center[1]) * .994)));
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: .22, steps: 1, bevelEnabled: true, bevelThickness: .014,
      bevelSize: .012, bevelSegments: 2, curveSegments: 1,
    });
    const face = new THREE.MeshStandardMaterial({ color: 0x303b3d, roughness: .72, metalness: .22 });
    const side = new THREE.MeshStandardMaterial({ color: 0x131b1e, roughness: .85, metalness: .18 });
    const mesh = new THREE.Mesh(geometry, [face, side]);
    const edges = new THREE.EdgesGeometry(geometry, 32);
    const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x9faeab, transparent: true, opacity: .035, depthWrite: false });
    mesh.add(new THREE.LineSegments(edges, edgeMaterial));
    assembly.add(mesh);
    resources.push(geometry, face, side, edges, edgeMaterial);
    return { fragment, mesh, face, side, edgeMaterial };
  });

  // Lettering occupies the assembled object's front plane and shares its perspective.
  const lettering = document.createElement('canvas');
  lettering.width = 2048;
  lettering.height = 384;
  const ink = lettering.getContext('2d');
  const letteringMap = new THREE.CanvasTexture(lettering);
  letteringMap.colorSpace = THREE.SRGBColorSpace;
  const titleGeometry = new THREE.PlaneGeometry(6.8, 1.275);
  const titleMaterial = new THREE.MeshBasicMaterial({ map: letteringMap, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
  const title = new THREE.Mesh(titleGeometry, titleMaterial);
  title.position.set(0, .03, .244);
  assembly.add(title);
  resources.push(letteringMap, titleGeometry, titleMaterial);
  let alive = true;
  let cameraDistance = 14;
  function paintWordmark() {
    if (!alive) return;
    ink.clearRect(0, 0, lettering.width, lettering.height);
    ink.font = '300 240px Inter, Arial, sans-serif';
    ink.textBaseline = 'middle';
    ink.fillStyle = '#d5dcd7';
    const letters = [...'PISCES'], tracking = 80;
    const widths = letters.map(letter => ink.measureText(letter).width);
    let x = (lettering.width - widths.reduce((sum, value) => sum + value, 0) - tracking * 5) / 2;
    letters.forEach((letter, i) => { ink.fillText(letter, x, 195); x += widths[i] + tracking; });
    letteringMap.needsUpdate = true;
    if (snapshot && !document.hidden) draw(snapshot);
  }
  paintWordmark();
  document.fonts.ready.then(paintWordmark);
  function resize() {
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.setSize(Math.max(1, innerWidth), Math.max(1, innerHeight));
    camera.aspect = innerWidth / Math.max(1, innerHeight);
    cameraDistance = Math.max(12.8, 10 / (2 * Math.tan(17 * Math.PI / 180) * camera.aspect));
    camera.updateProjectionMatrix();
  }
  function draw(state) {
    const parallax = reduced.matches ? 0 : 1;
    camera.position.set(pointer.x * .32 * parallax, .15 + pointer.y * .20 * parallax, cameraDistance);
    camera.lookAt(0, .12, 0);
    // Raking light reveals thickness. One quiet pulse crosses the seams at alignment.
    ambient.intensity = .18 * state.reveal;
    key.intensity = (2.4 + Math.sin(state.resonance * Math.PI) * .16) * state.reveal;
    rim.intensity = 1.15 * state.reveal;
    fill.intensity = .28 * state.reveal;
    pieces.forEach(({ fragment, mesh, face, side, edgeMaterial }) => {
      const pose = fragmentPose(fragment, state, reduced.matches);
      mesh.position.set(...pose.position);
      mesh.rotation.set(...pose.rotation);
      mesh.visible = state.reveal > 0;
      edgeMaterial.opacity = ((fragment.id === 'keystone' ? .065 : .025) + pose.wave * .13) * state.reveal;
      const quiet = 1 - state.brand * .35;
      face.color.setRGB(.029 * quiet, .036 * quiet, .037 * quiet);
      side.color.setRGB(.006 * quiet, .009 * quiet, .010 * quiet);
    });
    titleMaterial.opacity = smooth(state.brand) * .82;
    title.visible = state.brand > 0;
    renderer.render(scene, camera);
  }
  resize();
  const onLost = event => {
    event.preventDefault();
    presentation.dispose();
    presentation = makeStaticPresentation();
    if (snapshot) presentation.draw(snapshot);
    requestFrame();
  };
  renderer.domElement.addEventListener('webglcontextlost', onLost);
  return {
    resize, draw,
    dispose() {
      alive = false;
      renderer.domElement.removeEventListener('webglcontextlost', onLost);
      resources.forEach(resource => resource.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

function makeStaticPresentation() {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '-5 -3.8 10 7.6');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  const pieces = fragments.map(fragment => {
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', fragment.points.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${-y}`).join(' ') + ' Z');
    path.setAttribute('fill', fragment.id === 'keystone' ? '#182123' : '#101718');
    path.setAttribute('stroke', '#64706d');
    path.setAttribute('stroke-opacity', '.22');
    path.setAttribute('stroke-width', '.012');
    svg.append(path);
    return { path, fragment };
  });
  const title = document.createElementNS(ns, 'text');
  title.textContent = 'PISCES';
  title.setAttribute('x', '0'); title.setAttribute('y', '.18');
  title.setAttribute('text-anchor', 'middle'); title.setAttribute('fill', '#bac5bf');
  title.setAttribute('font-size', '.50'); title.setAttribute('font-weight', '300');
  title.setAttribute('letter-spacing', '.16');
  svg.append(title);
  mount.replaceChildren(svg);
  return {
    resize() {},
    draw(state) {
      svg.style.opacity = state.reveal;
      const complete = state.state === 'locked';
      pieces.forEach(({ path, fragment }) => {
        path.setAttribute('transform', complete ? '' : `translate(${fragment.offset[0]},${-fragment.offset[1]})`);
      });
      title.setAttribute('opacity', complete ? '1' : '0');
    },
    dispose() { svg.remove(); },
  };
}

try {
  THREE = await import('./vendor/three.module.js');
  presentation = makeWebGLPresentation();
} catch { presentation = makeStaticPresentation(); }

function tick(now) {
  frame = 0;
  if (dismissed || document.hidden) return;
  const delta = previous ? Math.min(now - previous, 50) : 0;
  previous = now;
  snapshot = timeline.step(delta, reduced.matches);
  pointer.x += (pointer.targetX - pointer.x) * .07;
  pointer.y += (pointer.targetY - pointer.y) * .07;
  presentation.draw(snapshot);
  entrance.dataset.state = snapshot.state;
  if (snapshot.state === 'locked' && lastState !== 'locked') {
    entrance.setAttribute('aria-busy', 'false');
    status.textContent = readyResult?.fallback
      ? 'PISCES is ready with simplified graphics. The structure is complete.'
      : 'PISCES is ready. The structure is complete.';
    replay.hidden = false;
    replay.setAttribute('aria-disabled', 'false');
  }
  lastState = snapshot.state;
  const pointerMoving = Math.abs(pointer.x - pointer.targetX) + Math.abs(pointer.y - pointer.targetY) > .001;
  if (!reduced.matches && (snapshot.state !== 'locked' || pointerMoving)) requestFrame();
}

function requestFrame() {
  if (!frame && !dismissed && !document.hidden) frame = requestAnimationFrame(tick);
}

function dismissForJourney() {
  if (dismissed) return;
  dismissed = true;
  cancelAnimationFrame(frame);
  presentation.dispose();
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
  timeline.reset();
  lastState = 'waiting'; previous = 0;
  entrance.dataset.state = 'waiting';
  entrance.setAttribute('aria-busy', 'true');
  replay.setAttribute('aria-disabled', 'true');
  status.textContent = 'Replaying the PISCES entrance.';
  requestFrame();
});
entrance.addEventListener('pointermove', event => {
  if (reduced.matches || event.pointerType === 'touch') return;
  pointer.targetX = event.clientX / Math.max(1, innerWidth) * 2 - 1;
  pointer.targetY = 1 - event.clientY / Math.max(1, innerHeight) * 2;
  requestFrame();
}, { passive: true });
entrance.addEventListener('pointerleave', () => { pointer.targetX = pointer.targetY = 0; requestFrame(); });
document.addEventListener('visibilitychange', () => {
  cancelAnimationFrame(frame); frame = 0; previous = 0;
  if (!document.hidden && lastState !== 'locked') requestFrame();
});
window.addEventListener('resize', () => {
  if (dismissed) return;
  presentation.resize();
  if (snapshot) presentation.draw(snapshot);
});
reduced.addEventListener('change', () => { previous = 0; requestFrame(); });
window.addEventListener('hashchange', () => { if (readyResult && journeyHash()) dismissForJourney(); });
requestFrame();
window.cosmosAssetsReady.then(result => {
  readyResult = result;
  timeline.ready();
  if (journeyHash()) dismissForJourney();
  else requestFrame();
});
