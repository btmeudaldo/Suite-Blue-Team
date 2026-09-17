import os
import sys
import time
import socket
import threading
import urllib.request

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

# Streams seguros para pythonw
if sys.stdout is None:
    sys.stdout = open(os.devnull, "w", encoding="utf-8")
if sys.stderr is None:
    sys.stderr = open(os.devnull, "w", encoding="utf-8")

import server

PORT = 8000
URL = f"http://127.0.0.1:{PORT}"

def is_port_in_use(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.3)
        return s.connect_ex(('127.0.0.1', port)) == 0

def start_backend():
    if not is_port_in_use(PORT):
        server.run(PORT)

def wait_for_server():
    for _ in range(40):
        try:
            req = urllib.request.Request(f"{URL}/", headers={"User-Agent": "HealthCheck"})
            with urllib.request.urlopen(req, timeout=0.5) as res:
                if res.status == 200:
                    return True
        except Exception:
            pass
        time.sleep(0.1)
    return False

if __name__ == '__main__':
    os.chdir(BASE_DIR)

    # 1. Iniciar el servidor local en un hilo secundario del mismo proceso
    t = threading.Thread(target=start_backend, daemon=True)
    t.start()

    # 2. Esperar a que el servidor HTTP esté activo y respondiendo
    wait_for_server()

    # 3. Lanzar la ventana nativa de escritorio con WebView2 (Edge nativo)
    try:
        import webview
        window = webview.create_window(
            title='Blue Team Operations Suite - Exámenes & ATLs',
            url=URL,
            width=1420,
            height=920,
            min_size=(1024, 700)
        )
        # webview.start() mantiene la app abierta hasta que el usuario cierra la ventana
        webview.start(private_mode=False)
    except Exception as e:
        # Fallback en caso de que WebView2 no esté disponible
        import webbrowser
        webbrowser.open(URL)
        # Mantener el proceso vivo
        while True:
            time.sleep(1)
