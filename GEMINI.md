# Blue Team Operations Suite — Memoria Persistente de Antigravity (GEMINI.md)

Este archivo actúa como la **memoria persistente y base de directrices del proyecto** para Antigravity. Se carga automáticamente en cada sesión de trabajo con este repositorio.

---

## 1. Visión General del Proyecto
**Blue Team Flight Academy (ATO)** — Suite integral de aplicaciones de escritorio y navegador para la gestión operativa, académica y técnica de la escuela de aviación.

### Módulos Principales:
1. **Control de Ítems Suspendidos (`public/items_suspendidos.js`, `items_suspendidos_service.py`)**:
   - Detección y auditoría de maniobras de vuelo no superadas (nota ≤ 2.0 o abiertas en N/A) a partir de los registros de vuelo de los alumnos.
   - Generación de informes oficiales para Jefatura de Vuelos (CFI) y dosieres individuales para alumnos en formato PDF con jsPDF y AutoTable.
   - Control de maniobras reprogramadas, subsanadas y vuelos posteriores.
2. **Auditoría de Vuelos y Desviación de Bloque (`public/vuelos.js`, `auditor_service.py`)**:
   - Comparación de vuelos programados (Private Radar) vs. vuelos ejecutados (ATL).
   - Cálculo de desvíos en horas de bloque, cancelaciones, retrasos y conciliación horaria.
   - Informes diarios en PDF y Excel.
3. **Gestión y Renumeración de ATLs (`public/atl.js`, `verificar_atl.py`, `renumerar_atl.py`)**:
   - Digitalización, corte, OCR/calibración y renumeración secuencial de hojas de libro de vuelo de aeronaves (ATL).
4. **Exámenes de Alumnos (`public/app.js`)**:
   - División de escaneos de exámenes y asignación a expedientes de alumnos por materia EASA.

---

## 2. Arquitectura Técnica y Entorno

- **Runtime Backend**: Python 3.12+ utilizando servidor HTTP nativo (`server.py`) sin frameworks pesados, con persistencia atómica en ficheros JSON.
- **Entorno de Escritorio Nativo**: `lanzador.py` ejecuta la aplicación como ventana de escritorio nativa mediante `pywebview` sobre Microsoft Edge WebView2 (`iniciar_app.bat`).
- **Frontend**: Vanilla JavaScript modular (sin bundler/Webpack/Vite), HTML5 y CSS nativo con diseño oscuro y modo claro temático bajo `/public/`.
- **Librerías Offline**:
  - `jspdf.umd.min.js` + `jspdf.plugin.autotable.min.js` en `/public/shared/` para generación de PDFs.
  - `xlsx.full.min.js` para manipulación y exportación Excel.

---

## 3. Reglas Críticas de Implementación

### A. Descarga y Exportación de Archivos (PDF / Excel / Imágenes)
> [!IMPORTANT]
> **Microsoft Edge WebView2 (PyWebView) no procesa descargas de enlaces `blob:` activados por JavaScript (`<a download>`) por defecto.**
> 
> Cualquier funcionalidad de exportación (PDF, Excel o Imagen) **DEBE**:
> 1. Enviar los bytes generados (`doc.output('arraybuffer')` o buffer binario) al backend mediante un endpoint `POST` (`/api/items_suspendidos/guardar_pdf`, `/api/vuelos/guardar_pdf`, etc.).
> 2. El backend guardará el archivo directamente en la carpeta de usuario `Downloads` / `Descargas` y lo seleccionará en el Explorador de Windows mediante `reveal_file_in_explorer(path)`.
> 3. Disponer de `doc.save(filename)` únicamente como fallback de seguridad para ejecuciones en navegadores web tradicionales.

### B. Generación de PDFs con jsPDF
- **Sanitización de Caracteres**: jsPDF en fuentes estándar Helvetica solo soporta codificación WinAnsi (Latin-1). Cualquier emoji o caracter tipográfico especial (`🟡`, `🔴`, `💬`, `✓`, `↳`, guiones largos, comillas tipográficas) debe ser sanitizado previamente con `cleanTextForPdf()`.
- **Diseño Corporativo**:
  - Cabecera en Navy oscuro `#0f172a`.
  - Acentos en azul `#0284c7` y cian `#38bdf8`.
  - Paginación dinámica `Página X de Y` con pie corporativo oficial.

### C. Persistencia y Estado
- Los archivos JSON de estado (`estado_items_corregidos.json`, `items_suspendidos_manuales.json`, `estado_vuelos.json`, etc.) deben modificarse mediante escrituras atómicas o copias temporales (`.tmp`) para evitar corrupción ante cierres inesperados.
- Cada cambio en ficheros JS/CSS del frontend debe reflejarse con una actualización de la variable de versión de caché en `index.html` (e.g. `?v=AAAAMMDD-...`).

---

## 4. Estándares ATO y Glosario
- **CFI**: Chief Flying Instructor (Jefatura de Instrucción de Vuelo).
- **ATO**: Approved Training Organisation (Organización de Formación Aprobada).
- **PR**: Private Radar (software de gestión de programación y vuelos).
- **ATL**: Aircraft Technical Log (Libro técnico de vuelo de la aeronave).
- **Calificaciones**: 1.0 a 5.0 (≤ 2.0 = no apto / suspendido, N/A = ítem abierto o no realizado).
