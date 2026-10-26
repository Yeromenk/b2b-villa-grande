$ErrorActionPreference = 'Stop'
$backend = $null
$frontend = $null
try {
    $node = (Get-Command node -ErrorAction Stop).Source
    $backendPath = Join-Path $PSScriptRoot 'back-end'
    $frontendPath = Join-Path $PSScriptRoot 'front-end'
    foreach ($folder in @($backendPath, $frontendPath)) {
        if (-not (Test-Path (Join-Path $folder 'node_modules'))) {
            Push-Location $folder
            try {
                & npm.cmd ci
                if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }
            } finally { Pop-Location }
        }
    }
    $backend = Start-Process -FilePath $node -ArgumentList 'src/server.js' -WorkingDirectory $backendPath -WindowStyle Hidden -PassThru
    $frontend = Start-Process -FilePath $node -ArgumentList 'node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5173 --strictPort --open' -WorkingDirectory $frontendPath -WindowStyle Hidden -PassThru
    Start-Sleep -Seconds 3
    if ($backend.HasExited -or $frontend.HasExited) { throw 'Server startup failed. Check whether ports 3001 and 5173 are already in use.' }
    Write-Host 'Villa Grande: http://127.0.0.1:5173'
    Read-Host 'Press Enter to stop Villa Grande'
} catch {
    Write-Host $_ -ForegroundColor Red
    Read-Host 'Press Enter to close'
} finally {
    foreach ($serverProcess in @($frontend, $backend)) {
        if ($null -ne $serverProcess -and -not $serverProcess.HasExited) {
            Stop-Process -Id $serverProcess.Id -ErrorAction SilentlyContinue
        }
    }
}
