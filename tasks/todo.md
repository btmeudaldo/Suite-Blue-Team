# Cabeceras y Renombrar Listos

## Puntos 4 y 5: confirmación y recuperación

- [x] Revisar renombrado individual y definir recuperación de JSON.
- [x] Verificar punto 4 y reproducir RED de corrupción/avisos.
- [x] Implementar respaldo, recuperación y errores explícitos.
- [x] Verificar pruebas, preview y recursos versionados.
- [x] Commit aislado y push (`7f380b9`, rama `codex/fix-exam-responsive-batch`).

### Revisión de puntos 4 y 5 (17/09/2026)

- Punto 4 ya corregido en la fase anterior: nuevas pruebas confirman ambos módulos con respuesta vacía, ID distinto, fallo HTTP y éxito confirmado. No se duplicó la implementación.
- Punto 5: respaldo `.bak` del estado anterior válido, restauración automática y conservación del JSON dañado como `.corrupt-UUID`. Estos archivos locales se excluyen de Git.
- Corrupción sin respaldo válido devuelve HTTP 503 JSON y bloquea escrituras y operaciones destructivas; los datos ya cargados en pantalla se conservan. Errores de permisos se distinguen de corrupción.
- 29 pruebas Node y 21 Python correctas en workspace y contenido aislado para commit. Sintaxis JavaScript y compilación Python correctas. Sin acceso a estados ni PDFs reales durante pruebas.
- Preview local verifica aviso de recuperación, aviso de bloqueo y conservación de tarjetas. Evidencias: `output/playwright/preview_screenshot-recovery-exams.png` y `preview_screenshot-recovery-blocked.png`.
- Verificados por contenido los scripts versionados con `20260917-recovery`. CSS versionado también. IA continúa inactiva.
- `npm run lint:fix` y `npm run format` intentados, no disponibles por ausencia de `package.json`.
- Recuperar el respaldo puede retroceder la última edición; la interfaz lo advierte. Reiniciar la app carga el backend actualizado.

## Mejora actual: guardado seguro

- [x] Leer código y definir alcance de los tres problemas autorizados.
- [x] RED: autoguardado por tarjeta, colisiones y copia fallida.
- [x] GREEN: cola de guardado y operaciones seguras en Exámenes y ATL.
- [x] Integrar mensajes de error y verificar preview con datos ficticios.
- [x] Commit aislado, push y registro de resultados (`060bdde`, rama `codex/fix-exam-responsive-batch`).

### Revisión de guardado seguro (17/09/2026)

- 15 pruebas Node y 10 pruebas Python correctas; Python cubre ambos módulos mediante subcasos. Se ejecutaron también sobre la copia aislada preparada para commit.
- RED reproducido antes de implementar: pérdida de la primera tarjeta, conflictos de destino, copia fallida, guardados pendientes y edición durante una petición lenta.
- Cola por tarjeta con snapshots, peticiones ordenadas, estados visibles y espera del guardado antes de renombrar. Los errores del servidor se muestran en pantalla.
- Copia temporal verificada, detección de destinos ocupados y persistencia atómica del estado antes de retirar la copia antigua. Rollback si falla la persistencia.
- Preview local: cuatro tarjetas ficticias guardadas correctamente (dos Exámenes y dos ATL), capturas `output/playwright/preview_screenshot-safe-exams.png` y `preview_screenshot-safe-atl.png`.
- Tres recursos JavaScript versionados con `20260917-safe-save`, descargados correctamente por la preview. IA inactiva; no se tocaron PDFs reales.
- Comprobaciones de sintaxis JavaScript y compilación Python correctas. `npm run lint:fix` y `npm run format` no disponibles porque falta `package.json`.
- Límite: no hay una transacción conjunta PDF/JSON frente a apagado abrupto, aunque la fuente se conserva y la copia anterior se retira después de persistir.
- Pendiente fuera de estos tres arreglos: coordinar borrado de tarjetas con autoguardados en curso; revisar por separado antes de ampliar operaciones de eliminación.

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
