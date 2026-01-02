@echo off
echo Starting StreamSaver Local Server...
cd server
if not exist node_modules (
    echo Installing dependencies...
    npm install
)
node server.js
pause
