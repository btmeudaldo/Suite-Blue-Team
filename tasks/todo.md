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

## Control de vuelos: emparejamiento y revisión manual (29/09/2026)

- [x] Reproducir emparejamiento duplicado del 26/09 y pérdida de códigos en cancelados.
- [x] Añadir pruebas RED para prioridad de tripulación/códigos y casilla manual.
- [x] Corregir la selección de reserva compatible y conservar identificadores del Excel.
- [x] Añadir «Verificado» en detalle y cancelaciones; guardar la marca por informe/fecha.
- [x] Validar visualmente el detalle y la persistencia en una preview aislada con datos sintéticos.
- [ ] Reprocesar los Excel reales cuando se facilite la exportación de programación del 26/09.

### Revisión técnica
- El texto de Private Radar confirma `4193682`, `JMART [DUAL]`, `MMORE [PIC]` para el 26/09.
- 10 pruebas focalizadas pasan; preview aislada confirma casilla por fila y persistencia al recargar.
- El texto de Private Radar aportado cubre vuelos realizados; falta el Excel o texto de programación del 26/09 para verificar la reserva duplicada y sus códigos de tripulación.
- `npm run lint:fix` y `npm run format` no están disponibles: el repositorio no contiene `package.json`.

## Navegación entre días de Control de vuelos (29/09/2026)

- [x] Añadir regresión para que las flechas respeten «Día anterior» y «Día siguiente».
- [x] Intercambiar acciones y límites de las flechas, y versionar los scripts para invalidar caché.
- [x] Validar navegación anterior/siguiente en la aplicación servida localmente.

### Revisión técnica
- RED: la prueba fallaba porque ◀ estaba enlazada a `navigateVuelosDay(1)` y ▶ a `navigateVuelosDay(-1)`.
- GREEN: 11 pruebas focalizadas pasan; `node --check` para ambos scripts y `git diff --check` correctos.
- UI: ▶ avanzó de 26/09 a 27/09 y ◀ volvió a 26/09. La pantalla del 27/09 muestra 4195644 como volado (02:40) y una reserva cancelada separada.
- Caché: `index.html` solicita `vuelos.js` y `nav.js` con `?v=20260929-vuelos-day-nav-1`.
- `npm run lint:fix` y `npm run format` no disponibles porque no existe `package.json` en la raíz.

## Etiquetas de columnas de Control de vuelos (29/09/2026)

- [x] Añadir regresión para las etiquetas solicitadas.
- [x] Cambiar las columnas de duración a «Bloque» y el rol a «Instructor/PIC» en tablas y exportaciones.
- [x] Invalidar caché del script y verificar la tabla en la app local.

### Revisión técnica
- RED: la prueba no encontraba las etiquetas «Instructor/PIC» y «Bloque» en las columnas.
- GREEN: 12 pruebas focalizadas pasan; el detalle, cancelaciones y exportaciones usan los nuevos títulos.

## Arranque en la fecha más reciente y comprobación de exportaciones (29/09/2026)

- [x] Añadir regresión que reproduce la selección del primer informe en vez del más reciente con registros.
- [x] Seleccionar al iniciar por fecha calendario máxima entre informes con datos.
- [x] Probar las descargas Excel y PDF sobre el informe más reciente.

### Revisión técnica
- RED: la prueba de inicio cargaba 21-08-2026 aunque existían registros posteriores hasta 28-09-2026.
- GREEN: al recargar, la app abre 28-09-2026 con 8 vuelos. La regresión completa pasa (14 pruebas).
- Excel y PDF se generaron desde los botones para 28-09-2026 y se comprobaron como archivos válidos en Descargas.
- Los tres scripts de librería reciben HTTP 200; el navegador sirve el script de vuelos con el nuevo parámetro de versión.
- La app da ahora confirmación visible con el nombre de archivo tras cada exportación y muestra errores de guardado mediante aviso.

## Desviación absoluta diaria (29/09/2026)

- [x] Añadir prueba RED para que desviaciones de signo opuesto no se cancelen en la desviación total.
- [x] Mostrar la suma absoluta como desviación total y conservar el balance neto como dato secundario.
- [x] Incluir ambas métricas en PDF y Excel e invalidar caché.
- [x] Ejecutar pruebas focalizadas, sintaxis y comprobaciones de formato disponibles.

### Revisión técnica
- En los ocho vuelos guardados del 28/09, las desviaciones distintas de cero son −5, −5 y +5 min: suma absoluta 15 min, balance neto −5 min.
- RED: el caso de prueba fallaba porque no existía `totalAbsoluteDeviationMinutes`.
- GREEN: 15 pruebas pasan; `node --check public/vuelos.js` pasa. La UI y los informes muestran desviación total y balance neto; Excel contiene filas separadas para ambos valores.
- El script de vuelos quedó versionado como `20260929-vuelos-total-deviation-1` para evitar caché.
- `npm run lint:fix` y `npm run format` no están disponibles porque no existe `package.json` en la raíz del repositorio.

