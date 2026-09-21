@echo off
title JAVIS Idio - AI Voice & Live Translator Premium
cd /d "%~dp0dist-electron\JAVIS Idio-win32-x64"
if exist "JAVIS Idio.exe" (
    start "" "JAVIS Idio.exe"
) else (
    echo [ERROR] Khong tim thay file JAVIS Idio.exe trong thu muc dist-electron!
    pause
)
