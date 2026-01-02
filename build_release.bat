@echo off
echo ===================================================
echo      StreamSaver Release Builder
echo ===================================================
echo.

set "DIST_DIR=StreamSaver-Release"

echo [1/4] Cleaning old build...
if exist "%DIST_DIR%" rmdir /s /q "%DIST_DIR%"
mkdir "%DIST_DIR%"
mkdir "%DIST_DIR%\Server"
mkdir "%DIST_DIR%\Extension"

echo.

echo [2/4] Compiling Server...
cd server
call npm run build
if errorlevel 1 (
    echo [ERROR] Build failed!
    pause
    exit /b
)
cd ..

echo.

echo [3/4] Copying Server Files...
copy "server\StreamSaver-Server.exe" "%DIST_DIR%\Server\" >nul
copy "server\setup.bat" "%DIST_DIR%\Server\" >nul

:: Copy yt-dlp if it exists locally, otherwise setup.bat handles it
if exist "server\yt-dlp.exe" copy "server\yt-dlp.exe" "%DIST_DIR%\Server\" >nul
if exist "server\bin\yt-dlp.exe" (
    mkdir "%DIST_DIR%\Server\bin"
    copy "server\bin\yt-dlp.exe" "%DIST_DIR%\Server\bin\" >nul
)

echo.

echo [4/4] Copying Extension Files...
copy "manifest.json" "%DIST_DIR%\Extension\" >nul
copy "background.js" "%DIST_DIR%\Extension\" >nul
copy "content.js" "%DIST_DIR%\Extension\" >nul
copy "popup.html" "%DIST_DIR%\Extension\" >nul
copy "popup.css" "%DIST_DIR%\Extension\" >nul
copy "popup.js" "%DIST_DIR%\Extension\" >nul
xcopy "icons" "%DIST_DIR%\Extension\icons\" /E /I /Y >nul

echo.

echo ===================================================
echo      Build Complete!
echo ===================================================
echo.

echo Your release is ready in the folder: "%DIST_DIR%"
echo.

echo ZIP this folder and give it to your users.
pause
