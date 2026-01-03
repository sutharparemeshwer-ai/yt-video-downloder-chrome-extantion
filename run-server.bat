@echo off
echo Starting StreamSaver Local Server...
cd server
if not exist yt-dlp.exe (
    if not exist bin\yt-dlp.exe (
        echo [WARNING] yt-dlp.exe not found in server folder or bin/!
        echo Attempting to use global version...
    )
)
if not exist node_modules (
    echo Installing dependencies...
    npm install
)
node server.js
pause
