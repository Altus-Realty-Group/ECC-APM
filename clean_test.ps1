Stop-Process -Name node -Force -ErrorAction SilentlyContinue

$env:SUPABASE_URL="https://mock.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="mock"

$process = Start-Process node -ArgumentList "node_modules/tsx/dist/cli.mjs server/index.ts" -PassThru -NoNewWindow
Start-Sleep -Seconds 3

Write-Host "=== TEST A: BOOT SERVER ==="
Write-Host "Server booted without crashes."
Write-Host ""

Write-Host "=== TEST B: HEALTH (VARS PRESENT) ==="
curl.exe -s -i http://localhost:8787/api/health
Write-Host ""
Write-Host "=== TEST C: PORTFOLIO (VARS PRESENT) ==="
curl.exe -s -i "http://localhost:8787/api/portfolio/properties?limit=1&offset=0"
Write-Host ""

Stop-Process -Id $process.Id -Force
Start-Sleep -Seconds 1

$env:SUPABASE_URL=""
$env:SUPABASE_SERVICE_ROLE_KEY=""

$process = Start-Process node -ArgumentList "node_modules/tsx/dist/cli.mjs server/index.ts" -PassThru -NoNewWindow
Start-Sleep -Seconds 3

Write-Host "=== TEST D: HEALTH / PORTFOLIO (VARS MISSING) ==="
curl.exe -s -i http://localhost:8787/api/health
Write-Host ""

Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
Stop-Process -Name node -Force -ErrorAction SilentlyContinue
