import { fragments, compositionBounds as bounds, fragmentPose, smooth } from './entrance-model.js';

const width = bounds.right - bounds.left, height = bounds.top - bounds.bottom;
const connections = [['earth', 'coordinates'], ['moon', 'orbit'], ['saturn', 'sphere'],
  ['spectrum', 'stars'], ['geometry', 'parallax']];

function identityCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = 2048; canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  function text(value, size, spacing, y, color) {
    ctx.font = `300 ${size}px Inter, Arial, sans-serif`;
    ctx.fillStyle = color;
    ctx.textBaseline = 'middle';
    const letters = [...value], sizes = letters.map(letter => ctx.measureText(letter).width);
    let x = (canvas.width - sizes.reduce((a, b) => a + b, 0) - spacing * (letters.length - 1)) / 2;
    letters.forEach((letter, i) => { ctx.fillText(letter, x, y); x += sizes[i] + spacing; });
  }
  const paint = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    text('PISCES', 300, 57, 435, '#eef0e9');
    text('PIECE TOGETHER THE UNIVERSE', 54, 8, 654, '#b4c2c8');
  };
  paint();
  return { canvas, paint };
}

export function createMontageRenderer({ THREE, mount, artwork, pointer, onLost, onInvalidate }) {
  const renderer = new THREE.WebGLRenderer({ alpha: false, antialias: true, powerPreference: 'low-power' });
  renderer.setClearColor(0x020405);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  mount.append(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, .1, 70);
  const group = new THREE.Group(); scene.add(group);
  const identity = identityCanvas();
  const identityMap = new THREE.CanvasTexture(identity.canvas);
  identityMap.colorSpace = THREE.SRGBColorSpace;
  const resources = [identityMap], maps = new Map(), poses = new Map();
  let alive = true, distance = 13;
  const pieces = fragments.map(fragment => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(fragment.points.flatMap(([x, y]) => [x - fragment.center[0], y - fragment.center[1], 0]), 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
    geometry.setAttribute('identityUv', new THREE.Float32BufferAttribute(fragment.points.flatMap(([x, y]) => [(x - bounds.left) / width, (y - bounds.bottom) / height]), 2));
    geometry.setIndex([0, 1, 2, 0, 2, 3]);
    const map = new THREE.CanvasTexture(artwork.tiles.get(fragment.id));
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    maps.set(fragment.id, map);
    const xs = fragment.points.map(p => p[0]), ys = fragment.points.map(p => p[1]);
    const aspect = (Math.max(...xs) - Math.min(...xs)) / (Math.max(...ys) - Math.min(...ys));
    const material = new THREE.ShaderMaterial({
      side: THREE.DoubleSide, transparent: true, depthWrite: false,
      uniforms: { art: { value: map }, identity: { value: identityMap }, brand: { value: 0 },
        opacity: { value: 0 }, aspect: { value: aspect }, response: { value: 0 } },
      vertexShader: `attribute vec2 identityUv;
        varying vec2 imageUv; varying vec2 wordUv;
        void main(){ imageUv=uv; wordUv=identityUv;
          gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: `uniform sampler2D art; uniform sampler2D identity;
        uniform float brand; uniform float opacity; uniform float aspect; uniform float response;
        varying vec2 imageUv; varying vec2 wordUv;
        void main(){
          vec2 crop=imageUv;
          if(aspect>1.) crop.y=(crop.y-.5)/aspect+.5;
          else crop.x=(crop.x-.5)*aspect+.5;
          vec4 study=texture2D(art,crop);
          vec4 word=texture2D(identity,wordUv);
          float front=gl_FrontFacing?1.:.62;
          vec3 image=study.rgb*front*(1.+response*.22);
          vec3 rgb=mix(image,word.rgb,brand);
          float alpha=mix(1.,word.a,brand)*opacity;
          gl_FragColor=vec4(rgb,alpha);
          #include <colorspace_fragment>
        }`,
    });
    const mesh = new THREE.Mesh(geometry, material);
    group.add(mesh);
    resources.push(geometry, material, map);
    return { fragment, mesh, material };
  });
  const links = connections.map(([from, to]) => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    const material = new THREE.LineBasicMaterial({ color: 0xc4d2d7, transparent: true, opacity: 0, depthWrite: false });
    const line = new THREE.Line(geometry, material); group.add(line);
    resources.push(geometry, material);
    return { from, to, geometry, material };
  });
  const hole = fragments.find(fragment => fragment.id === 'key');
  const holeGeometry = new THREE.BufferGeometry().setFromPoints(hole.points.map(([x, y]) => new THREE.Vector3(x, y, -.015)));
  const holeMaterial = new THREE.LineBasicMaterial({ color: 0xd3ddd7, transparent: true, opacity: 0 });
  group.add(new THREE.LineLoop(holeGeometry, holeMaterial)); resources.push(holeGeometry, holeMaterial);

  function resize() {
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.setSize(Math.max(1, innerWidth), Math.max(1, innerHeight));
    camera.aspect = innerWidth / Math.max(1, innerHeight);
    distance = Math.max(12.4, 10.6 / (2 * Math.tan(19 * Math.PI / 180) * camera.aspect));
    camera.updateProjectionMatrix();
  }
  resize();
  const lost = event => { event.preventDefault(); onLost(); };
  renderer.domElement.addEventListener('webglcontextlost', lost);
  document.fonts.ready.then(() => {
    if (!alive) return;
    identity.paint(); identityMap.needsUpdate = true; onInvalidate();
  });
  return {
    resize,
    update(id) { const map = maps.get(id); if (map) map.needsUpdate = true; },
    draw(state, reduced) {
      const settle = smooth(state.convergence), motion = reduced ? 0 : 1 - settle;
      group.rotation.set(.09 * motion, -.13 * motion, -.035 * motion);
      camera.position.set(pointer.x * .20 * motion, pointer.y * .12 * motion, distance - .8 * state.assembly * motion);
      camera.lookAt(0, 0, 0);
      pieces.forEach(({ fragment, mesh, material }) => {
        const pose = fragmentPose(fragment, state, reduced); poses.set(fragment.id, pose);
        mesh.position.set(...pose.position); mesh.rotation.set(...pose.rotation); mesh.scale.setScalar(pose.scale);
        mesh.visible = pose.opacity > .001;
        material.uniforms.opacity.value = pose.opacity;
        material.uniforms.brand.value = state.brand;
        material.uniforms.response.value = pose.wave;
      });
      links.forEach(({ from, to, geometry, material }, i) => {
        const a = poses.get(from), b = poses.get(to);
        const t = smooth((state.assembly - i * .08) / .16) * (1 - smooth((state.assembly - .55 - i * .045) / .25));
        material.opacity = .28 * t * Math.min(a.opacity, b.opacity) * (1 - state.convergence);
        const array = geometry.attributes.position.array;
        array.set(a.position, 0); array.set(b.position, 3); array[2] -= .02; array[5] -= .02;
        geometry.attributes.position.needsUpdate = true;
      });
      holeMaterial.opacity = .40 * smooth((state.convergence - .6) / .4) * (1 - state.seat) * (1 - state.brand);
      renderer.render(scene, camera);
    },
    dispose() {
      alive = false;
      renderer.domElement.removeEventListener('webglcontextlost', lost);
      resources.forEach(resource => resource.dispose());
      renderer.dispose(); renderer.domElement.remove();
    },
  };
}

export function createCanvasMontage({ mount, artwork, onInvalidate }) {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true'); mount.replaceChildren(canvas);
  const ctx = canvas.getContext('2d');
  const identity = identityCanvas();
  let alive = true, ratio = 1, scale = 1;
  function resize() {
    ratio = Math.min(devicePixelRatio, 1.5);
    canvas.width = Math.max(1, Math.round(innerWidth * ratio));
    canvas.height = Math.max(1, Math.round(innerHeight * ratio));
    scale = Math.min(innerWidth / 10.6, innerHeight / 7.8);
  }
  resize();
  document.fonts.ready.then(() => { if (alive) { identity.paint(); onInvalidate(); } });
  return {
    resize, update() {},
    draw(state, reduced) {
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.fillStyle = '#020405'; ctx.fillRect(0, 0, innerWidth, innerHeight);
      const poses = fragments.map(fragment => ({ fragment, pose: fragmentPose(fragment, state, reduced) }))
        .sort((a, b) => a.pose.position[2] - b.pose.position[2]);
      for (const { fragment, pose } of poses) {
        if (pose.opacity <= .001) continue;
        const perspective = 13 / (13 - pose.position[2]);
        ctx.save();
        ctx.translate(innerWidth / 2 + pose.position[0] * scale * perspective, innerHeight / 2 - pose.position[1] * scale * perspective);
        ctx.rotate(-pose.rotation[2]);
        ctx.scale(scale * perspective * pose.scale * Math.max(.025, Math.abs(Math.cos(pose.rotation[1]))), scale * perspective * pose.scale);
        const local = fragment.points.map(([x, y]) => [x - fragment.center[0], -(y - fragment.center[1])]);
        ctx.beginPath(); local.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.clip();
        const xs = local.map(p => p[0]), ys = local.map(p => p[1]);
        const left = Math.min(...xs), top = Math.min(...ys), w = Math.max(...xs) - left, h = Math.max(...ys) - top;
        const size = Math.max(w, h);
        ctx.globalAlpha = pose.opacity * (1 - state.brand);
        ctx.drawImage(artwork.tiles.get(fragment.id), left + (w - size) / 2, top + (h - size) / 2, size, size);
        ctx.globalAlpha = pose.opacity * state.brand;
        ctx.drawImage(identity.canvas, bounds.left - fragment.center[0], -bounds.top + fragment.center[1], width, height);
        ctx.restore();
      }
    },
    dispose() { alive = false; canvas.remove(); },
  };
}
