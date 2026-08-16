@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ==========================================================
echo       FLOWIDE - MASAÜSTÜ KISAYOLU OLUŞTURUCU
echo ==========================================================

powershell -NoProfile -ExecutionPolicy Bypass -Command "& { $desktop = [Environment]::GetFolderPath('Desktop'); $shortcutPath = Join-Path $desktop 'Flowide Arduino IDE.lnk'; $wscript = New-Object -ComObject WScript.Shell; $shortcut = $wscript.CreateShortcut($shortcutPath); $shortcut.TargetPath = (Join-Path (Get-Location) 'Flowide-Baslat.bat'); $shortcut.WorkingDirectory = (Get-Location).Path; $shortcut.Description = 'Flowide - Görsel Arduino IDE ve AST Derleyicisi'; $shortcut.Save(); Write-Host '[BASARILI] Masaüstünüze Flowide kısayolu eklendi!' -ForegroundColor Green; }"

echo.
echo Masaüstünüzdeki 'Flowide Arduino IDE' simgesine çift tıklayarak başlatabilirsiniz.
echo.
pause
