# scripts\dev.ps1
$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent

Write-Host "🦀 Lancement backend Axum..." -ForegroundColor Cyan
$backend = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Root\backend'; cargo run" -PassThru

Write-Host "⚛️  Lancement frontend Tauri..." -ForegroundColor Cyan
$frontend = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Root\frontend'; npm run tauri dev" -PassThru

Write-Host "✅ Dev lancé !" -ForegroundColor Green
Write-Host "   Backend  → http://localhost:8000"
Write-Host "   Frontend → Fenêtre Tauri"
Write-Host ""
Write-Host "Ferme les deux fenêtres PowerShell pour arrêter."