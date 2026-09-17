# Renombrado individual y recuperación de estado

## Requisitos
- Un renombrado individual solo muestra éxito si HTTP es correcto y el servidor confirma el ID solicitado; comprobar Exámenes y ATL sin activar IA.
- Mantener una copia `.bak` del estado anterior válido, con escritura atómica, para los JSON de Exámenes y ATL.
- Al detectar JSON corrupto, recuperar la copia válida, conservar evidencia del archivo corrupto y avisar de que puede faltar la última edición.
- Si no hay copia válida, responder con error explícito y bloquear escrituras sobre datos dañados; nunca simular una lista vacía.
- Primera ejecución sin archivos permite comenzar vacía. Distinguir fallo de permisos y corrupción.

## Plan y archivos
- `server.py`: lectura validada, respaldo y recuperación; avisos en cabecera `X-State-Warning` codificada con URL encoding; errores HTTP 503 JSON.
- `public/shared/state-feedback.js`: carga validada y avisos visibles compartidos.
- `public/app.js`, `public/atl.js`: conservar datos en pantalla ante error de carga.
- `public/index.html`, `public/style.css`: avisos junto a los listados y recursos versionados.
- Pruebas Node de renombrado individual y feedback; Python con archivos temporales de ambos módulos; preview con datos ficticios.

## Validación y límites
TDD RED/GREEN; ninguna prueba modifica documentos o estados reales. Mantener cambios previos aislados en Git. El respaldo es del estado previo válido y no sustituye un sistema de versiones de PDFs. Preview local, sin producción.
