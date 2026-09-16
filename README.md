# ✈️ Blue Team Operations Suite

Suite web modular de gestión documental para escuelas de aviación (Blue Team Flight School). Permite la división automática, reconocimiento inteligente y renombrado estandarizado tanto de **Exámenes ATPL** como de **Partes de Vuelo (ATLs de Flota y Simuladores FSTD)**.

---

## 🌟 Módulos Disponibles

### 1. 🏠 Hub Principal de Navegación
* Selector central para alternar al instante entre utilidades.
* Indicadores de estado en tiempo real (hojas pendientes, listas y renombradas).
* Barra superior global unificada con memoria de sesión activa.

### 2. ✈️ Gestor y Renombrador de ATLs (100% Local)
* **División Automática Hoja por Hoja**: Carga masiva de escaneos multipágina de partes de vuelo (ej: `21-07.13-09.pdf`).
* **Extracción Local Directa**: Detección automática de matrículas (`ES-3A-099`, `ES-1A-099`, `EC-...`) y números de log (`LOG0320`) mediante expresiones regulares y PyMuPDF.
* **Visor de Cabecera en HD**: Recorte nítido de la parte superior del parte donde figura la fecha manuscrita y los datos principales, ampliable a pantalla completa.
* **Entrada Manual Ultrarrápida**:
  - `Enter` en el campo de fecha guarda el registro y salta automáticamente el foco al campo fecha de la siguiente hoja con desplazamiento suave.
  - Botón `⬇️ Copiar hacia abajo`: replica la fecha introducida a todas las hojas siguientes de la jornada.
* **🔢 Auto-incrementar Números de Log**: Asigna números correlativos consecutivos (ej: `0319`, `0320`, `0321`...) a todas las hojas en 1 segundo.
* **📅 y ✈️ Asignación Masiva**: Herramientas para fijar fecha o aeronave a todo el lote.
* **Formato Estándar de Salida**: `[FECHA] [SIMULADOR/AVION] [LOGXXXX].pdf` (ej: `260722 ES-3A-099 LOG0320.pdf`) guardados en la carpeta `ATL_Renombrados/`.

### 3. 📋 Gestor y Renombrador de Exámenes ATPL
* Carga y división de exámenes tipo test multipágina.
* Visor de cabeceras recortadas para lectura visual de alumnos y examen.
* Autocompletado inteligente con lista de alumnos convocados y asignación de materias oficiales EASA.
* Clasificación por subcarpetas de sesiones consecutivas (`Examenes_Renombrados/1/`, etc.).

---

## 🛠️ Tecnologías

* **Backend**: Python 3 (servidor HTTP nativo, `pymupdf` / `fitz`, `pillow`).
* **Frontend**: HTML5, Vanilla JavaScript, CSS3 moderno con variables de diseño, glassmorphism y dark mode.

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
