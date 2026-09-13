import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../entrance-timing.js', import.meta.url), 'utf8');
const { createEntranceTimeline } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} differs from ${expected}`);
const channels = ['discovery', 'assembly', 'convergence', 'finalPiece', 'seat', 'resonance', 'brand', 'reveal'];
const assembled = frame => {
  for (const channel of ['discovery', 'assembly', 'convergence', 'reveal']) assert.equal(frame[channel], 1);
  for (const channel of ['finalPiece', 'seat', 'resonance', 'brand']) assert.equal(frame[channel], 0);
};

test('previews converge before readiness but no elapsed time admits the final piece', () => {
  const timeline = createEntranceTimeline();
  const frame = timeline.step(60000);
  assert.equal(frame.state, 'awaiting');
  assert.equal(frame.elapsed, 60000);
  assembled(frame);
  const hold = timeline.step(10000);
  assert.equal(hold.state, 'awaiting');
  assert.equal(hold.elapsed, 70000);
  assembled(hold);
});

test('the opening reveals over 500 ms within the discovery phase', () => {
  const timeline = createEntranceTimeline();
  assert.equal(timeline.step(0).reveal, 0);
  close(timeline.step(250).reveal, .5);
  const frame = timeline.step(250);
  assert.equal(frame.state, 'discovery');
  assert.equal(frame.reveal, 1);
  assert.equal(frame.assembly, 0);
});

test('ready-at-start boundaries total 10880 ms and identity has its own phase', () => {
  const timeline = createEntranceTimeline();
  timeline.ready();
  let frame = timeline.step(1800);
  assert.equal(frame.state, 'assembly');
  assert.equal(frame.discovery, 1);
  assert.equal(frame.assembly, 0);
  frame = timeline.step(3600);
  assert.equal(frame.state, 'convergence');
  assert.equal(frame.assembly, 1);
  assert.equal(frame.convergence, 0);
  frame = timeline.step(2200);
  assert.equal(frame.state, 'final-piece');
  assert.equal(frame.convergence, 1);
  assert.equal(frame.finalPiece, 0);
  frame = timeline.step(1050);
  assert.equal(frame.state, 'seating');
  assert.equal(frame.finalPiece, 1);
  assert.equal(frame.seat, 0);
  frame = timeline.step(180);
  assert.equal(frame.state, 'settling');
  assert.equal(frame.seat, 1);
  assert.equal(frame.resonance, 0);
  assert.equal(frame.brand, 0);
  frame = timeline.step(650);
  assert.equal(frame.state, 'identity');
  assert.equal(frame.resonance, 1);
  assert.equal(frame.brand, 0);
  close(timeline.step(700).brand, .5);
  frame = timeline.step(700);
  assert.equal(frame.state, 'locked');
  assert.equal(frame.elapsed, 10880);
  for (const channel of channels) assert.equal(frame[channel], 1);
});

test('late readiness releases the gate at zero progress and preserves the full ending', () => {
  const timeline = createEntranceTimeline();
  assert.equal(timeline.step(7600).state, 'awaiting');
  timeline.step(1000);
  timeline.ready();
  const frame = timeline.step(0);
  assert.equal(frame.state, 'final-piece');
  assert.equal(frame.finalPiece, 0);
  assert.equal(frame.elapsed, 8600);
  const locked = timeline.step(3280);
  assert.equal(locked.state, 'locked');
  assert.equal(locked.elapsed, 11880);
});

test('readiness during convergence does not shortcut its remaining time', () => {
  const timeline = createEntranceTimeline();
  timeline.step(7000);
  timeline.ready();
  assert.equal(timeline.step(599).state, 'convergence');
  const frame = timeline.step(1);
  assert.equal(frame.state, 'final-piece');
  assert.equal(frame.finalPiece, 0);
});

test('assembly gathers progressively faster across equal-time intervals', () => {
  const timeline = createEntranceTimeline();
  timeline.step(1800);
  let previous = 0, previousAdvance = 0;
  for (let quarter = 1; quarter <= 4; quarter++) {
    const frame = timeline.step(900);
    close(frame.assembly, (quarter / 4) ** 2);
    const advance = frame.assembly - previous;
    assert.ok(advance > previousAdvance);
    previous = frame.assembly;
    previousAdvance = advance;
  }
});

test('large deltas and ordinary frames reach equivalent phase positions', () => {
  for (const ready of [false, true]) {
    const large = createEntranceTimeline(), small = createEntranceTimeline();
    if (ready) { large.ready(); small.ready(); }
    const expected = large.step(9200);
    let actual;
    for (let i = 0; i < 92; i++) actual = small.step(100);
    assert.deepEqual(actual, expected);
    if (ready) assert.equal(large.step(100000).elapsed, 10880);
  }
});

test('reduced motion waits as an assembled composition with an empty center', () => {
  const timeline = createEntranceTimeline();
  const staticFrame = timeline.step(0, true);
  assert.equal(staticFrame.state, 'awaiting');
  assert.equal(staticFrame.elapsed, 0);
  assembled(staticFrame);
  const hold = timeline.step(5000, true);
  assembled(hold);
  timeline.ready();
  const locked = timeline.step(0, true);
  assert.equal(locked.state, 'locked');
  assert.equal(locked.elapsed, hold.elapsed);
  for (const channel of channels) assert.equal(locked[channel], 1);
});

test('changing to reduced motion midflight locks once when assets are ready', () => {
  const timeline = createEntranceTimeline();
  timeline.ready();
  assert.equal(timeline.step(3000).state, 'assembly');
  const locked = timeline.step(0, true);
  assert.equal(locked.state, 'locked');
  assert.deepEqual(timeline.step(100000, false), locked);
  assert.deepEqual(timeline.step(100000, true), locked);
});

test('leaving reduced motion preserves the assembled hold until readiness', () => {
  const timeline = createEntranceTimeline();
  timeline.step(0, true);
  const hold = timeline.step(100, false);
  assert.equal(hold.state, 'awaiting');
  assembled(hold);
  timeline.ready();
  assert.equal(timeline.step(0, false).state, 'final-piece');
});

test('replay restarts discovery while retaining an established readiness result', () => {
  const timeline = createEntranceTimeline();
  timeline.ready();
  timeline.step(10880);
  timeline.reset();
  const start = timeline.step(0);
  assert.equal(start.state, 'discovery');
  assert.equal(start.elapsed, 0);
  for (const channel of channels) assert.equal(start[channel], 0);
  assert.equal(timeline.step(7600).state, 'final-piece');
  timeline.reset();
  assert.equal(timeline.step(0, true).state, 'locked');
  const unready = createEntranceTimeline();
  unready.step(7600);
  unready.reset();
  assert.equal(unready.step(10880).state, 'awaiting');
});

test('negative and nonfinite deltas cannot reverse or corrupt progress', () => {
  const timeline = createEntranceTimeline();
  const frame = timeline.step(2300);
  for (const delta of [-10, NaN, Infinity, -Infinity, undefined]) assert.deepEqual(timeline.step(delta), frame);
});

test('normal frames preserve every phase, bounded channels, and stable final identity', () => {
  const timeline = createEntranceTimeline();
  const order = ['discovery', 'assembly', 'convergence', 'awaiting', 'final-piece', 'seating', 'settling', 'identity', 'locked'];
  const seen = new Set();
  let previous = timeline.step(0);
  for (let i = 0; i < 500; i++) {
    if (i === 170) timeline.ready();
    const frame = timeline.step(50);
    seen.add(frame.state);
    assert.ok(order.indexOf(frame.state) >= order.indexOf(previous.state));
    for (const channel of channels) {
      assert.ok(frame[channel] >= 0 && frame[channel] <= 1);
      assert.ok(frame[channel] >= previous[channel]);
    }
    if (order.indexOf(frame.state) < order.indexOf('identity')) assert.equal(frame.brand, 0);
    previous = frame;
  }
  assert.deepEqual([...seen], order);
  assert.equal(previous.elapsed, 11780);
  assert.deepEqual(timeline.step(1000000), previous);
});
