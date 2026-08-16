@echo off
chcp 65001 >nul
title Flowide Arduino IDE v1.0.7
cd /d "%~dp0"

echo ==========================================================
echo               FLOWIDE - ARDUINO GÖRSEL IDE                
echo ==========================================================
echo   Lokal sunucu başlatılıyor...
echo   Web Serial API (USB) bağlantısı etkinleştiriliyor.
echo ==========================================================

where node >nul 2>nul
if %ERRORLEVEL% equ 0 (
    node server.js
) else (
    echo [BILGI] Node.js bulunamadi, Windows PowerShell lokal sunucusu baslatiliyor...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "& { $port = 3000; $listener = New-Object System.Net.HttpListener; $listener.Prefixes.Add('http://127.0.0.1:' + $port + '/'); try { $listener.Start(); Start-Process ('http://127.0.0.1:' + $port + '/index.html'); Write-Host ('[Flowide] Sunucu http://127.0.0.1:' + $port + ' uzerinde calisiyor.'); while ($listener.IsListening) { $ctx = $listener.GetContext(); $req = $ctx.Request; $res = $ctx.Response; $rel = $req.Url.LocalPath.TrimStart('/'); if ([string]::IsNullOrWhiteSpace($rel)) { $rel = 'index.html' }; $target = [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $rel)); if ($target.StartsWith((Get-Location).Path) -and [System.IO.File]::Exists($target)) { $bytes = [System.IO.File]::ReadAllBytes($target); $res.ContentLength64 = $bytes.Length; $res.OutputStream.Write($bytes, 0, $bytes.Length); } else { $res.StatusCode = 404; }; $res.Close(); } } finally { $listener.Stop(); } }"
)

pause
