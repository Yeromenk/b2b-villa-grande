param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('laterem', 'ceramamarket')]
    [string]$Supplier
)

$ErrorActionPreference = 'Stop'
try {
    Push-Location (Join-Path $PSScriptRoot 'back-end')
    try {
        if (-not (Test-Path -LiteralPath 'node_modules')) {
            & npm.cmd ci
            if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }
        }
        if ($Supplier -eq 'laterem') {
            & .\open-laterem.ps1
            Read-Host 'Sign in to Laterem in Chrome and open the catalog. Then press Enter here to update all sections'
        }
        & npm.cmd run "import:$Supplier" -- --section all
        if ($LASTEXITCODE -ne 0) { throw "Import failed (exit code $LASTEXITCODE). See the messages above." }
        Write-Host 'Update completed. Refresh the catalog in Villa Grande.' -ForegroundColor Green
    } finally {
        Pop-Location
    }
} catch {
    Write-Host $_ -ForegroundColor Red
}
Read-Host 'Press Enter to close'
