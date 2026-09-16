# Estado del Proyecto: Utilidad de Renumeración de Secuencias ATL (Word)

**Fecha:** 15 de Septiembre de 2026  
**Módulo:** Secuencias ATL / Talonarios de Vuelo Word (.docx)  
**Ubicación:** `Sequencia ATL/`

---

## 📌 ¿Qué se ha implementado hoy?

### 1. Motor de Renumeración (`renumerar_atl.py`)
- **Funcionamiento 100% nativo:** Utiliza exclusivamente librerías estándar de Python (`zipfile` y `xml.etree.ElementTree`), sin requerir librerías externas.
- **Detección inteligente de páginas y prefijos:**
  - Localiza con precisión los 100 párrafos de cabecera de LOG en cada documento.
  - Detecta automáticamente el prefijo asignado a cada aeronave:
    - `EC-NNA` ➔ `LOG B-`
    - `EC-NNX` ➔ `LOG C-`
    - `EC-OKC` ➔ `LOG E-`
    - `EC-OKM` ➔ `LOG F-`
    - `EC-OMS` ➔ `LOG G-`
    - `EC-OXV` ➔ `LOG H-`
    - `EC-OXT` ➔ `LOG I-`
- **Reemplazo limpio y preservación de formato:**
  - Sustituye los antiguos campos dinámicos inestables de Word (`PAGE`, `SEQ`) por texto directo correlativo (ej: `LOG H-0001` a `LOG H-0100`).
  - Conserva exactamente la tipografía (`Asap`), negrita y centrado de la cabecera.
- **Protección contra bloqueos de Microsoft Word:**
  - Si el usuario tiene abierto el archivo en Microsoft Word al momento de renumerar (causa de `WinError 5 / PermissionError`), el sistema lo detecta y lo guarda automáticamente como `..._renumerado.docx` con un aviso informativo en pantalla, evitando bloqueos o errores en la app.
  - Al cerrar Word, se puede sobrescribir directamente el archivo original.
  - Crea copias de seguridad automáticas `.bak`.

### 2. Endpoints Backend en `server.py`
- `GET /api/secuencia_atl/listar`: Devuelve los 7 archivos con su aeronave, total de páginas (100), prefijo detectado y muestra inicial.
- `POST /api/secuencia_atl/renumerar`: Procesa un archivo individual (o `TODOS` en lote) desde el número inicial elegido (por defecto `1` o `0001`) y con la cantidad de dígitos deseada.
- `GET /api/secuencia_atl/descargar?archivo=...`: Permite descargar el `.docx` modificado directamente desde el navegador.
- `POST /api/secuencia_atl/abrir_carpeta`: Abre la carpeta `Sequencia ATL` en el Explorador de archivos de Windows.

### 3. Interfaz Web Integrada (Blue Team Operations Suite)
- **Barra de navegación:** Nuevo botón `🔢 Secuencias ATL (7)`.
- **Hub Principal:** Tarjeta dedicada a las Secuencias de Talonarios ATL.
- **Panel de control de Secuencias (`public/secuencia.js` + `public/index.html` + `public/style.css`):**
  - Selector desplegable de talonario Word.
  - Campo **"Número Inicial"** (permite empezar en 1, 101, 1101, etc.).
  - Campo **"Prefijo"** editable (autocompletado según el avión, ej: `LOG H-`).
  - **Previsualización en vivo:** Muestra en tiempo real cómo quedará la secuencia (`Pág 1: LOG H-0001` ... `Pág 100: LOG H-0100`).
  - Botón **"🚀 Renumerar Talonario Ahora"**.
  - Catálogo visual con tarjetas de los 7 aviones de la flota para seleccionar con un clic.
  - Botón **"📂 Abrir Carpeta"** y **"⚡ Renumerar Toda la Flota (Lote)"**.
  - Modal con resumen del resultado, enlace de descarga y avisos de archivo en uso si Word estuviera abierto.

---

## 🚀 ¿Por dónde retomamos mañana?

1. **Prueba final con el usuario en la app web:**
   - Iniciar el servidor: `python server.py 8000`
   - Abrir `http://localhost:8000` y entrar a **"Secuencias ATL"**.
   - Probar la renumeración de `OXV` (o cualquier otro) desde el número que se desee (ej. `0001` o `1101`).
   - *(Recordatorio)*: Asegurarse de tener el documento cerrado en Microsoft Word para que se sobrescriba directamente el original (o si está abierto, verificar que se genera la copia `_renumerado.docx`).
2. **Revisión visual del documento en Word:**
   - Abrir el `.docx` generado para verificar en Word que las 100 páginas muestran la numeración exacta correlativa y sin desconfiguraciones.
3. **Procesar el resto de los aviones si se desea:**
   - Renumerar uno a uno los talonarios restantes (`NNA`, `NNX`, `OKC`, `OKM`, `OMS`, `OXT`) o utilizar el botón de lote según el número que corresponda a cada uno.
