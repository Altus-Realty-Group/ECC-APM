Stop-Process -Name node -Force -ErrorAction SilentlyContinue

$env:API_PORT="8787"
$env:SUPABASE_URL="https://mock.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="mock"

Write-Host "=== BOOTING API ==="
$process = Start-Process node -ArgumentList "node_modules/tsx/dist/cli.mjs server/index.ts" -PassThru -NoNewWindow
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "=== 1) RAW /api/_meta/routes RESPONSE ==="
curl.exe -i -s http://localhost:8787/api/_meta/routes
Write-Host ""

Write-Host "=== 2) 410 VERIFICATION (ALL FOUR) ==="
Write-Host "--- /api/properties/:id ---"
curl.exe -i -s http://localhost:8787/api/properties/123
Write-Host ""
Write-Host "--- /api/properties/by-doorloop/:dlId ---"
curl.exe -i -s http://localhost:8787/api/properties/by-doorloop/dl-456
Write-Host ""
Write-Host "--- /api/owners/search ---"
curl.exe -i -s http://localhost:8787/api/owners/search
Write-Host ""
Write-Host "--- /api/owners/:id/properties ---"
curl.exe -i -s http://localhost:8787/api/owners/123/properties
Write-Host ""

Write-Host "=== 4) SMOKE TEST RAW LOG ==="
npm run ecc:smoke
Write-Host ""

Write-Host "=== 5) ARTIFACT HASH ==="
Get-FileHash server/lib/routeRegistry.ts, scripts/ecc_route_smoke.mjs, C:\Users\Dionr\.gemini\antigravity\brain\6bbf2f37-7473-4c6a-a3dd-e084bf40699d\ECC_ROUTE_LOCK_REPORT.md -Algorithm SHA256 | Format-Table -AutoSize

Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
