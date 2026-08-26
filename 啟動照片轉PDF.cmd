@echo off
setlocal
chcp 65001 >nul
title 照片轉 PDF
cd /d "%~dp0"

set "APP_URL=http://localhost:3000/"
set "BUNDLED_NODE=C:\Users\S433383\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin"
set "BUNDLED_PNPM=C:\Users\S433383\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd"

if /i "%~1"=="--check" (
  if not exist "package.json" exit /b 2
  echo launcher-ok
  exit /b 0
)

rem If the app is already running, only open it in the browser.
powershell.exe -NoProfile -Command "try { if ((Invoke-WebRequest -Uri '%APP_URL%' -UseBasicParsing -TimeoutSec 2).StatusCode -eq 200) { exit 0 } } catch {}; exit 1" >nul 2>nul
if not errorlevel 1 (
  start "" "%APP_URL%"
  exit /b 0
)

rem Prefer the Node.js runtime bundled with Codex on this computer.
if exist "%BUNDLED_NODE%\node.exe" if exist "%BUNDLED_PNPM%" (
  set "PATH=%BUNDLED_NODE%;C:\Users\S433383\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback;%PATH%"
  set "PNPM_COMMAND=%BUNDLED_PNPM%"
  goto runtime_ready
)

rem Fall back to a normal Node.js and pnpm installation.
where node.exe >nul 2>nul
if errorlevel 1 goto missing_runtime
where pnpm.cmd >nul 2>nul
if errorlevel 1 goto missing_runtime
set "PNPM_COMMAND=pnpm.cmd"

:runtime_ready
echo.
echo ========================================
echo   照片轉 PDF 正在啟動
echo ========================================
echo.

if not exist "node_modules\.bin\vinext.cmd" (
  echo 第一次啟動，正在安裝必要元件，請稍候...
  call "%PNPM_COMMAND%" install
  if errorlevel 1 goto install_failed
)

rem Open the browser only after the local site is ready.
start "" /b powershell.exe -NoProfile -WindowStyle Hidden -Command "$url='%APP_URL%'; for ($i=0; $i -lt 120; $i++) { try { if ((Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 1).StatusCode -eq 200) { Start-Process $url; exit } } catch {}; Start-Sleep -Milliseconds 500 }"

echo 啟動完成後會自動開啟瀏覽器。
echo 請保留這個視窗；要關閉系統時按 Ctrl+C。
echo.
call "%PNPM_COMMAND%" dev
echo.
echo 系統已停止。
pause
exit /b 0

:missing_runtime
echo.
echo 找不到 Node.js 或 pnpm。
echo 請先安裝 Node.js 22.13 以上版本，再執行：
echo npm install -g pnpm
echo.
pause
exit /b 1

:install_failed
echo.
echo 必要元件安裝失敗，請確認網路連線後再試一次。
echo.
pause
exit /b 1
