@echo off
setlocal EnableExtensions
chcp 65001 >nul
title 照片轉 PDF - 安裝或修復桌機環境

cd /d "%~dp0"

set "MIN_NODE_VERSION=22.13.0"
set "PNPM_VERSION=11.19.0"
set "CHECK_ONLY=0"
set "NO_START=0"

if /I "%~1"=="--check" set "CHECK_ONLY=1"
if /I "%~2"=="--check" set "CHECK_ONLY=1"
if /I "%~1"=="--no-start" set "NO_START=1"
if /I "%~2"=="--no-start" set "NO_START=1"

echo.
echo ============================================================
echo   照片轉 PDF - 桌機環境檢查與安裝
echo ============================================================
echo.

if not exist "package.json" (
  echo [失敗] 找不到 package.json。
  echo 請確認此檔案位於專案根目錄，再重新執行。
  goto :failed
)

call :find_node
if not defined NODE_COMMAND (
  echo [缺少] Node.js %MIN_NODE_VERSION% 以上版本。
  if "%CHECK_ONLY%"=="1" goto :failed
  call :install_node
  if errorlevel 1 goto :failed
  call :find_node
  if not defined NODE_COMMAND (
    echo.
    echo [提醒] Node.js 已執行安裝，但目前視窗還找不到它。
    echo 請關閉此視窗後，再執行一次本檔案。
    goto :failed
  )
)

for /f "delims=" %%V in ('call "%NODE_COMMAND%" -p "process.versions.node" 2^>nul') do set "NODE_VERSION=%%V"
if not defined NODE_VERSION (
  echo [失敗] Node.js 無法正常執行。
  goto :failed
)

"%NODE_COMMAND%" -e "const v=process.versions.node.split('.').map(Number);const ok=v[0]>22||(v[0]===22&&(v[1]>13||(v[1]===13&&v[2]>=0)));process.exit(ok?0:1)"
if errorlevel 1 (
  echo [過舊] Node.js v%NODE_VERSION%，本專案至少需要 v%MIN_NODE_VERSION%。
  if "%CHECK_ONLY%"=="1" goto :failed
  call :upgrade_node
  goto :failed
)
echo [正常] Node.js v%NODE_VERSION%
for %%D in ("%NODE_COMMAND%") do set "PATH=%%~dpD;%PATH%"

call :find_pnpm
if not defined PNPM_COMMAND (
  echo [缺少] pnpm。
  if "%CHECK_ONLY%"=="1" goto :failed
  call :install_pnpm
  if errorlevel 1 goto :failed
  call :find_pnpm
  if not defined PNPM_COMMAND (
    echo [失敗] pnpm 安裝後仍無法找到。
    echo 請關閉此視窗後，再執行一次本檔案。
    goto :failed
  )
)

call "%PNPM_COMMAND%" --version >nul 2>nul
if errorlevel 1 (
  echo [失敗] pnpm 無法正常執行。
  goto :failed
)
echo [正常] pnpm 可正常執行。

if "%CHECK_ONLY%"=="1" goto :check_packages

echo.
echo [處理中] 正在依 pnpm-lock.yaml 檢查並安裝缺少的專案套件...
call "%PNPM_COMMAND%" install --frozen-lockfile
if errorlevel 1 (
  echo.
  echo [失敗] 專案套件安裝失敗，請保留上方錯誤訊息以便排查。
  goto :failed
)

call :verify_packages
if errorlevel 1 goto :failed

echo.
echo ============================================================
echo   安裝與檢查完成，可以使用「啟動照片轉PDF.cmd」了。
echo ============================================================
echo.

if "%NO_START%"=="1" goto :success
choice /C YN /N /M "要現在啟動照片轉 PDF 嗎？[Y/N] "
if errorlevel 2 goto :success
if exist "啟動照片轉PDF.cmd" (
  call "啟動照片轉PDF.cmd"
) else (
  echo [提醒] 找不到「啟動照片轉PDF.cmd」。
)
goto :success

