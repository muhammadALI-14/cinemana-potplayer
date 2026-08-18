@echo off
echo ============================================
echo  Cinemana -^> PotPlayer Protocol Setup
echo ============================================
echo.
echo  This registers cinemana-player:// protocol
echo  for automatic subtitle loading.
echo.
echo  Right-click and "Run as administrator"!
echo.

net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Run as Administrator!
    echo Right-click this file -^> "Run as administrator"
    pause
    exit /b 1
)

set "SCRIPT_DIR=%~dp0"
set "VBS_PATH=%SCRIPT_DIR%open.vbs"

reg add "HKCR\cinemana-player" /ve /t REG_SZ /d "URL:cinemana-player Protocol" /f >nul 2>&1
reg add "HKCR\cinemana-player" /v "URL Protocol" /t REG_SZ /d "" /f >nul 2>&1
reg add "HKCR\cinemana-player\shell\open\command" /ve /t REG_SZ /d "wscript.exe \"%VBS_PATH%\" \"%%1\"" /f >nul 2>&1

echo.
echo ============================================
echo  DONE! Protocol registered.
echo  Path: %VBS_PATH%
echo ============================================
echo.
pause
