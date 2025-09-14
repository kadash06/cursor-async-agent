# PowerShell script to set up zrok tunnel for webhook endpoint
# Run this script to expose your local webhook server to the internet

param(
    [int]$Port = 3000,
    [string]$ReserveName = "cursor-webhook"
)

Write-Host "Setting up zrok tunnel for Cursor webhook..." -ForegroundColor Green
Write-Host "Make sure zrok is installed and you're logged in (zrok enable)" -ForegroundColor Yellow
Write-Host ""

# Check if zrok is available
try {
    $zrokVersion = & zrok version 2>$null
    Write-Host "zrok version: $zrokVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ zrok is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install zrok from https://zrok.io/" -ForegroundColor Yellow
    exit 1
}

# Check if user is logged in
try {
    & zrok status | Out-Null
} catch {
    Write-Host "❌ Not logged in to zrok. Please run 'zrok enable' first" -ForegroundColor Red
    exit 1
}

Write-Host "Creating zrok share for port $Port..." -ForegroundColor Green

# Reserve a share
$reserveOutput = & zrok reserve public localhost:$Port --name $ReserveName 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to reserve zrok share:" -ForegroundColor Red
    Write-Host $reserveOutput -ForegroundColor Red
    exit 1
}

Write-Host "✅ zrok share created successfully!" -ForegroundColor Green
Write-Host ""

# Extract the URL from the output
$urlLine = $reserveOutput | Where-Object { $_ -match "https://" }
if ($urlLine) {
    $webhookUrl = $urlLine.Trim()
    Write-Host "🌐 Webhook URL: $webhookUrl" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Add this to your .env file:" -ForegroundColor Yellow
    Write-Host "ZROK_SHARE_URL=$webhookUrl" -ForegroundColor White
    Write-Host ""
    Write-Host "Or use it directly when launching agents:" -ForegroundColor Yellow
    Write-Host "webhook_url: '$webhookUrl'" -ForegroundColor White
} else {
    Write-Host "⚠️  Could not extract URL from zrok output" -ForegroundColor Yellow
    Write-Host "Check the zrok output above for the share URL" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Keep this terminal open to maintain the tunnel." -ForegroundColor Green
Write-Host "Press Ctrl+C to stop the tunnel." -ForegroundColor Green
