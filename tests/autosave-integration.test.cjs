const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function setup(file) {
  const timers = new Map();
  const sent = [];
  let timerId = 0;
  const context = vm.createContext({
    document: { getElementById: () => null, querySelector: () => null, addEventListener() {} },
    window: {}, console,
    setTimeout: callback => { timers.set(++timerId, callback); return timerId; },
    clearTimeout: id => timers.delete(id),
    fetch: async (url, options) => {
      sent.push({ url, item: JSON.parse(options.body).item });
      return { ok: true, json: async () => ({ status: 'ok' }) };
    },
  });
  if (fs.existsSync('public/shared/item-autosave.js')) {
    vm.runInContext(fs.readFileSync('public/shared/item-autosave.js', 'utf8'), context);
  }
  vm.runInContext(fs.readFileSync(file, 'utf8'), context);
  return { context, sent, async tick() {
    const callbacks = [...timers.values()];
    timers.clear();
    for (const callback of callbacks) await callback();
    await new Promise(resolve => setImmediate(resolve));
  } };
}

for (const module of ['exam', 'atl']) {
  test(`${module}: rapid edits of two cards both persist`, async () => {
    const app = setup(module === 'exam' ? 'public/app.js' : 'public/atl.js');
    vm.runInContext(module === 'exam'
      ? "saveItemEdit({id:'A',fecha:'260917'});saveItemEdit({id:'B',fecha:'260918'});"
      : "atlItems=[{id:'A'},{id:'B'}];onAtlInputChange('A','fecha','260917');onAtlInputChange('B','fecha','260918');", app.context);
    await app.tick();
    assert.deepEqual(app.sent.map(call => call.item.id).sort(), ['A', 'B']);
  });
}
