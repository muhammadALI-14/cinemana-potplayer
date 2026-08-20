param()
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: Run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click register.bat - Run as administrator" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# المسار يُكتشف تلقائياً من موقع هذا السكربت (يعمل بأي اسم/مكان مجلد)
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$helperPath = Join-Path $scriptDir "open.vbs"
$helperReg = $helperPath -replace '\\','\\'

$reg = @"
Windows Registry Editor Version 5.00

[HKEY_CLASSES_ROOT\cinemana-player]
@="URL:cinemana-player Protocol"
"URL Protocol"=""

[HKEY_CLASSES_ROOT\cinemana-player\shell\open\command]
@="wscript.exe \"$helperReg\" `"%1`""
"@

$tempReg = Join-Path $env:TEMP "cinemana-player.reg"
[System.IO.File]::WriteAllText($tempReg, $reg, [System.Text.Encoding]::Unicode)

Start-Process regedit -ArgumentList "/s `"$tempReg`"" -Wait
Remove-Item $tempReg -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Protocol registered successfully!" -ForegroundColor Green
Write-Host "Path: $helperPath"
Write-Host ""
Read-Host "Press Enter to exit"
