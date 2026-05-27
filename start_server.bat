@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo  ========================================
echo   WebGIS Viewer - Iniciando servidor
echo  ========================================
echo.

netstat -ano | findstr /R /C:":3000 .*LISTENING" >nul 2>nul
if %ERRORLEVEL%==0 (
  echo AVISO: A porta 3000 ja esta em uso.
  echo        Se o WebGIS ja estiver aberto, acesse http://localhost:3000
  echo        Caso contrario, feche o processo anterior ou use PORT=3001
  echo.
)

REM Preferencia 1: Python (server.py com CORS e MIME corretos)
where python >nul 2>nul
if %ERRORLEVEL%==0 (
  echo Servidor Python em http://localhost:3000
  echo Mantenha esta janela aberta enquanto usar o mapa.
  echo.
  python -u server.py
  if errorlevel 1 (
    echo.
    echo ERRO ao iniciar o servidor Python.
    pause
  )
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
      pause
      goto END
    )
  )
  echo Servidor Node.js em http://localhost:3000
  echo Mantenha esta janela aberta enquanto usar o mapa.
  echo.
  node server.js
  if errorlevel 1 pause
  goto END
)

echo ERRO: Instale Python 3 ou Node.js para iniciar o servidor.
echo Python: https://www.python.org/downloads/
echo Node.js: https://nodejs.org/
pause

:END
