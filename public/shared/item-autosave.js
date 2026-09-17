function createItemAutosave({
  save,
  onSaved = () => {},
  onStatus = () => {},
  setTimer = setTimeout,
  cancelTimer = clearTimeout,
}) {
  const entries = new Map();

  function report(id, entry, status) {
    entry.status = status;
    onStatus(id, status);
  }

  function run(id, entry) {
    if (entry.running) return entry.running;
    entry.running = (async () => {
      while (entry.pending && entry.timer === null) {
        const snapshot = entry.pending;
        entry.pending = null;
        report(id, entry, 'Guardando…');
        try {
          const result = await save(snapshot);
          entry.error = null;
          if (!entry.pending) {
            onSaved(id, result);
            report(id, entry, 'Guardado');
          }
        } catch (error) {
          entry.error = error;
          if (!entry.pending) report(id, entry, 'Error al guardar; edita para reintentar');
        }
      }
    })().finally(() => { entry.running = null; });
    return entry.running;
  }

  function schedule(item) {
    let entry = entries.get(item.id);
    if (!entry) {
      entry = { pending: null, timer: null, running: null, error: null, status: '' };
      entries.set(item.id, entry);
    }
    if (entry.timer !== null) cancelTimer(entry.timer);
    entry.pending = { ...item };
    entry.error = null;
    report(item.id, entry, 'Pendiente de guardar');
    entry.timer = setTimer(() => {
      entry.timer = null;
      return run(item.id, entry);
    }, 400);
  }

  async function flush(id) {
    const entry = entries.get(id);
    if (!entry) return;
    do {
      if (entry.timer !== null) cancelTimer(entry.timer);
      entry.timer = null;
      await run(id, entry);
    } while (entry.pending);
    if (entry.error) throw entry.error;
  }

  return {
    schedule,
    flush,
    status: id => entries.get(id)?.status || '',
    hasUnsaved: () => [...entries.values()].some(entry => entry.pending || entry.running || entry.error),
  };
}

if (typeof module !== 'undefined') module.exports = { createItemAutosave };
