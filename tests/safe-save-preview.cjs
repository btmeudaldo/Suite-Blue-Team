async (page) => {
  const exams = ['A', 'B'].map(id => ({ id, estado: 'pendiente', fecha: '260917', alumno: 'ALUMNO PRUEBA', asignatura: 'MET', curso: 'ATPL', numero_examen: '1', sesion: '1' }));
  const atls = ['A', 'B'].map(id => ({ id, estado: 'pendiente', fecha: '260917', avion: 'TEST', log_numero: '1' }));
  const saved = [];
  await page.route('**/api/**', async route => {
    const url = route.request().url();
    let data = [];
    if (url.endsWith('/examenes')) data = exams;
    if (url.endsWith('/alumnos')) data = ['ALUMNO PRUEBA'];
    if (url.endsWith('/asignaturas')) data = [{ sigla: 'MET', codigo: '050' }];
    if (url.endsWith('/atl/items')) data = atls;
    if (url.endsWith('/guardar_edicion') || url.endsWith('/atl/guardar')) {
      const item = route.request().postDataJSON().item;
      saved.push({ url, item });
      data = { status: 'ok', item };
    }
    if (url.includes('/thumbnail/')) {
      await route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="700" height="180"><rect width="700" height="180" fill="white"/><text x="25" y="75" fill="black" font-size="26">CABECERA DE PRUEBA - DATOS FICTICIOS</text></svg>' });
      return;
    }
    await route.fulfill({ json: data });
  });
  await page.goto('http://127.0.0.1:8765/public/index.html');
  await page.setViewportSize({ width: 1366, height: 1000 });
  await page.evaluate(() => switchView('examenes'));
  await page.locator('.exam-card').first().waitFor();
  await page.locator('.exam-card[data-id="A"] [data-field="fecha"]').fill('260918');
  await page.locator('.exam-card[data-id="B"] [data-field="fecha"]').fill('260919');
  await page.waitForFunction(() => document.getElementById('exam-save-A')?.textContent === 'Guardado' && document.getElementById('exam-save-B')?.textContent === 'Guardado');
  await page.screenshot({ path: 'output/playwright/preview_screenshot-safe-exams.png', fullPage: true });
  await page.evaluate(() => switchView('atl'));
  await page.locator('.atl-card').first().waitFor();
  await page.locator('#atl-fecha-A').fill('260918');
  await page.locator('#atl-fecha-B').fill('260919');
  await page.waitForFunction(() => document.getElementById('atl-save-A')?.textContent === 'Guardado' && document.getElementById('atl-save-B')?.textContent === 'Guardado');
  await page.screenshot({ path: 'output/playwright/preview_screenshot-safe-atl.png', fullPage: true });
  if (saved.length !== 4 || saved.some(record => record.item.fecha === '260917')) throw new Error(JSON.stringify(saved));
  const scripts = await page.evaluate(async () => {
    const urls = [...document.scripts].map(script => script.src).filter(url => url.includes('safe-save'));
    return Promise.all(urls.map(async url => ({ url, ok: (await fetch(url)).ok })));
  });
  if (scripts.length !== 3 || scripts.some(script => !script.ok)) throw new Error('Missing versioned resources');
  return { savedCards: saved.length, scripts };
}
