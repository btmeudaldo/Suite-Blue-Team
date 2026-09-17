# Guardado y renombrado seguros para uso local

## Alcance aprobado
1. Guardar de forma independiente las ediciones de distintas tarjetas en Exámenes y ATL, con estado visible y sin respuestas antiguas que deshagan una edición más reciente.
2. Detectar destinos ocupados sin sobrescribir documentos de otros registros ni archivos desconocidos. Informar del conflicto para corregir el nombre y reintentar.
3. Conservar la copia anterior si falta el original o falla la nueva copia. Retirar la anterior únicamente después de verificar la copia nueva y persistir su referencia.

## Plan
- `public/shared/item-autosave.js`: cola de guardado por ID, espera de pendientes y estados; compartida porque hay dos módulos consumidores.
- `public/app.js`, `public/atl.js`: integrar la cola, esperar guardados antes del renombrado y presentar conflictos que devuelve el servidor.
- `public/index.html`: cargar primero el recurso compartido y versionar scripts modificados.
- `server.py`: sustituir copias destructivas en endpoints de Exámenes y ATL por operaciones verificadas y resultados por archivo.
- Pruebas Node para varias tarjetas, ediciones consecutivas, respuestas lentas y errores; pruebas Python con temporales para colisiones y fallos de copia.
- Preview local con datos ficticios, sin modificar PDFs reales. Mantener IA inactiva.

## Límites
Sin cambio a base de datos, cuentas, red, ni recuperación general de JSON. Mantener cambios previos del usuario fuera de los commits propios. No desplegar producción.
