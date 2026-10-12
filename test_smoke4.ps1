Stop-Process -Name node -Force -ErrorAction SilentlyContinue

$env:API_PORT="8787"
$env:SUPABASE_URL="https://mock.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="mock"

$process = Start-Process node -ArgumentList "node_modules/tsx/dist/cli.mjs server/index.ts" -PassThru -NoNewWindow
Start-Sleep -Seconds 3

Write-Host "--- _META ROUTES JSON ---"
curl.exe -s http://localhost:8787/api/_meta/routes
Write-Host ""
Write-Host "--- SMOKE TEST ---"
npm run ecc:smoke

Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
