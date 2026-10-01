# Reglas preventivas

- El flujo actual de Exámenes es manual. No exigir análisis por IA para considerar un examen listo ni activar integraciones de IA al corregir este flujo; conservar su código inactivo hasta petición expresa.

- Al emparejar una reserva con un número de vuelo repetido, comprobar fecha y compatibilidad de la tripulación antes de consumir el registro volado. Si hay varias reservas compatibles, preferir la que identifica más miembros de tripulación.
- Cuando falte el vuelo asociado a una reserva, conservar los códigos de alumno, instructor y piloto extraídos del Excel de programación; no depender del registro de horas voladas para mostrarlos.
- Para una revisión manual en una tabla que se vuelve a renderizar, guardar la confirmación del registro antes de actualizar la vista y comprobar que persiste al volver a cargar el informe.
- En controles de navegación por índice, validar juntos icono, etiqueta, delta y condición `disabled`; invertir solo el manejador deja el límite bloqueado en el extremo incorrecto.
- En agregados de desviación, sumar por separado los valores absolutos y el balance con signo; los adelantos y retrasos se compensan en el neto y ocultan la variación total.
- En la app de escritorio, no dar por guardado un archivo solo porque el navegador ejecute una descarga; guardar el contenido generado en el servidor local y revelar el archivo en el Explorador para confirmar dónde quedó.
- Antes de parsear una respuesta local como JSON, comprobar `Content-Type` y convertir un 404 HTML en una indicación concreta de reinicio de la app.
- Si el entorno de escritorio deniega escritura en Descargas (`PermissionError`/errno 13), conservar el PDF en una carpeta escribible de la app y revelar esa copia; un error de carpeta preferida no debe descartar el documento.
