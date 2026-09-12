import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../entrance-timing.js', import.meta.url), 'utf8');
const { createEntranceTimeline } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} differs from ${expected}`);
const channels = ['reveal', 'approach', 'seat', 'resonance', 'brand'];

test('elapsed time cannot substitute for resource readiness', () => {
  const timeline = createEntranceTimeline();
  const frame = timeline.step(60000);
  assert.equal(frame.state, 'waiting');
  assert.equal(frame.elapsed, 60000);
  assert.equal(frame.reveal, 1);
  for (const channel of channels.slice(1)) assert.equal(frame[channel], 0);
});

test('early readiness still gives the reveal 1800 ms', () => {
  const timeline = createEntranceTimeline();
  timeline.step(1000);
  timeline.ready();
  assert.equal(timeline.step(799).state, 'waiting');
  const boundary = timeline.step(1);
  assert.equal(boundary.state, 'approaching');
  assert.equal(boundary.approach, 0);
  close(timeline.step(1500).approach, .5);
});

test('each boundary begins the next phase at zero progress', () => {
  const timeline = createEntranceTimeline();
  timeline.ready();
  let frame = timeline.step(1800);
  assert.equal(frame.state, 'approaching');
  assert.equal(frame.approach, 0);
  frame = timeline.step(3000);
  assert.equal(frame.state, 'seating');
  assert.equal(frame.approach, 1);
  assert.equal(frame.seat, 0);
  frame = timeline.step(240);
  assert.equal(frame.state, 'settling');
  assert.equal(frame.seat, 1);
  assert.equal(frame.resonance, 0);
  assert.equal(frame.brand, 0);
  frame = timeline.step(549);
  assert.ok(frame.resonance < .5);
  assert.equal(frame.brand, 0);
  frame = timeline.step(1);
  assert.equal(frame.resonance, .5);
  assert.equal(frame.brand, 0);
  frame = timeline.step(275);
  assert.equal(frame.resonance, .75);
  close(frame.brand, .5);
  frame = timeline.step(275);
  assert.equal(frame.state, 'locked');
  assert.equal(frame.elapsed, 6140);
  for (const channel of channels) assert.equal(frame[channel], 1);
});

test('large steps carry time across boundaries without changing the result', () => {
  const large = createEntranceTimeline(), small = createEntranceTimeline();
  large.ready();
  small.ready();
  const expected = large.step(5000);
  let actual;
  for (let i = 0; i < 50; i++) actual = small.step(100);
  assert.deepEqual(actual, expected);
  assert.equal(actual.state, 'seating');
  assert.ok(actual.seat > 0 && actual.seat < 1);
  assert.equal(large.step(100000).elapsed, 6140);
});

test('late readiness starts a full approach without an extra reveal delay', () => {
  const timeline = createEntranceTimeline();
  timeline.step(10000);
  timeline.ready();
  const frame = timeline.step(0);
  assert.equal(frame.state, 'approaching');
  assert.equal(frame.approach, 0);
  const end = timeline.step(4340);
  assert.equal(end.state, 'locked');
  assert.equal(end.elapsed, 14340);
});

test('reduced motion waits for readiness and then locks immediately', () => {
  const timeline = createEntranceTimeline();
  const waiting = timeline.step(10000, true);
  assert.equal(waiting.state, 'waiting');
  assert.equal(waiting.reveal, 1);
  assert.equal(waiting.approach, 0);
  timeline.ready();
  const locked = timeline.step(0, true);
  assert.equal(locked.state, 'locked');
  assert.equal(locked.elapsed, waiting.elapsed);
  for (const channel of channels) assert.equal(locked[channel], 1);
});

test('enabling reduced motion midflight locks once and stays stable', () => {
  const timeline = createEntranceTimeline();
  timeline.ready();
  assert.equal(timeline.step(3000).state, 'approaching');
  const locked = timeline.step(0, true);
  assert.equal(locked.state, 'locked');
  assert.deepEqual(timeline.step(100000, false), locked);
  assert.deepEqual(timeline.step(100000, true), locked);
});

test('replay resets choreography while preserving established readiness', () => {
  const timeline = createEntranceTimeline();
  timeline.ready();
  timeline.step(6140);
  timeline.reset();
  const start = timeline.step(0);
  assert.equal(start.state, 'waiting');
  assert.equal(start.elapsed, 0);
  for (const channel of channels) assert.equal(start[channel], 0);
  assert.equal(timeline.step(1800).state, 'approaching');
  timeline.reset();
  assert.equal(timeline.step(0, true).state, 'locked');
  const unready = createEntranceTimeline();
  unready.reset();
  assert.equal(unready.step(10000).state, 'waiting');
});

test('negative and nonfinite delta cannot reverse or corrupt time', () => {
  const timeline = createEntranceTimeline();
  timeline.ready();
  const frame = timeline.step(2300);
  for (const delta of [-10, NaN, Infinity, -Infinity, undefined]) {
    assert.deepEqual(timeline.step(delta), frame);
  }
});

test('ordinary frame steps preserve phase order and monotonic progress', () => {
  const timeline = createEntranceTimeline();
  timeline.ready();
  const order = ['waiting', 'approaching', 'seating', 'settling', 'locked'];
  const seen = new Set();
  let previous = timeline.step(0);
  for (let i = 0; i < 500; i++) {
    const frame = timeline.step(17);
    seen.add(frame.state);
    assert.ok(order.indexOf(frame.state) >= order.indexOf(previous.state));
    for (const channel of channels) {
      assert.ok(frame[channel] >= 0 && frame[channel] <= 1);
      assert.ok(frame[channel] >= previous[channel]);
    }
    if (frame.resonance <= .5) assert.equal(frame.brand, 0);
    previous = frame;
  }
  assert.deepEqual([...seen], order);
  assert.equal(previous.elapsed, 6140);
  assert.deepEqual(timeline.step(1000000), previous);
});
