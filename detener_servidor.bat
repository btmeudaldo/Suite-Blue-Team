@echo off
echo Deteniendo la Suite Blue Team y servidor local en el puerto 8000...
powershell -NoProfile -Command "$conns = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue; foreach ($c in $conns) { if ($c.OwningProcess -gt 0) { Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue } }"
powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name = 'pythonw.exe' or Name = 'python.exe'\" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like '*lanzador.py*' -or $_.CommandLine -like '*server.py*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"
echo Servidor y ventana cerrados correctamente.
ping 127.0.0.1 -n 2 >nul
