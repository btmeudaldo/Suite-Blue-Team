import os
import sys
import subprocess

def create_shortcut():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    lanzador_path = os.path.join(base_dir, "lanzador.py")
    icon_path = os.path.join(base_dir, "public", "app_icon.ico")
    
    python_dir = os.path.dirname(sys.executable)
    pythonw_path = os.path.join(python_dir, "pythonw.exe")
    target_exe = pythonw_path if os.path.exists(pythonw_path) else sys.executable

    # Obtener la ruta del Escritorio de Windows
    desktop_cmd = "[Environment]::GetFolderPath('Desktop')"
    res = subprocess.run(["powershell", "-NoProfile", "-Command", desktop_cmd], capture_output=True, text=True)
    desktop_path = res.stdout.strip()
    
    if not desktop_path or not os.path.exists(desktop_path):
        desktop_path = os.path.expanduser(r"~\Desktop")

    shortcut_path = os.path.join(desktop_path, "Suite Blue Team.lnk")

    # Script de PowerShell para crear el .lnk con WScript.Shell
    ps_script = f'''
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut('{shortcut_path}')
$Shortcut.TargetPath = '{target_exe}'
$Shortcut.Arguments = '"{lanzador_path}"'
$Shortcut.WorkingDirectory = '{base_dir}'
$Shortcut.Description = 'Suite Apps Blue Team - Exámenes y ATL'
if (Test-Path '{icon_path}') {{
    $Shortcut.IconLocation = '{icon_path}, 0'
}}
$Shortcut.Save()
'''

    subprocess.run(["powershell", "-NoProfile", "-Command", ps_script], check=True)
    print(f"[OK] Acceso directo creado en: {shortcut_path}")

if __name__ == "__main__":
    create_shortcut()
