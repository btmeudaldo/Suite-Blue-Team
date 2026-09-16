const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('public/app.js', 'utf8');
function setup(items, response = { status: 'ok', renombrados: [{ id: 'a' }] }) {
  const calls = [];
  const alerts = [];
  const context = vm.createContext({
    document: { getElementById: () => null, querySelector: () => null, addEventListener() {} },
    window: {}, console, setTimeout, clearTimeout,
    alert: (message) => alerts.push(message), confirm: () => true,
    fetch: async (url, options) => {
      calls.push({ url, body: JSON.parse(options.body) });
      return { ok: true, json: async () => response };
    },
  });
  vm.runInContext(source, context);
  context.fixture = items;
  vm.runInContext("examenes = fixture; listaAlumnosMemoria = ['ALUMNO PRUEBA']; updateStats = () => {}; renderExams = () => {};", context);
  return { context, calls, alerts, run: () => vm.runInContext('batchRenameAnalyzed()', context) };
}
const complete = (extra = {}) => ({ id: 'a', estado: 'pendiente', fecha: '260916', alumno: 'ALUMNO PRUEBA', curso: 'ATPL', asignatura: 'MET', numero_examen: '1', ...extra });

test('manual complete records are renamed, incomplete and renamed records are excluded', async () => {
  const app = setup([complete(), complete({ id: 'b', alumno: 'PENDIENTE', estado: 'analizado' }), complete({ id: 'c', estado: 'renombrado' }), complete({ id: 'd', numero_examen: '' })]);
  await app.run();
  assert.equal(app.calls.length, 1);
  assert.deepEqual(app.calls[0].body.items.map(item => item.id), ['a']);
  assert.match(app.calls[0].body.items[0].nombre_final, /ALUMNO PRUEBA/);
});

test('only server-confirmed records become renamed', async () => {
  const items = [complete({ estado: 'analizado' }), complete({ id: 'b', estado: 'analizado' })];
  const app = setup(items);
  await app.run();
  assert.equal(items[0].estado, 'renombrado');
  assert.equal(items[1].estado, 'analizado');
  assert.match(app.alerts.at(-1), /1.*2/);
});

test('server errors are visible and preserve pending records', async () => {
  const items = [complete({ estado: 'analizado' })];
  const app = setup(items, { status: 'error', error: 'Disco no disponible' });
  await app.run();
  assert.equal(items[0].estado, 'analizado');
  assert.match(app.alerts.at(-1), /Disco no disponible/);
});

test('batch button has one event handler', () => {
  const html = fs.readFileSync('public/index.html', 'utf8');
  const tag = html.match(/<button[^>]*id="btn-batch-rename"[^>]*>/)[0];
  const bindings = Number(tag.includes('onclick=')) + Number(source.includes("btnBatchRename.addEventListener('click', batchRenameAnalyzed)"));
  assert.equal(bindings, 1);
});
