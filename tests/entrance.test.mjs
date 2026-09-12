import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const model = await readFile(new URL('../entrance-model.js', import.meta.url), 'utf8');
const { PIECE_SIZE, pieceOutline, createEntranceTimeline, ease } = await import(`data:text/javascript;base64,${Buffer.from(model).toString('base64')}`);

const near = (a, b) => assert(Math.abs(a - b) < 1e-12, `${a} differs from ${b}`);
const globalSide = (column, row, side) => pieceOutline(column, row)
  .slice(side * 60, side * 60 + 61)
  .map(([x, y]) => [x + column * PIECE_SIZE, y + row * PIECE_SIZE]);

test('the final piece fits all four neighbors with no seam mismatch', () => {
  [[0, -1, 0, 2], [1, 0, 1, 3], [0, 1, 2, 0], [-1, 0, 3, 1]].forEach(([x, y, centerSide, neighborSide]) => {
    const a = globalSide(0, 0, centerSide);
    const b = globalSide(x, y, neighborSide).reverse();
    assert.equal(a.length, 61);
    a.forEach((point, i) => point.forEach((value, axis) => near(value, b[i][axis])));
  });
});

test('outlines are closed, finite and deterministic, with varied cuts', () => {
  const shapes = new Set();
  for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) {
    const points = pieceOutline(x, y);
    assert(points.flat().every(Number.isFinite));
    near(points[0][0], points.at(-1)[0]);
    near(points[0][1], points.at(-1)[1]);
    assert.deepEqual(points, pieceOutline(x, y));
    shapes.add(JSON.stringify(points));
  }
  assert.equal(shapes.size, 25);
});

test('elapsed time cannot start docking while assets are unresolved', () => {
  const timeline = createEntranceTimeline();
  for (let i = 0; i < 1200; i++) {
    const snapshot = timeline.step(50);
    assert.equal(snapshot.state, 'waiting');
    assert.equal(snapshot.approach, 0);
    assert.equal(snapshot.seat, 0);
  }
  timeline.ready();
  assert.equal(timeline.step(16).state, 'approaching');
});

test('a cached load still reveals the geometry before docking and ends precisely', () => {
  const timeline = createEntranceTimeline();
  timeline.ready();
  assert.equal(timeline.step(0).reveal, 0);
  assert.equal(timeline.step(800).state, 'waiting');
  const states = new Set();
  let previousApproach = 0, snapshot;
  for (let i = 0; i < 250; i++) {
    snapshot = timeline.step(20);
    states.add(snapshot.state);
    assert(snapshot.approach >= previousApproach && snapshot.approach <= 1);
    assert(snapshot.seat >= 0 && snapshot.seat <= 1);
    previousApproach = snapshot.approach;
  }
  assert.deepEqual([...states], ['waiting', 'approaching', 'seating', 'locked']);
  assert.equal(snapshot.approach, 1);
  assert.equal(snapshot.seat, 1);
  assert.equal(timeline.step(10000).state, 'locked');
});

test('reduced motion waits for real readiness, then seats with no travel', () => {
  const timeline = createEntranceTimeline();
  assert.equal(timeline.step(0, true).state, 'waiting');
  assert.equal(timeline.step(100000, true).approach, 0);
  timeline.ready();
  const snapshot = timeline.step(0, true);
  assert.equal(snapshot.state, 'locked');
  assert.equal(snapshot.seat, 1);
});

test('changing to reduced motion during approach finishes without another animation', () => {
  const timeline = createEntranceTimeline();
  timeline.ready();
  assert.equal(timeline.step(1600).state, 'approaching');
  assert.equal(timeline.step(0, true).state, 'locked');
});

test('replay preserves settled asset readiness', () => {
  const timeline = createEntranceTimeline();
  timeline.ready();
  timeline.step(0, true);
  timeline.reset();
  assert.equal(timeline.step(0).state, 'waiting');
  assert.equal(timeline.step(1600).state, 'approaching');
});

test('docking easing stays within its endpoints without a cartoon bounce', () => {
  near(ease(0), 0);
  near(ease(1), 1);
  let last = 0;
  for (let i = 0; i <= 1000; i++) {
    const current = ease(i / 1000);
    assert(current >= last - 1e-12 && current >= 0 && current <= 1);
    last = current;
  }
});
