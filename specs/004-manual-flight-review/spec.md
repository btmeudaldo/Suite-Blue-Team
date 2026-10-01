# Revisión manual por vuelo

## Necesidad

Quien revisa el informe de desviación necesita confirmar cada línea contra Private Radar, especialmente reservas canceladas y números repetidos.

## Comportamiento

- Cada línea del detalle y de la tabla de cancelaciones muestra una casilla «Verificado».
- La revisión se guarda con el registro del vuelo y sobrevive al cambio de fecha y a la reapertura del informe.
- Marcar una línea no altera el emparejamiento, el estado, las horas ni las estadísticas.
- Los informes existentes, que no tienen `verified`, se muestran sin marcar.
- Los identificadores de alumno, instructor y piloto de la programación se conservan cuando existen en el Excel.

## Validación

- El vuelo `4193682` del 26/09 se empareja con la programación de `JMART`, no con otra reserva duplicada.
- La reserva restante no consume el vuelo de JMART.
- Una reserva cancelada conserva los códigos de tripulación proporcionados por la programación.
- La casilla persiste al guardar el informe.
