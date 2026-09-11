# 🖥️ Guía: Cómo convertir el Renombrador de Exámenes en una App de Escritorio (.exe)

Esta guía explica paso a paso cómo empaquetar la aplicación actual en una **app nativa de Windows (.exe)** utilizando **`pywebview`** y **`PyInstaller`**, sin perder nada del diseño actual ni tener que reescribir código.

---

## 📋 ¿Por qué este método?

* **Ventana nativa**: Se ejecuta en una ventana propia de Windows (sin barra de navegador, sin URL, con su propio icono).
* **Ligero**: Utiliza el motor nativo **Microsoft Edge WebView2** preinstalado en Windows 10/11. Pesa ~40 MB (frente a los más de 250 MB de Electron).
* **100% compatible**: Tu servidor Python (`PyMuPDF`, `google-genai`, etc.) corre en segundo plano dentro del mismo ejecutable.

---

## ⚙️ Paso 1: Instalar las dependencias necesarias

Abre tu terminal en la carpeta del proyecto y ejecuta:

```bash
pip install pywebview pyinstaller
```

---

## 📝 Paso 2: Crear el script lanzador de escritorio (`app_desktop.py`)

Crea un archivo llamado `app_desktop.py` en la raíz del proyecto con el siguiente código:

```python
import threading
import time
import os
import sys
import webview
from server import run_server  # O la función de arranque de tu server.py

PORT = 8000
URL = f"http://127.0.0.1:{PORT}"

def start_backend():
    """Inicia el servidor HTTP de Python en un hilo secundario."""
    # Asegurar el directorio de trabajo correcto
    if getattr(sys, 'frozen', False):
        base_dir = os.path.dirname(sys.executable)
    else:
        base_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(base_dir)
    
    # Arranca server.py
    os.system(f'python server.py {PORT}')

if __name__ == '__main__':
    # 1. Iniciar el servidor local en segundo plano
    t = threading.Thread(target=start_backend, daemon=True)
    t.start()
    
    # 2. Esperar 1 segundo para que el servidor esté activo
    time.sleep(1.2)
    
    # 3. Abrir la ventana nativa de escritorio con WebView2
    window = webview.create_window(
        title='Renombrador Inteligente de Exámenes ATPL',
        url=URL,
        width=1380,
        height=900,
        min_size=(1024, 700),
        confirm_close=True
    )
    
    # Inicia la ventana nativa de Windows
    webview.start()
```

---

## 🧪 Paso 3: Probar en modo desarrollo

Antes de empaquetar, puedes probar la app en modo ventana ejecutando:

```bash
python app_desktop.py
```

Verás cómo se abre directamente una ventana de programa independiente con todo el diseño oscuro, los filtros, el asistente de escaneos y el zoom funcionando a la perfección.

---

## 📦 Paso 4: Compilar en un archivo `.exe` con PyInstaller

Para generar el ejecutable final que puedas mover o compartir, ejecuta en la terminal:

```bash
pyinstaller --noconsole --onefile --name "RenombradorExamenes" ^
  --add-data "public;public" ^
  --add-data "asignaturas_atpl.json;." ^
  --add-data "alumnos_activos.json;." ^
  --icon="public/favicon.ico" ^
  app_desktop.py
```

> **Nota sobre los parámetros**:
> * `--noconsole` (o `-w`): Oculta la ventana negra de la terminal de comandos al abrir la app.
> * `--onefile`: Agrupa todo en un único archivo ejecutable (`RenombradorExamenes.exe`).
> * `--add-data`: Empaqueta los archivos estáticos HTML/CSS/JS y los diccionarios de materias y alumnos dentro de la aplicación.

---

## 📂 Paso 5: ¿Dónde queda el archivo ejecutable?

Una vez terminado el proceso de compilación de PyInstaller:

1. Ve a la carpeta **`dist/`** generada en tu proyecto.
2. Allí encontrarás el archivo **`RenombradorExamenes.exe`**.
3. Al hacer doble clic sobre él, se iniciará la aplicación de inmediato como cualquier programa estándar de Windows.

---

## 🔑 Manejo de la API Key de Gemini en el `.exe`

Para que el ejecutable reconozca tu clave de Gemini en otros ordenadores:
* Coloca tu archivo `.env` con `GEMINI_API_KEY=...` en la misma carpeta donde esté el archivo `RenombradorExamenes.exe`.
* O añade en el menú de la aplicación una pequeña casilla de configuración para que el usuario pueda introducir o guardar su clave en caso de ser necesario.