## Guardado y selección del PDF de vuelos (29/09/2026)

- [x] Añadir pruebas RED para el envío del PDF al servidor local y la selección del archivo guardado.
- [x] Guardar el PDF en Descargas mediante el servidor y abrir el Explorador seleccionando ese archivo.
- [x] Mostrar el resultado y los errores de guardado en la interfaz.
- [x] Ejecutar pruebas JavaScript y Python y comprobar sintaxis.
- [x] Reiniciar el servidor local y confirmar que la ruta nueva está activa.

### Revisión técnica
- RED: la prueba falló porque el exportador solo llamaba a `doc.save(filename)` y el servidor no tenía una ruta para persistir el PDF.
- GREEN: el navegador envía los bytes PDF al endpoint local; el servidor valida y escribe de forma atómica en `Downloads` (o `Descargas`) y ejecuta `explorer.exe /select,...`.
- 16 pruebas JavaScript y 4 pruebas Python del flujo de PDF pasan; `node --check public/vuelos.js` y `python -m py_compile server.py` pasan.
- El HTML solicita `vuelos.js` con versión `20260929-vuelos-pdf-desktop-save-1`.
- El proceso Python anterior devolvía 404; se reinició el backend local y una petición de control inválida recibió 400 JSON (la ruta nueva responde y valida el contenido). La escritura y selección del archivo se verificaron en pruebas del handler aislado.
- Se volvió a abrir `lanzador.py`; la suite y el servidor local responden en `127.0.0.1:8000`.

### Revisión de respuesta HTML 404
- [x] Añadir una regresión para respuestas HTML del servidor anterior.
- [x] Mostrar un mensaje claro de que hay que reiniciar la aplicación si el servidor aún no ofrece la ruta PDF.
- [x] Reiniciar el servidor local y comprobar la ruta activa.

## Respaldo ante permisos denegados al guardar PDF (29/09/2026)

- [x] Reproducir errno 13 al escribir en Descargas y añadir prueba RED de respaldo.
- [x] Guardar en `Informes_Vuelos` dentro de la app cuando Windows deniegue Descargas.
- [x] Informar la ubicación final y abrir el Explorador sobre el archivo guardado.
- [x] Reiniciar el servidor con el cambio actual y probar el endpoint.

### Revisión técnica
- RED: la prueba reprodujo `PermissionError(13)` al reemplazar un PDF en `Downloads`.
- GREEN: el guardado reintenta en `Informes_Vuelos` dentro del workspace; la escritura se probó con el entorno actual y se retiró el archivo de prueba.
- La ruta HTTP responde 400 JSON ante datos que no son PDF, y sirve el cliente actualizado como `vuelos-pdf-desktop-save-3`.
- 46 pruebas JavaScript y 29 pruebas Python pasan; las comprobaciones de sintaxis también pasan.

## Separación de columnas Alumno / Instructor y simplificación de imagen (30/09/2026)

- [x] Quitar sufijos `(DUAL)` y `/PIC` de las columnas de tablas, modal de edición y exportación PDF/Excel.
- [x] Separar la asignación estricta de Alumno para alumnos e Instructor para instructores (sin mezclar PIC con instructor en vuelos de alquiler/time building).
- [x] Soportar el caso en reservas donde el instructor viaja como pasajero y el alumno como piloto/PIC.
- [x] En la imagen de diferencias para email, dividir la columna de tripulantes en 2 columnas separadas: «Instructor» y «Alumno».
- [x] Fusión de celdas (`rowspan`) para vuelos vinculados en la tabla principal de la app: agrupa contiguamente los tramos vinculados y fusiona las celdas de «Programado», «Desviación» y «Estado», mostrando el tiempo unificado del bloque y los tramos individuales de forma limpia como en la imagen.
- [x] Unificar los 3 botones de exportación en un solo botón «Exportar ▼» con menú desplegable para elegir entre Excel (.xlsx), PDF Diario (.pdf) o Imagen para Email (.png).
- [x] Crear y guardar `instructores.json` con el catálogo oficial de 23 instructores y tripulantes (código, nombre y rol, sin emails) e integrarlo en `public/vuelos.js` con autocompletado bidireccional código ↔ nombre en el modal de edición/adición de vuelos y enriquecimiento automático en la importación de Excel.
- [x] Agregar pruebas automatizadas en `tests/vuelos-matching.test.cjs` e invalidar caché en `index.html`.

