# Corrección de cabeceras y renombrado de exámenes

## Requisitos
- Los campos, cabeceras y acciones deben permanecer dentro de la pantalla a 360, 768, 1366 y 1920 píxeles, con nombres y asignaturas largos.
- «Renombrar Listos» debe incluir exámenes completados manualmente y excluir incompletos y previamente renombrados.
- Mantener la validación de alumno oficial o confirmado del renombrado individual.
- Un clic debe ejecutar una sola operación; el resultado debe reflejar únicamente los IDs confirmados por el servidor y mostrar los errores.
- No modificar documentos reales durante las pruebas ni publicar producción.

## Plan técnico
- `public/style.css`: columnas adaptables, límites de tamaño y ajuste de acciones.
- `public/app.js`: selección por datos completos, confirmación de alumnos, protección frente a doble ejecución y respuesta parcial.
- `public/index.html`: un solo controlador de clic y versiones de recursos para invalidar caché.
- `tests/exam-batch.test.cjs`: regresiones unitarias con Node y entorno aislado.
- `tests/exam-responsive.cjs`: medición en navegador con datos ficticios y captura de preview.

## Validación
Ejecutar RED antes de producción, GREEN después y comprobar recursos servidos en preview local. El proyecto real es Python y JavaScript sin package.json, TypeScript ni configuración de hosting Firebase; no asumir herramientas del repositorio descritas en instrucciones que no existen en disco.
