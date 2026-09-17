const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createItemAutosave } = require('../public/shared/item-autosave.js');

function fixture(save, onSaved = () => {}) {
  const timers = new Map();
  let id = 0;
  const queue = createItemAutosave({ save, onSaved,
    setTimer: callback => { timers.set(++id, callback); return id; },
    cancelTimer: id => timers.delete(id),
  });
  return { queue, async tick() {
    const callbacks = [...timers.values()]; timers.clear();
    for (const callback of callbacks) callback();
    await new Promise(resolve => setImmediate(resolve));
  } };
}

test('same-card edits coalesce to the latest snapshot', async () => {
  const saved = [];
  const { queue } = fixture(async item => saved.push(item));
  queue.schedule({ id: 'A', value: 1 });
  queue.schedule({ id: 'A', value: 2 });
  await queue.flush('A');
  assert.deepEqual(saved, [{ id: 'A', value: 2 }]);
  assert.equal(queue.status('A'), 'Guardado');
});

test('in-flight responses never replace a newer edit; writes are serialized', async () => {
  const saved = [], applied = [];
  let finish;
  const { queue, tick } = fixture(async item => {
    saved.push(item.value);
    if (item.value === 1) await new Promise(resolve => { finish = resolve; });
    return item;
  }, (_, result) => applied.push(result.value));
  queue.schedule({ id: 'A', value: 1 });
  await tick();
  queue.schedule({ id: 'A', value: 2 });
  const flushed = queue.flush('A');
  assert.deepEqual(saved, [1]);
  finish();
  await flushed;
  assert.deepEqual(saved, [1, 2]);
  assert.deepEqual(applied, [2]);
});

test('failure is visible, blocks flush and a later edit can retry', async () => {
  let fail = true;
  const { queue } = fixture(async () => { if (fail) throw new Error('offline'); });
  queue.schedule({ id: 'A' });
  await assert.rejects(queue.flush('A'), /offline/);
  assert.match(queue.status('A'), /Error/);
  fail = false;
  queue.schedule({ id: 'A', value: 2 });
  await queue.flush('A');
  assert.equal(queue.status('A'), 'Guardado');
});