:check_packages
call :verify_packages
if errorlevel 1 goto :failed
echo [正常] 專案套件已安裝完成。
echo.
echo [檢查完成] 桌機環境可正常使用。
goto :success

:find_node
set "NODE_COMMAND="
for /f "delims=" %%N in ('where node.exe 2^>nul') do if not defined NODE_COMMAND set "NODE_COMMAND=%%N"
if defined NODE_COMMAND exit /b 0

set "BUNDLED_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if exist "%BUNDLED_NODE%" set "NODE_COMMAND=%BUNDLED_NODE%"
exit /b 0

:find_pnpm
set "PNPM_COMMAND="
for /f "delims=" %%P in ('where pnpm.cmd 2^>nul') do if not defined PNPM_COMMAND set "PNPM_COMMAND=%%P"
if defined PNPM_COMMAND exit /b 0

set "BUNDLED_PNPM=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd"
if exist "%BUNDLED_PNPM%" set "PNPM_COMMAND=%BUNDLED_PNPM%"
exit /b 0

:install_node
where winget.exe >nul 2>nul
if errorlevel 1 (
  echo.
  echo [無法自動安裝] 此電腦沒有 Windows Package Manager ^(winget^)。
  echo 請至 https://nodejs.org/zh-tw/download 安裝 Node.js LTS，
  echo 安裝完成後再重新執行本檔案。
  exit /b 1
)

echo.
choice /C YN /N /M "要使用 winget 安裝 Node.js LTS 嗎？[Y/N] "
if errorlevel 2 exit /b 1
echo [處理中] 正在安裝 Node.js LTS...
winget install --id OpenJS.NodeJS.LTS -e --accept-package-agreements --accept-source-agreements
if errorlevel 1 exit /b 1
set "PATH=%ProgramFiles%\nodejs;%LOCALAPPDATA%\Programs\nodejs;%APPDATA%\npm;%PATH%"
exit /b 0

:upgrade_node
where winget.exe >nul 2>nul
if errorlevel 1 (
  echo 請至 https://nodejs.org/zh-tw/download 更新 Node.js LTS。
  exit /b 1
)

echo.
choice /C YN /N /M "要使用 winget 更新 Node.js LTS 嗎？[Y/N] "
if errorlevel 2 exit /b 1
winget upgrade --id OpenJS.NodeJS.LTS -e --accept-package-agreements --accept-source-agreements
echo.
echo 更新完成後，請關閉此視窗並重新執行本檔案。
exit /b 0

:install_pnpm
where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo [失敗] 找不到 npm，請重新安裝 Node.js LTS 後再試一次。
  exit /b 1
)

echo [處理中] 正在安裝 pnpm v%PNPM_VERSION%...
call npm.cmd install --global pnpm@%PNPM_VERSION%
if errorlevel 1 (
  echo [失敗] pnpm 安裝失敗。
  echo 可嘗試以系統管理員身分執行本檔案。
  exit /b 1
)
set "PATH=%APPDATA%\npm;%PATH%"
exit /b 0

:verify_packages
if not exist "node_modules\.bin\vinext.cmd" (
  echo [缺少] 專案套件尚未完整安裝 ^(vinext^)。
  if "%CHECK_ONLY%"=="1" echo 請直接執行本檔案，不要加 --check，即可自動安裝。
  exit /b 1
)
if not exist "node_modules\pdf-lib\package.json" (
  echo [缺少] 專案套件尚未完整安裝 ^(pdf-lib^)。
  if "%CHECK_ONLY%"=="1" echo 請直接執行本檔案，不要加 --check，即可自動安裝。
  exit /b 1
)
echo [正常] 專案必要套件已就緒。
exit /b 0

:failed
echo.
echo [未完成] 請依照上方訊息處理後再試一次。
if "%CHECK_ONLY%"=="0" pause
endlocal
exit /b 1

:success
if "%CHECK_ONLY%"=="0" pause
endlocal
exit /b 0
