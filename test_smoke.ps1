Stop-Process -Name node -Force -ErrorAction SilentlyContinue

$env:API_PORT="8787"
$env:SUPABASE_URL="https://mock.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="mock"

Write-Host "Booting API..."
$process = Start-Process node -ArgumentList "node_modules/tsx/dist/cli.mjs server/index.ts" -PassThru -NoNewWindow
Start-Sleep -Seconds 3

Write-Host "Running Smoke Test..."
npm run ecc:smoke

Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
