async (page) => {
  const warning = 'Datos recuperados desde la copia de seguridad. Puede faltar la última edición; revisa los datos antes de continuar.';
  const exam = { id: 'RECOVERY', estado: 'pendiente', fecha: '260917', alumno: 'ALUMNO PRUEBA', asignatura: 'MET', curso: 'ATPL', numero_examen: '1', sesion: '1' };
  let blocked = false;
  await page.route('**/api/**', async route => {
    const url = route.request().url();
    const stateRequest = url.endsWith('/examenes') || url.endsWith('/atl/items');
    if (stateRequest && blocked) {
      await route.fulfill({ status: 503, json: { status: 'error', error: 'El archivo de datos está dañado y no hay una copia de seguridad válida. Se han bloqueado los cambios para conservarlo.' } });
      return;
    }
    if (url.includes('/thumbnail/')) {
      await route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="700" height="180"><rect width="700" height="180" fill="white"/><text x="30" y="70" fill="black" font-size="25">DATOS FICTICIOS RECUPERADOS</text></svg>' });
      return;
    }
    const data = url.endsWith('/examenes') ? [exam]
      : url.endsWith('/atl/items') ? [{ id: 'RECOVERY', estado: 'listo', fecha: '260917', avion: 'TEST', log_numero: '1' }]
      : url.endsWith('/alumnos') ? ['ALUMNO PRUEBA'] : [];
    await route.fulfill({ json: data, headers: stateRequest ? { 'X-State-Warning': encodeURIComponent(warning) } : {} });
  });
  await page.goto('http://127.0.0.1:8765/public/index.html');
  await page.setViewportSize({ width: 1366, height: 950 });
  await page.evaluate(() => switchView('examenes'));
  await page.locator('#exam-state-notice').waitFor({ state: 'visible' });
  if (await page.locator('#exam-state-notice').textContent() !== warning) throw new Error('Missing recovery notice');
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'output/playwright/preview_screenshot-recovery-exams.png', fullPage: true });
  await page.evaluate(() => switchView('atl'));
  await page.locator('#atl-state-notice').waitFor({ state: 'visible' });
  blocked = true;
  await page.evaluate(() => loadAtlItems());
  if (await page.locator('#atl-state-notice').getAttribute('role') !== 'alert') throw new Error('Missing storage error');
  if (await page.locator('.atl-card').count() !== 1) throw new Error('Existing data was lost');
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'output/playwright/preview_screenshot-recovery-blocked.png', fullPage: true });
  const verified = await page.evaluate(async () => {
    const urls = [...document.scripts].map(script => script.src).filter(url => url.includes('20260917-recovery'));
    return Promise.all(urls.map(async url => ({ url, current: (await (await fetch(url)).text()).includes('loadStateItems') })));
  });
  if (verified.length !== 3 || verified.some(script => !script.current)) throw new Error('Stale recovery scripts');
  return { noticesVerified: 2, existingCardsPreserved: 1, scripts: verified };
}
