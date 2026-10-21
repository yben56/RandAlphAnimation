import test from 'node:test';
import assert from 'node:assert/strict';
import { animateText } from '../src/index.js';
import { runTextAnimation } from '../src/core.js';
import { transitionCharacter } from '../src/character-transition.js';

function useFakeTimers(callback, randomValues = [0]) {
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  const originalRandom = Math.random;
  let now = 0;
  let nextId = 0;
  const timers = new Map();

  globalThis.setTimeout = (fn, delay) => {
    const id = ++nextId;
    timers.set(id, { fn, due: now + delay });
    return id;
  };
  globalThis.clearTimeout = (id) => timers.delete(id);
  let randomIndex = 0;
  Math.random = () => randomValues[Math.min(randomIndex++, randomValues.length - 1)];

  const advance = (milliseconds) => {
    const target = now + milliseconds;
    while (true) {
      const next = [...timers.entries()]
        .filter(([, timer]) => timer.due <= target)
        .sort(([, left], [, right]) => left.due - right.due)[0];
      if (!next) break;
      const [id, timer] = next;
      timers.delete(id);
      now = timer.due;
      timer.fn();
    }
    now = target;
  };

  try {
    callback({ advance, timers, getRandomCalls: () => randomIndex });
  } finally {
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
    Math.random = originalRandom;
  }
}

test('scrambles every letter immediately, then restores randomized groups', () => {
  useFakeTimers(({ advance }) => {
    const updates = [];
    runTextAnimation(
      'Hello World',
      { groups: 3, stagger: 500, steps: 1, stepInterval: 100 },
      (text) => updates.push(text),
    );

    assert.equal(updates[0], 'Aaaaa Aaaaa');

    advance(100);
    assert.equal(updates.at(-1), 'Aello Aaaaa');

    advance(500);
    assert.equal(updates.at(-1), 'Aello Woraa');

    advance(500);
    assert.equal(updates.at(-1), 'Hello World');
  });
});

test('stop cancels pending updates and restores the source text', () => {
  useFakeTimers(({ advance, timers }) => {
    const updates = [];
    const animation = runTextAnimation(
      'AB',
      { groups: 1, steps: 3, stepInterval: 10 },
      (text) => updates.push(text),
    );

    assert.equal(updates[0], 'BA');
    advance(10);
    animation.stop();
    const updateCount = updates.length;

    assert.equal(updates.at(-1), 'AB');
    assert.equal(timers.size, 0);
    advance(100);
    assert.equal(updates.length, updateCount);
  });
});

test('a letter stays original once a random state matches it', () => {
  useFakeTimers(
    ({ advance, getRandomCalls }) => {
      const updates = [];
      runTextAnimation(
        'A',
        { groups: 1, steps: 3, stepInterval: 10, alphabet: 'AB' },
        (text) => updates.push(text),
      );

      assert.equal(updates[0], 'B');
      advance(10);
      assert.equal(updates.at(-1), 'A');
      assert.equal(getRandomCalls(), 3);

      advance(10);
      assert.equal(updates.at(-1), 'A');
      assert.equal(getRandomCalls(), 3);
    },
    [0.99, 0],
  );
});

test('uses randomized opacity while letters animate and restores full opacity', () => {
  useFakeTimers(
    ({ advance }) => {
      const updates = [];
      runTextAnimation(
        'A',
        {
          groups: 1,
          steps: 3,
          stepInterval: 10,
          alphabet: 'ABC',
        },
        (text, opacities) => updates.push({ text, opacity: opacities[0] }),
      );

      assert.equal(updates[0].text, 'B');
      assert.equal(updates[0].opacity, 0);
      advance(10);
      assert.equal(updates.at(-1).text, 'C');
      assert.equal(updates.at(-1).opacity, 0);
      advance(10);
      assert.equal(updates.at(-1).text, 'B');
      assert.equal(updates.at(-1).opacity, 1);
      advance(10);
      assert.deepEqual(updates.at(-1), { text: 'A', opacity: 1 });
    },
    [0, 0, 0.99, 0, 0.5, 0.99],
  );
});

test('rejects unsupported effects', () => {
  assert.throws(
    () => runTextAnimation('A', { effect: 'unknown' }, () => {}),
    /effect option must be "spark"/,
  );
  assert.throws(
    () => runTextAnimation('A', { effect: 'flip' }, () => {}),
    /effect option must be "spark"/,
  );
});

test('transitions changed characters with blur and movement, respecting reduced motion', () => {
  const element = {
    style: {},
    ownerDocument: { defaultView: { matchMedia: () => ({ matches: false }) } },
    get offsetWidth() {
      this.layoutRead = true;
      return 10;
    },
  };
  transitionCharacter(element);

  assert.equal(element.layoutRead, true);
  assert.equal(element.style.filter, 'blur(0)');
  assert.equal(element.style.transform, 'translateY(0) scale(1)');

  const reducedMotionElement = {
    style: {},
    ownerDocument: { defaultView: { matchMedia: () => ({ matches: true }) } },
  };
  transitionCharacter(reducedMotionElement);
  assert.deepEqual(reducedMotionElement.style, {});
});

test('DOM API restores the original text on stop and prevents restart after destroy', () => {
  useFakeTimers(() => {
    const element = { textContent: 'Hello' };
    const animation = animateText(element, { steps: 1, stepInterval: 10 });

    animation.stop();
    assert.equal(element.textContent, 'Hello');

    animation.destroy();
    assert.throws(() => animation.start(), /destroyed/);
  });
});

test('rejects invalid animation targets and an empty alphabet', () => {
  assert.throws(() => animateText(null), /DOM element/);
  assert.throws(
    () =>
      animateText({
        textContent: 'Hello',
        childNodes: [{ nodeType: 1 }],
      }),
    /plain text/,
  );
  assert.throws(
    () => runTextAnimation('A', { alphabet: '' }, () => {}),
    /at least one character/,
  );
});
