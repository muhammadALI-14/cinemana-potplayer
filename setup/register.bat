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

regedit /s "%~dp0register.reg"

echo.
echo ============================================
echo  DONE! Protocol registered.
echo ============================================
echo.
pause
