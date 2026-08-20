@echo off
setlocal
set "SCRIPT_DIR=%~dp0"
:: مسار مطلق ثابت (لا نستخدم %ProgramData% لأنها تتفسّر نسبياً بعد رفع الصلاحيات)
set "DEST_DIR=C:\ProgramData\cinemana"

if not exist "%DEST_DIR%" mkdir "%DEST_DIR%"
copy /Y "%SCRIPT_DIR%open.vbs" "%DEST_DIR%\open.vbs" >nul
set "VBS_PATH=%DEST_DIR%\open.vbs"

net session >nul 2>&1
if not %errorlevel%==0 (
    echo Requesting Administrator...
    powershell -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

reg add "HKCR\cinemana-player" /ve /t REG_SZ /d "URL:cinemana-player Protocol" /f
reg add "HKCR\cinemana-player" /v "URL Protocol" /t REG_SZ /d "" /f
reg add "HKCR\cinemana-player\shell\open\command" /ve /t REG_SZ /d "wscript.exe \"%VBS_PATH%\" \"%%1\"" /f

echo.
echo DONE! Protocol registered. Script at: %VBS_PATH%
echo (Fixed absolute path - survives folder deletion/rename)
echo.
pause
