@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo  ========================================
echo   WebGIS Viewer - Iniciando servidor
echo  ========================================
echo.

REM Preferencia 1: Python (server.py com CORS e MIME corretos)
where python >nul 2>nul
if %ERRORLEVEL%==0 (
  echo Servidor Python em http://localhost:3000
  echo.
  python server.py
  goto END
)

REM Preferencia 2: Node.js + Express
where node >nul 2>nul
if %ERRORLEVEL%==0 (
  if not exist "node_modules\express\" (
    echo Instalando dependencias Node.js...
    where npm >nul 2>nul
    if %ERRORLEVEL%==0 (
      call npm install
    ) else (
      echo npm nao encontrado. Instale Node.js completo: https://nodejs.org/
      goto END
    )
  )
  echo Servidor Node.js em http://localhost:3000
  echo.
  node server.js
  goto END
)

echo ERRO: Instale Python 3 ou Node.js para iniciar o servidor.
echo Python: https://www.python.org/downloads/
echo Node.js: https://nodejs.org/
pause

:END
