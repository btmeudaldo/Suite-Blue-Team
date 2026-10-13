# Estado del Desarrollo: Informe PDF de Ítems Suspendidos (Blue Team Flight Academy)

**Fecha:** 09 de Octubre de 2026  
**Módulo:** Control de Ítems Suspendidos (`public/items_suspendidos.js`, `public/index.html`)

---

## 1. Lo que hemos implementado y completado

### A. Informe PDF Global Bien Organizado (`descargarPDFInformeCFI`)
1. **Identidad Corporativa y Cabecera Oficial**:
   - Cabecera con colores corporativos Blue Team (`#0f172a` Navy oscuro, acento `#0284c7` Azul Eléctrico).
   - Metadatos oficiales: Fecha de emisión, total de alumnos afectados, total de maniobras pendientes.
   - Franja de contexto normativo ATO con filtros aplicados y desglose estadístico (*Suspendidos con nota ≤ 2.0*, *Ítems abiertos N/A*, *Con vuelo posterior* y *Auditados*).

2. **Tabla de Resumen Ejecutivo Inicial (Índice de Alumnos)**:
   - Se añadió una tabla inicial consolidada que resume alumno por alumno:
     - Posición (`#`), Nombre, Código Private Radar, Cursos asociados.
     - Conteo de suspendidos, abiertos, con vuelo posterior y total pendiente.
     - Estado de auditoría del expediente (*Auditado* / *Por auditar*).
     - Fila de totales generales al pie de la tabla con resaltado visual.
   - Opcional: el usuario puede activarla o desactivarla desde el selector del modal.

3. **Estructura Detallada Agrupada por Alumno (Sin celdas vacías ni roturas)**:
   - En lugar de una tabla plana con nombres en blanco en saltos de página, ahora cada alumno cuenta con su propia **tarjeta/banner distintivo**:
     `ALUMNO: [Nombre] | CÓD. PR: [Código] | CURSO(S): [Cursos] | PENDIENTES: [N] | EXPEDIENTE: [AUDITADO / POR AUDITAR]`
   - Debajo de cada alumno, su tabla específica de maniobras con:
     - `Curso`
     - `Maniobra / Ejercicio` (con etiqueta `[MANUAL]` si fue añadido a mano)
     - `Vuelo / Fecha` original
     - `Misión / Lección` (ej. `MEP02`, `IR30-SIM26`)
     - `Nota` (con código de color: rojo suave para ≤ 2.0, ámbar para `N/A`)
     - `Situación / Diagnóstico ATO`

4. **Soporte de Orientación y Filtros**:
   - Selector en el modal para elegir entre:
     - **Vertical (A4 Portrait)**: Recomendado, compacto y elegante.
     - **Horizontal (A4 Landscape)**: Extendido, con máximo ancho para descripciones largas.
   - Filtros por Curso (Todos, MEP, IR, CPL, etc.) y por Expediente (Todos, Solo Auditados, Solo por Auditar).

5. **Sanitización de Fuentes y Cero Caracteres Rotos**:
   - Función `cleanTextForPdf()` que reemplaza emojis (`🟡`, `🔴`, `💬`, `↳`, `✓`) por etiquetas tipográficas estándar (`[ABIERTO]`, `[SUSPENDIDO]`, `[V. POSTERIOR]`, `->`), evitando caracteres `?` o cajas vacías en fuentes Helvetica estándar de jsPDF.

6. **Encabezados Repetidos y Paginación Perfecta**:
   - Encabezado sutil en páginas posteriores ($p > 1$).
   - Pie de página oficial en todas las páginas con numeración exacta (`Página X de Y`) y aviso de confidencialidad.

---

### B. Informe Individual por Alumno (`descargarPDFAlumno`)
- Se integró la función `descargarPDFInformeAlumno(codigoAlumno)` accesible desde las **Acciones Rápidas** de la tarjeta de cada alumno (`📄 Descargar PDF Alumno`).
- Genera un dossier de 1-2 páginas exclusivo para ese alumno con:
  - Ficha del estudiante.
  - Tabla de maniobras pendientes a subsanar.
  - **Bloque de validación con firmas oficiales**:
    - *Firma CFI / Jefatura de Vuelos*
    - *Firma Instructor Responsable*
    - *Enterado Alumno*

---

### C. Mejoras en la Interfaz de Usuario
- **Botón principal en la barra superior**: Cambiado a `📄 Informe PDF / CFI` con tooltip explicativo.
- **Modal de generación**: Título actualizado a *Informe Oficial de Alumnos con Ítems Suspendidos (PDF)* con selector de orientación vertical/horizontal, filtro de expedientes por auditar y checkbox para incluir/excluir la tabla resumen.
- **Botón en tarjetas individuales**: `📄 Descargar PDF Alumno` dentro del desplegable de cada alumno.
- **Descarga Nativa en Escritorio**: Integración con el backend (`/api/items_suspendidos/guardar_pdf`) para guardar en `Descargas` y seleccionar en el Explorador de Windows (evitando la limitación de descargas blob en WebView2).
- **Ajuste de Columnas y Desborde**: Se rebalancearon los anchos de columna (la columna de Situación/Diagnóstico se amplió de 148-167 pt a 211 pt en vertical y 370 pt en horizontal, con padding vertical de 3.5 pt), sintetizando el texto a `[SUSPENDIDO] Calificación no apta (<= 2.0). Pendiente reprogramar.` y reemplazando `≤` por `<=`.

---

## 2. Archivos Modificados

1. `public/index.html`:
   - Bumping de versión de caché a `?v=20261013-pdf-cell-fix`.

2. `public/items_suspendidos.js`:
   - Añadida función `guardarPDFItemsSuspendidos(doc, filename)`.
   - Ajustados anchos de columna en `descargarPDFInformeCFI()` y `descargarPDFInformeAlumno()`.
   - Ajustada redacción y sanitización tipográfica en `cleanTextForPdf()` para evitar desbordes.

3. `server.py`:
   - Añadida ruta `/api/items_suspendidos/guardar_pdf` con guardado automático en `Descargas` y revelación en Explorador.

4. `GEMINI.md`:
   - Memoria persistente de Antigravity creada y activada para este repositorio.

5. `tests/test_items_pdf.cjs`:
   - Pruebas unitarias actualizadas y validadas al 100%.
