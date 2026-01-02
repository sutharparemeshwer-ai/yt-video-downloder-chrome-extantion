@echo off
setlocal
title StreamSaver Installer

echo ===================================================
echo      StreamSaver - One-Time Setup Utility
echo ===================================================
echo.

:: 1. Define Installation Paths
set "INSTALL_DIR=%LOCALAPPDATA%\StreamSaver"
set "BIN_DIR=%INSTALL_DIR%\bin"
set "EXE_NAME=StreamSaver-Server.exe"
set "SOURCE_EXE=StreamSaver-Server.exe"

echo [1/5] Preparing installation directory...
echo       Target: %INSTALL_DIR%

if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"
if not exist "%BIN_DIR%" mkdir "%BIN_DIR%"

:: 2. Stop existing process if running
echo.
echo [2/5] Stopping any running instances...
taskkill /F /IM "%EXE_NAME%" >nul 2>&1

:: 3. Copy Server Executable
echo.
echo [3/5] Installing Server...
if exist "%SOURCE_EXE%" (
    copy /Y "%SOURCE_EXE%" "%INSTALL_DIR%\%EXE_NAME%" >nul
    echo       - Server installed successfully.
) else (
    echo       [ERROR] %SOURCE_EXE% not found! 
    echo       Please run 'npm run build' first to generate the executable.
    pause
    exit /b
)

:: 4. Handle yt-dlp (Copy local or Download)
echo.
echo [4/5] Checking for yt-dlp Core...

if exist "yt-dlp.exe" (
    echo       - Found local yt-dlp.exe, copying...
    copy /Y "yt-dlp.exe" "%BIN_DIR%\yt-dlp.exe" >nul
) else if exist "bin\yt-dlp.exe" (
    echo       - Found local bin\yt-dlp.exe, copying...
    copy /Y "bin\yt-dlp.exe" "%BIN_DIR%\yt-dlp.exe" >nul
) else (
    echo       - yt-dlp not found locally. Downloading latest version...
    powershell -Command "Invoke-WebRequest -Uri 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe' -OutFile '%BIN_DIR%\yt-dlp.exe'"
    if exist "%BIN_DIR%\yt-dlp.exe" (
        echo       - Download complete!
    ) else (
        echo       [ERROR] Download failed. Please download yt-dlp.exe manually and place it in:
        echo       %BIN_DIR%
    )
)

:: 5. Set Auto-Start Registry Key
echo.
echo [5/5] Configuring Windows Auto-Start...
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "StreamSaverServer" /t REG_SZ /d "\"%INSTALL_DIR%\%EXE_NAME%\"" /f >nul
echo       - Registry key added.

:: Final Start
echo.
echo ===================================================
echo      Installation Complete!
echo ===================================================
echo.
echo Starting the server now...
start "" "%INSTALL_DIR%\%EXE_NAME%"

echo.
echo StreamSaver is running in the background.
echo You can now close this window and use the Chrome Extension.
pause
