# Cabeceras y Renombrar Listos

- [x] Diagnosticar causas y documentar requisitos y plan.
- [x] Ejecutar regresiones RED de selección, respuesta parcial y responsive.
- [x] Corregir el renombrado y el ajuste de campos.
- [x] Ejecutar GREEN y capturar preview; registrar limitación de lint/formato.
- [x] Crear commits aislados y preview local sin producción.
- [x] Push autorizado explícitamente por el usuario y completado en `origin/codex/fix-exam-responsive-batch`.

## Revisión
- RED: cuatro regresiones unitarias fallaron; el navegador midió anchos de documento 827, 827, 1529 y 1920 para viewports 360, 768, 1366 y 1920.
- GREEN: siete pruebas unitarias pasan tanto en el workspace como en una copia del contenido exacto preparado para el commit, sin incluir cambios previos del usuario.
- Responsive: ningún campo visible queda fuera de su tarjeta ni hay desbordamiento horizontal en los cuatro anchos comprobados.
- Clic real con API simulada: examen manual pendiente pasa a renombrado. No se modificaron PDFs reales ni se invocó IA.
- Caché: la preview carga `/public/app.js?v=20260916-manual-batch` y contiene `isExamReadyToRename`; CSS también versionado.
- Evidencia: `output/playwright/preview_screenshot-desktop.png` y `preview_screenshot-mobile.png`, con datos ficticios.
- Preview local: http://127.0.0.1:8765/output/playwright/preview_screenshot-desktop.png
- `node --check public/app.js` correcto. `git diff --cached --check` correcto para los cambios de esta tarea. Los espacios señalados en el diff global corresponden a cambios previos.
- `npm run lint:fix` y `npm run format` intentados: no hay `package.json`. No se puede afirmar validación ESLint/Prettier. No hay TypeScript.
- Commits RED `6041ffc`, `44a5381`; GREEN `649a8ec`. Cambios previos conservados sin incluirlos en estos commits.
- El rechazo inicial de la revisión automática se resolvió con autorización explícita del usuario para el destino y la rama. Push completado a `https://github.com/ececs/suite-apps-blue-team.git`; preview local conservada, sin despliegue a producción.
