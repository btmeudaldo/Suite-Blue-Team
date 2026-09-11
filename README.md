# ✈️ Renombrador Inteligente de Exámenes ATPL / Aviación

Sistema web inteligente para la división automática, reconocimiento por visión con IA (Google Gemini) y renombrado estandarizado de exámenes de aviación EASA / ATPL.

---

## 🌟 Características Principales

1. **📥 Asistente de Carga y División de Escaneos**:
   * Carga masiva de PDFs escaneados multipágina mediante arrastrar y soltar (*drag & drop*).
   * **Extracción ultrarrápida de la cabecera de la 1ª página** con PyMuPDF para lectura visual de la materia y número de examen.
   * Detección automática de asignaturas EASA y número de examen a partir del nombre del archivo (ej: `AIRLAW260318.pdf` ➔ `ALW (010)`, `260907_FPM_EX9.pdf` ➔ `FPM (033)` + Examen `9`).
   * Asignación en bloque de materia, código EASA y número de examen para todas las páginas generadas de ese archivo.
   * Detección de fecha en formato `YYMMDD`.

2. **📁 Separación por Sesiones Consecutivas**:
   * Cada lote de escaneos se clasifica automáticamente en subcarpetas consecutivas (`Examenes_Renombrados/1/`, `Examenes_Renombrados/2/`, etc.).
   * Filtro por sesión en la barra de herramientas para trabajar por tandas.

3. **✨ Reconocimiento Inteligente con IA (Gemini Vision)**:
   * Lectura de la cabecera recortada para identificar nombres manuscritos de alumnos.
   * Autocompletado y coincidencia inteligente con la lista de alumnos activos convocados.
   * Nombres 100% en **MAYÚSCULAS** y **sin tildes** para compatibilidad con sistemas de ficheros.

4. **🔍 Visor y Ampliación de Cabeceras**:
   * Previsualización amplia de la cabecera de cada examen.
   * Visor de zoom a pantalla completa con navegación por teclado (`Escape` para cerrar).

5. **⚡ Procesamiento en Bloque o Individual**:
   * Analiza con IA de uno en uno o en lotes configurables (5, 10, etc.).
   * Renombrado instantáneo con la tecla `Enter` y avance automático al siguiente examen.

---

## 🛠️ Tecnologías

* **Backend**: Python 3 (servidor HTTP nativo, `pymupdf` / `fitz`, `google-genai`, `pillow`).
* **Frontend**: HTML5, Vanilla JavaScript, CSS3 moderno con variables de diseño, glassmorphism y dark mode.
* **IA**: Google Gemini Vision (`gemini-2.5-flash`).

---

## 🚀 Instalación y Puesta en Marcha

### 1. Clonar el repositorio
```bash
git clone <URL_DEL_REPOSITORIO>
cd "Renombrado de examenes"
```

### 2. Instalar dependencias
```bash
pip install -r requirements.txt
```

### 3. Configurar API Key de Gemini
Copia el archivo de ejemplo y añade tu clave:
```bash
cp .env.example .env
```
Edita `.env` y coloca tu `GEMINI_API_KEY`:
```env
GEMINI_API_KEY=tu_api_key_aqui
```

### 4. Iniciar el servidor
```bash
python server.py 8000
```

Abre tu navegador en:
```
http://localhost:8000
```
