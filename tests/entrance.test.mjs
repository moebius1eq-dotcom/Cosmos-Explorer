import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const model = await readFile(new URL('../entrance-model.js', import.meta.url), 'utf8');
const { fragments, perimeter, centroid, area, fragmentPose } = await import(`data:text/javascript;base64,${Buffer.from(model).toString('base64')}`);
const near = (a, b) => assert(Math.abs(a - b) < 1e-10, `${a} differs from ${b}`);

test('five custom fragments partition the complete structure without missing area', () => {
  assert.equal(fragments.length, 5);
  near(fragments.reduce((total, fragment) => total + area(fragment.points), 0), area(perimeter));
  assert(fragments.every(fragment => area(fragment.points) > 1));
});

test('every internal fracture has exactly one matching neighboring edge', () => {
  const counts = new Map();
  const key = (a, b) => [JSON.stringify(a), JSON.stringify(b)].sort().join(':');
  fragments.forEach(({ points }) => points.forEach((a, i) => {
    const edge = key(a, points[(i + 1) % points.length]);
    counts.set(edge, (counts.get(edge) || 0) + 1);
  }));
  perimeter.forEach((a, i) => {
    const edge = key(a, perimeter[(i + 1) % perimeter.length]);
    assert.equal(counts.get(edge), 1);
    counts.delete(edge);
  });
  assert([...counts.values()].every(value => value === 2));
});

test('locked fragment poses align precisely and have no ongoing displacement', () => {
  const state = { state: 'locked', elapsed: 20000, reveal: 1, approach: 1, seat: 1, resonance: 1, brand: 1 };
  fragments.forEach(fragment => {
    const pose = fragmentPose(fragment, state);
    const center = centroid(fragment.points);
    near(pose.position[0], center[0]); near(pose.position[1], center[1]); near(pose.position[2], 0);
    pose.rotation.forEach(value => near(value, 0));
    near(pose.wave, 0);
  });
});

test('the final piece approaches before surrounding fragments align', () => {
  const state = { state: 'approaching', elapsed: 2100, reveal: 1, approach: .25, seat: 0, resonance: 0, brand: 0 };
  const loose = fragments.at(-1), surrounding = fragments[0];
  const finalPose = fragmentPose(loose, state, true);
  const neighborPose = fragmentPose(surrounding, state, true);
  near(neighborPose.position[2], surrounding.offset[2]);
  assert(finalPose.position[2] < loose.offset[2]);
  assert(finalPose.position[2] > 0);
});

test('structural response is restrained and clears completely', () => {
  const base = { state: 'settling', elapsed: 5000, reveal: 1, approach: 1, seat: 1, brand: 0 };
  for (let i = 0; i <= 100; i++) fragments.forEach(fragment => {
    const pose = fragmentPose(fragment, { ...base, resonance: i / 100 });
    assert(pose.position.every(Number.isFinite));
    assert(Math.abs(pose.position[2]) <= .012 + 1e-12);
  });
});
