@echo off
echo Deteniendo servidor local en el puerto 8000...
powershell -NoProfile -Command "$conns = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue; foreach ($c in $conns) { if ($c.OwningProcess -gt 0) { Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue } }"
echo Servidor detenido correctamente.
ping 127.0.0.1 -n 2 >nul
