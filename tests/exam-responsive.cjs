async (page) => {
  const fixture = [{ id: 'sample.pdf', estado: 'pendiente', fecha: '260916', alumno: 'ALUMNO DE PRUEBA CON APELLIDOS LARGOS', curso: 'ATPL', asignatura: 'MET', numero_examen: '12', sesion: '1' }];
  await page.route('**/api/**', async route => {
    const path = route.request().url().replace(/^https?:\/\/[^/]+/, '').split('?')[0];
    const data = path === '/api/examenes' ? fixture : path === '/api/asignaturas' ? [{ sigla: 'MET', codigo: '050', nombre: 'Meteorología y procedimientos de navegación' }] : [];
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
        return field.right > Math.min(innerWidth, card.right) + 1 || field.left < card.left;
      }).map(element => element.dataset.field || element.textContent.trim()),
    }));
    results.push(measurement);
    await page.screenshot({ path: `output/playwright/preview_screenshot-${width}.png`, fullPage: true });
  }
  console.log(JSON.stringify(results));
  if (results.some(result => result.document > result.viewport || result.outside.length)) throw new Error('Header fields overflow viewport or exam card');
}
