# ─────────────────────────────────────────────
#  dev.ps1 — levanta toda la aplicación en Windows
# ─────────────────────────────────────────────

$ErrorActionPreference = 'Stop'

$ProjectDir  = $PSScriptRoot
$VenvDir     = Join-Path $ProjectDir '.venv'
$PythonExe   = Join-Path $VenvDir 'Scripts\python.exe'
$FrontendDir = Join-Path $ProjectDir 'frontend'

Set-Location $ProjectDir

# ── [1/4] Entorno virtual ───────────────────
if (-not (Test-Path $PythonExe)) {
    Write-Host "[1/4] Creando .venv e instalando requirements..." -ForegroundColor Cyan
    python -m venv $VenvDir
} else {
    Write-Host "[1/4] .venv ya existe" -ForegroundColor Cyan
}

# ── [2/4] Docker (PostgreSQL) ───────────────
Write-Host "[2/4] Levantando contenedores de Docker..." -ForegroundColor Cyan
docker compose up -d
if ($LASTEXITCODE -ne 0) { throw "docker compose up -d falló" }

Write-Host "Esperando que PostgreSQL esté healthy..." -ForegroundColor Cyan
$healthy = $false
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 2
    $status = docker inspect --format '{{.State.Health.Status}}' stock_manager_db 2>$null
    if ($status -eq 'healthy') { $healthy = $true; break }
}
if (-not $healthy) {
    Write-Warning "PostgreSQL no reportó healthy en 60s. Revisá `docker logs stock_manager_db`."
}

# ── [3/4] API (uvicorn) en ventana nueva ────
Write-Host "[3/4] Abriendo la API en una ventana nueva..." -ForegroundColor Cyan
Start-Process powershell -WorkingDirectory $ProjectDir -ArgumentList '-NoExit', '-Command', "& '$PythonExe' -m uvicorn app.main:app --reload"

# ── [4/4] Frontend (vite) en ventana nueva ───
if (-not (Test-Path (Join-Path $FrontendDir 'node_modules'))) {
    Write-Host "Instalando dependencias del frontend..." -ForegroundColor Cyan
    Push-Location $FrontendDir
    try { npm install } finally { Pop-Location }
}
Write-Host "[4/4] Abriendo el frontend en una ventana nueva..." -ForegroundColor Cyan
Start-Process powershell -WorkingDirectory $FrontendDir -ArgumentList '-NoExit', '-Command', 'npm run dev'

Write-Host ""
Write-Host "Todo listo:" -ForegroundColor Green
Write-Host "  API:      http://localhost:8000"
Write-Host "  Frontend: http://localhost:5173"
