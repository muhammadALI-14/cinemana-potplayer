@echo off
:: ===== Cinemana -> PotPlayer Protocol Setup =====
:: يرافع نفسه لـ Administrator تلقائياً (UAC) ثم يسجّل البروتوكول
:: باستخدام %%~dp0 — يعمل بأي اسم/مكان مجلد

net session >nul 2>&1
if %%errorlevel%% neq 0 (
    echo Requesting Administrator privileges...
    powershell -Command "Start-Process -FilePath '%%~f0' -Verb RunAs"
    exit /b
)

set "SCRIPT_DIR=%%~dp0"
set "VBS_PATH=%%SCRIPT_DIR%%open.vbs"

reg add "HKCR\cinemana-player" /ve /t REG_SZ /d "URL:cinemana-player Protocol" /f >nul 2>&1
reg add "HKCR\cinemana-player" /v "URL Protocol" /t REG_SZ /d "" /f >nul 2>&1
reg add "HKCR\cinemana-player\shell\open\command" /ve /t REG_SZ /d "wscript.exe \"%%VBS_PATH%%\" \"%%1\"" /f >nul 2>&1

echo.
echo DONE! Protocol registered at: %%VBS_PATH%%
echo.
pause
