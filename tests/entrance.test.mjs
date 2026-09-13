import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../entrance-model.js', import.meta.url), 'utf8');
const { fragments, compositionBounds, fragmentPose } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const near = (a, b) => assert(Math.abs(a - b) < 1e-10, `${a} differs from ${b}`);
const base = { state: 'discovery', elapsed: 0, discovery: 0, assembly: 0, convergence: 0, finalPiece: 0, seat: 0, resonance: 0, brand: 0 };
const complete = { ...base, state: 'locked', discovery: 1, assembly: 1, convergence: 1, finalPiece: 1, seat: 1, resonance: 1, brand: 1 };

test('fifteen fragments form a continuous mosaic with one unique central piece', () => {
  assert.equal(fragments.length, 15);
  assert.equal(new Set(fragments.map(f => f.id)).size, 15);
  const key = fragments.find(f => f.id === 'key');
  assert(Math.abs(key.center[0]) < .1 && Math.abs(key.center[1]) < .2);
  const edges = new Map();
  for (const { points } of fragments) points.forEach((a, i) => {
    const b = points[(i + 1) % points.length];
    const label = [JSON.stringify(a), JSON.stringify(b)].sort().join(':');
    edges.set(label, (edges.get(label) || 0) + 1);
  });
  assert.equal([...edges.values()].filter(n => n === 1).length, 16);
  assert.equal([...edges.values()].filter(n => n === 2).length, 22);
});

test('the discovery opens with one image, then its coordinate counterpart', () => {
  const visible = discovery => fragments.filter(f => fragmentPose(f, { ...base, discovery }).opacity > .01).map(f => f.id);
  assert.deepEqual(visible(.2), ['earth']);
  assert.deepEqual(visible(.9), ['earth', 'coordinates']);
});

test('convergence leaves precisely the center missing before the readiness gate opens', () => {
  const waiting = { ...complete, state: 'awaiting', finalPiece: 0, seat: 0, resonance: 0, brand: 0 };
  for (const fragment of fragments) {
    const pose = fragmentPose(fragment, waiting);
    assert.equal(pose.opacity, fragment.id === 'key' ? 0 : 1);
    if (fragment.id !== 'key') {
      near(pose.position[0], fragment.center[0]); near(pose.position[1], fragment.center[1]); near(pose.position[2], 0);
    }
  }
});

test('the final pose is flat and continuous for the shared identity texture', () => {
  const { left, right, top, bottom } = compositionBounds;
  for (const fragment of fragments) {
    const pose = fragmentPose(fragment, complete);
    near(pose.position[0], fragment.center[0]); near(pose.position[1], fragment.center[1]); near(pose.position[2], 0);
    pose.rotation.forEach(r => near(r, 0)); near(pose.scale, 1); near(pose.opacity, 1);
    for (const [x, y] of fragment.points) {
      assert(x > left && x < right && y > bottom && y < top);
      assert(Number.isFinite((x - left) / (right - left)));
    }
  }
});

test('planet and coordinate fragments briefly align in the same plane', () => {
  const state = { ...base, state: 'assembly', discovery: 1, assembly: .27 };
  const earth = fragmentPose(fragments.find(f => f.id === 'earth'), state);
  const coordinates = fragmentPose(fragments.find(f => f.id === 'coordinates'), state);
  near(earth.position[1], coordinates.position[1]);
  near(earth.position[2], coordinates.position[2]);
  earth.rotation.forEach(r => near(r, 0)); coordinates.rotation.forEach(r => near(r, 0));
});

test('reduced motion preserves the central gap without flips or perspective travel', () => {
  const state = { ...complete, state: 'awaiting', finalPiece: 0, seat: 0, resonance: 0, brand: 0 };
  for (const fragment of fragments) {
    const pose = fragmentPose(fragment, state, true);
    if (fragment.id === 'key') assert.equal(pose.opacity, 0);
    else { pose.rotation.forEach(r => near(r, 0)); near(pose.position[2], 0); }
  }
});

test('all sampled montage transforms stay finite and bounded', () => {
  for (let i = 0; i <= 100; i++) for (const fragment of fragments) {
    const p = i / 100;
    for (const state of [{ ...base, discovery: p }, { ...base, discovery: 1, assembly: p },
      { ...base, discovery: 1, assembly: 1, convergence: p }, { ...complete, finalPiece: p, seat: 0, resonance: 0, brand: 0 }]) {
      const pose = fragmentPose(fragment, state);
      assert([...pose.position, ...pose.rotation, pose.scale, pose.opacity].every(Number.isFinite));
      assert(pose.opacity >= 0 && pose.opacity <= 1 && pose.scale > 0);
    }
  }
});
