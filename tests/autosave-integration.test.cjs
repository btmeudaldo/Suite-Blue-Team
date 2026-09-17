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

  test(`${module}: rename waits for pending edits and displays destination conflicts`, async () => {
    const app = setup(module === 'exam' ? 'public/app.js' : 'public/atl.js');
    const requests = [], alerts = [];
    app.context.alert = message => alerts.push(message);
    app.context.fetch = async (url) => {
      requests.push(url);
      return { ok: true, json: async () => url.includes('renombrar')
        ? { status: 'ok', renombrados: [], errores: [{ id: 'A', error: 'El destino ya existe' }] }
        : { status: 'ok' } };
    };
    vm.runInContext(module === 'exam'
      ? "examenes=[{id:'A',fecha:'260917',alumno:'TEST STUDENT',asignatura:'MET',numero_examen:'1',estado:'pendiente'}];listaAlumnosMemoria=['TEST STUDENT'];updateStats=()=>{};renderExams=()=>{};saveItemEdit(examenes[0]);"
      : "atlItems=[{id:'A',fecha:'260917',avion:'TEST',log_numero:'1',estado:'pendiente'}];updateAtlStats=()=>{};renderAtlCards=()=>{};onAtlInputChange('A','fecha','260918');", app.context);
    await vm.runInContext(module === 'exam' ? "renameSingle('A',null)" : "renameSingleAtl('A')", app.context);
    assert.deepEqual(requests, module === 'exam'
      ? ['/api/guardar_edicion', '/api/renombrar'] : ['/api/atl/guardar', '/api/atl/renombrar']);
    assert.equal(vm.runInContext(module === 'exam' ? 'examenes[0].estado' : 'atlItems[0].estado', app.context), 'pendiente');
    assert.match(alerts.at(-1), /destino ya existe/);
  });
}
