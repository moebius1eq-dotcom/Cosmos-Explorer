import { PIECE_SIZE, pieceOutline, createEntranceTimeline } from './entrance-model.js';

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
let heldPose = null, presentation, THREE;
let readyResult;
const detachedPosition = [3.0, 1.75, 1.55];
const detachedRotation = [.31, -.56, -.24];
const floatPosition = [...detachedPosition];
const floatRotation = [...detachedRotation];
let approachOrigin = null;

// Eight local pieces define the opening. Five more sit farther from its plane.
const layout = [
  [-1, 0, 0, .22], [1, 0, 0, .22], [0, -1, 0, .22], [0, 1, 0, .22],
  [-1, -1, -.25, .085], [1, -1, -.42, .08], [-1, 1, -.35, .085], [1, 1, -.55, .07],
  [-2.5, .9, -2.7, .065], [2.3, -1.5, -2.2, .065], [-2, -2, -1.6, .055],
  [1.6, 2.4, -3.2, .05], [3, .5, -4.2, .045],
];

function makeWebGLPresentation() {
  const renderer = new THREE.WebGLRenderer({ alpha: false, antialias: true, powerPreference: 'low-power' });
  renderer.setClearColor(0x020303);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  mount.append(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, .1, 60);
  const assembly = new THREE.Group();
  assembly.rotation.set(-.12, .16, -.045);
  scene.add(assembly);
  const resources = [];
  const makeLine = (points, opacity) => {
    const geometry = new THREE.BufferGeometry().setFromPoints(points.map(([x, y]) => new THREE.Vector3(x, y, .045)));
    const material = new THREE.LineBasicMaterial({ color: 0xbfc9c5, transparent: true, opacity, depthWrite: false });
    resources.push(geometry, material);
    return new THREE.LineLoop(geometry, material);
  };
  const neighbors = layout.map(([x, y, z, opacity], index) => {
    const piece = makeLine(pieceOutline(Math.round(x), Math.round(y)), opacity);
    piece.position.set(x * PIECE_SIZE, y * PIECE_SIZE, z);
    if (index >= 8) piece.rotation.set(.13 * Math.sin(index), .18 * Math.cos(index), (index - 10) * .1);
    assembly.add(piece);
    return { piece, opacity, z, index };
  });
  const finalPiece = new THREE.Group();
  const outline = makeLine(pieceOutline(0, 0), .48);
  finalPiece.add(outline);
  const shape = new THREE.Shape(pieceOutline(0, 0).map(([x, y]) => new THREE.Vector2(x, y)));
  const surface = new THREE.ExtrudeGeometry(shape, { depth: .04, bevelEnabled: false, steps: 1 });
  const material = new THREE.MeshBasicMaterial({ color: 0x050707 });
  resources.push(surface, material);
  finalPiece.add(new THREE.Mesh(surface, material));
  const back = makeLine(pieceOutline(0, 0), .10);
  back.position.z = -.044;
  finalPiece.add(back);
  assembly.add(finalPiece);

  function resize() {
    const width = Math.max(1, innerWidth), height = Math.max(1, innerHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.setSize(width, height);
    camera.aspect = width / height;
    // Fit the same composition by its horizontal span on phones; never crop the loose piece.
    camera.position.set(0, .35, Math.max(14, 12.2 / (2 * Math.tan(Math.PI / 10) * camera.aspect)));
    camera.lookAt(0, .35, 0);
    camera.updateProjectionMatrix();
  }
  resize();
  const onLost = event => {
    event.preventDefault();
    presentation.dispose();
    presentation = makeStaticPresentation();
    if (heldPose) presentation.draw(heldPose);
    requestFrame();
  };
  renderer.domElement.addEventListener('webglcontextlost', onLost);
  return {
    resize,
    draw(pose) {
      const { snapshot, position, rotation } = pose;
      neighbors.forEach(({ piece, opacity, z, index }) => {
        piece.material.opacity = opacity * snapshot.reveal;
        // The four slot edges remain rigidly aligned. Only distant pieces drift.
        if (index >= 8) piece.position.z = z + (reduced.matches ? 0 : Math.sin(snapshot.elapsed * .00012 + index) * .025);
      });
      finalPiece.position.set(...position);
      finalPiece.rotation.set(...rotation);
      outline.material.opacity = (.46 - snapshot.seat * .13) * snapshot.reveal;
      back.material.opacity = .09 * snapshot.reveal;
      finalPiece.visible = snapshot.reveal > 0;
      renderer.render(scene, camera);
    },
    dispose() {
      renderer.domElement.removeEventListener('webglcontextlost', onLost);
      resources.forEach(resource => resource.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

// An SVG drawing preserves the actual matching shapes when graphics are unavailable.
// It deliberately uses a static pose instead of simulating an unsupported 3D flight.
function makeStaticPresentation() {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '-6 -4.8 12 9.6');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  const group = document.createElementNS(ns, 'g');
  group.setAttribute('fill', 'none');
  group.setAttribute('stroke', '#bfc9c5');
  group.setAttribute('stroke-width', '.009');
  const add = (column, row, opacity) => {
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', pieceOutline(column, row).map(([x, y], i) => `${i ? 'L' : 'M'}${x},${-y}`).join(' ') + ' Z');
    path.setAttribute('opacity', String(opacity));
    group.append(path);
    return path;
  };
  layout.forEach(([x, y, , opacity]) => {
    add(Math.round(x), Math.round(y), opacity).setAttribute('transform', `translate(${x * PIECE_SIZE},${-y * PIECE_SIZE})`);
  });
  const piece = add(0, 0, .4);
  svg.append(group);
  mount.replaceChildren(svg);
  return {
    resize() {},
    draw({ snapshot }) {
      group.setAttribute('opacity', String(snapshot.reveal));
      piece.setAttribute('transform', snapshot.state === 'locked' ? '' : 'translate(3,-1.75) rotate(16)');
    },
    dispose() { svg.remove(); },
  };
}

try {
  THREE = await import('./vendor/three.module.js');
  presentation = makeWebGLPresentation();
}
catch { presentation = makeStaticPresentation(); }

function poseFor(snapshot) {
  if (snapshot.state === 'waiting') {
    const time = reduced.matches ? 0 : snapshot.elapsed * .0001;
    floatPosition[0] = detachedPosition[0] + Math.sin(time) * .018;
    floatPosition[1] = detachedPosition[1] + Math.sin(time * .8) * .024;
    floatPosition[2] = detachedPosition[2];
    floatRotation[0] = detachedRotation[0] + Math.sin(time * .7) * .016;
    floatRotation[1] = detachedRotation[1] + Math.sin(time * .9) * .024;
    floatRotation[2] = detachedRotation[2] + Math.sin(time) * .012;
    if (!approachOrigin) approachOrigin = { position: [...floatPosition], rotation: [...floatRotation] };
    else for (let axis = 0; axis < 3; axis++) {
      approachOrigin.position[axis] = floatPosition[axis];
      approachOrigin.rotation[axis] = floatRotation[axis];
    }
  } else {
    const origin = approachOrigin || { position: detachedPosition, rotation: detachedRotation };
    for (let axis = 0; axis < 3; axis++) {
      const dock = axis === 2 ? .095 : 0;
      floatPosition[axis] = origin.position[axis] * (1 - snapshot.approach) + dock * snapshot.approach;
      floatRotation[axis] = origin.rotation[axis] * (1 - snapshot.approach);
    }
    floatPosition[2] -= .095 * snapshot.seat;
  }
  return { snapshot, position: floatPosition, rotation: floatRotation };
}

function draw(now) {
  frame = 0;
  if (dismissed || document.hidden) return;
  const delta = previous ? Math.min(now - previous, 50) : 0;
  previous = now;
  const snapshot = timeline.step(delta, reduced.matches);
  heldPose = poseFor(snapshot);
  presentation.draw(heldPose);
  entrance.dataset.state = snapshot.state;
  if (snapshot.state === 'locked' && lastState !== 'locked') {
    entrance.setAttribute('aria-busy', 'false');
    status.textContent = readyResult?.fallback
      ? 'PISCES is ready with simplified graphics. The final piece is in place.'
      : 'PISCES is ready. The final piece is in place.';
    replay.hidden = false;
  }
  lastState = snapshot.state;
  // The review milestone holds here. No camera push, automatic exit, or hidden idle loop.
  if (snapshot.state !== 'locked' && !reduced.matches) requestFrame();
}

function requestFrame() {
  if (!frame && !dismissed && !document.hidden) frame = requestAnimationFrame(draw);
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
  timeline.reset();
  lastState = 'waiting';
  approachOrigin = null;
  previous = 0;
  entrance.dataset.state = 'waiting';
  status.textContent = 'Replaying the PISCES entrance.';
  requestFrame();
});
document.addEventListener('visibilitychange', () => {
  cancelAnimationFrame(frame);
  frame = 0;
  previous = 0;
  if (!document.hidden && lastState !== 'locked') requestFrame();
});
window.addEventListener('resize', () => {
  if (dismissed) return;
  presentation.resize();
  if (heldPose) presentation.draw(heldPose);
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
