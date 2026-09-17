const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function setup(response) {
  const element = { hidden: true, textContent: '', dataset: {}, setAttribute(name, value) { this[name] = value; } };
  const context = vm.createContext({
    document: { getElementById: () => element },
    fetch: async () => response,
  });
  vm.runInContext(fs.readFileSync('public/shared/state-feedback.js', 'utf8'), context);
  return { element, load: () => vm.runInContext("loadStateItems('/api/examenes', 'notice')", context) };
}

test('recovered data shows the decoded recovery notice', async () => {
  const warning = 'Datos recuperados: revisa la última edición.';
  const app = setup({ ok: true, headers: { get: () => encodeURIComponent(warning) }, json: async () => [{ id: 'A' }] });
  assert.deepEqual(await app.load(), [{ id: 'A' }]);
  assert.equal(app.element.hidden, false);
  assert.equal(app.element.textContent, warning);
  assert.equal(app.element.role, 'status');
});

test('unrecoverable corruption produces a visible error instead of empty data', async () => {
  const app = setup({ ok: false, json: async () => ({ error: 'Estado dañado y sin respaldo válido' }) });
  await assert.rejects(app.load(), /sin respaldo válido/);
  assert.equal(app.element.hidden, false);
  assert.match(app.element.textContent, /sin respaldo válido/);
  assert.equal(app.element.role, 'alert');
});

test('unexpected JSON structure is rejected', async () => {
  const app = setup({ ok: true, json: async () => ({ unexpected: true }) });
  await assert.rejects(app.load(), /válid/);
});

test('normal data hides a previous notice', async () => {
  const app = setup({ ok: true, headers: { get: () => null }, json: async () => [] });
  app.element.hidden = false;
  await app.load();
  assert.equal(app.element.hidden, true);
});
