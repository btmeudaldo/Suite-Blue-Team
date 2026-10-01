import os
import sys
import time
import socket
import threading
import urllib.request
import subprocess

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

def is_server_healthy():
    try:
        req = urllib.request.Request(f"{URL}/", headers={"User-Agent": "HealthCheck"})
        with urllib.request.urlopen(req, timeout=1.0) as res:
            return res.status == 200
    except Exception:
        return False

def kill_process_on_port(port):
    try:
        cmd = f'powershell -NoProfile -Command "$c = Get-NetTCPConnection -LocalPort {port} -State Listen -ErrorAction SilentlyContinue; if ($c.OwningProcess -gt 0) {{ Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue }}"'
        subprocess.run(cmd, shell=True, timeout=5)
        time.sleep(0.5)
    except Exception:
        pass

def start_backend():
    if not is_server_healthy():
        kill_process_on_port(PORT)
        server.run(PORT)

def wait_for_server(max_seconds=15):
    start = time.time()
    while time.time() - start < max_seconds:
        if is_server_healthy():
            return True
        time.sleep(0.2)
    return False

if __name__ == '__main__':
    os.chdir(BASE_DIR)

    # 1. Iniciar el servidor local en segundo plano si no está activo
    if not is_server_healthy():
        t = threading.Thread(target=start_backend, daemon=True)
        t.start()

    # 2. Esperar a que el servidor HTTP esté activo y respondiendo
    wait_for_server(max_seconds=15)

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
        # debug solo se activa si se pasa explícitamente el parámetro --debug o -d
        is_debug = '--debug' in sys.argv or '-d' in sys.argv
        webview.start(debug=is_debug, private_mode=False)
    except Exception as e:
        # Fallback en caso de que WebView2 no esté disponible
        import webbrowser
        webbrowser.open(URL)
        while True:
            time.sleep(1)

