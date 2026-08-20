@echo off
setlocal
:: نثبّت مسار السكربت فوراً (قبل رفع الصلاحيات)
set "SCRIPT_DIR=%~dp0"
set "VBS_PATH=%SCRIPT_DIR%open.vbs"

:: نرفع نفسنا لـ Admin مع تمرير المسار الصحيح (تفادياً لتغيّر %~dp0 بعد الرفع)
net session >nul 2>&1
if not %errorlevel%==0 (
    echo Requesting Administrator...
    powershell -Command "Start-Process -FilePath '%~f0' -ArgumentList '%VBS_PATH%' -Verb RunAs"
    exit /b
)

:: نحن بصلاحيات Admin — نستخدم المسار الممرّر إن وُجد
if not "%~1"=="" set "VBS_PATH=%~1"
if not exist "%VBS_PATH%" (
    echo ERROR: open.vbs not found at %VBS_PATH%
    pause & exit /b 1
)

reg add "HKCR\cinemana-player" /ve /t REG_SZ /d "URL:cinemana-player Protocol" /f >nul
reg add "HKCR\cinemana-player" /v "URL Protocol" /t REG_SZ /d "" /f >nul
reg add "HKCR\cinemana-player\shell\open\command" /ve /t REG_SZ /d "wscript.exe \"%VBS_PATH%\" \"%%1\"" /f >nul

echo.
echo DONE! Protocol registered at: %VBS_PATH%
echo (Path is inside the extension folder - survives rename, no external files)
echo.
pause
