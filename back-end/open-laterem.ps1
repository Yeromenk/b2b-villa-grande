$ErrorActionPreference = 'Stop'
$lateremChrome = Join-Path $env:ProgramFiles 'Google\Chrome\Application\chrome.exe'
if (-not (Test-Path -LiteralPath $lateremChrome)) { throw 'Google Chrome is not installed at the expected path.' }
$lateremProfile = Join-Path $env:TEMP 'laterem-browser-session'
Start-Process -FilePath $lateremChrome -WindowStyle Normal -ArgumentList @(
    '--remote-debugging-address=127.0.0.1',
    '--remote-debugging-port=9222',
    ('--user-data-dir="' + $lateremProfile + '"'),
    '--no-first-run', '--no-default-browser-check', '--new-window',
    'https://b2b.laterem.ua/#/app/start/0'
)
Write-Host 'Sign in to Laterem in this Chrome window, open the catalog, then run npm.cmd run import:laterem.'
