async (page) => {
  const fixture = [{ id: 'sample.pdf', estado: 'pendiente', fecha: '260916', alumno: 'ALUMNO DE PRUEBA CON APELLIDOS LARGOS', curso: 'ATPL', asignatura: 'MET', numero_examen: '12', sesion: '1' }];
  const renameRequests = [];
  await page.route('**/api/**', async route => {
    const path = route.request().url().replace(/^https?:\/\/[^/]+/, '').split('?')[0];
    if (path === '/api/renombrar') {
      renameRequests.push(route.request().postDataJSON());
      await route.fulfill({ json: { status: 'ok', renombrados: [{ id: 'sample.pdf' }] } });
      return;
    }
    if (path.startsWith('/api/thumbnail/')) {
      await route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="220"><rect width="900" height="220" fill="white"/><g fill="#111" font-family="sans-serif"><text x="30" y="45" font-size="28">EXAMEN ATPL - CABECERA DE PRUEBA</text><text x="30" y="100" font-size="24">Alumno: ALUMNO DE PRUEBA CON APELLIDOS LARGOS</text><text x="30" y="150" font-size="24">Fecha: 16/09/2026     Materia: MET     Examen: 12</text></g></svg>' });
      return;
    }
    const data = path === '/api/examenes' ? fixture : path === '/api/alumnos' ? [fixture[0].alumno] : path === '/api/asignaturas' ? [{ sigla: 'MET', codigo: '050', nombre: 'Meteorología y procedimientos de navegación' }] : [];
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
  });
  await page.goto('http://127.0.0.1:8765/public/index.html');
  await page.evaluate(() => switchView('examenes'));
  await page.locator('.exam-card').waitFor();
  const results = [];
  for (const width of [360, 768, 1366, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.waitForTimeout(300);
    const measurement = await page.evaluate(() => ({
      viewport: innerWidth,
      document: document.documentElement.scrollWidth,
      outside: [...document.querySelectorAll('.exam-card input, .exam-card select, .exam-card button')].filter(element => {
        const field = element.getBoundingClientRect();
        const card = element.closest('.exam-card').getBoundingClientRect();
        return field.width > 0 && (field.right > Math.min(innerWidth, card.right) + 1 || field.left < card.left);
      }).map(element => element.dataset.field || element.textContent.trim()),
    }));
    results.push(measurement);
    await page.screenshot({ path: `output/playwright/preview_screenshot-${width}.png`, fullPage: true });
  }
  console.log(JSON.stringify(results));
  if (results.some(result => result.document > result.viewport || result.outside.length)) throw new Error(JSON.stringify(results));
  page.on('dialog', dialog => dialog.accept());
  await page.locator('#btn-batch-rename').click();
  await page.locator('.exam-card.status-renombrado').waitFor();
  if (renameRequests.length !== 1 || renameRequests[0].items[0].estado !== 'pendiente') throw new Error('Manual batch must submit once');
  return { responsive: results, renameRequests: renameRequests.length };
}
