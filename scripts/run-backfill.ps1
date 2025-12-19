# PowerShell script to run the backfill migration for listingIntent
# This updates existing properties in the database without breaking the system

Write-Host "Running backfill migration for listingIntent..." -ForegroundColor Cyan
Write-Host "This will update existing properties with missing listingIntent values." -ForegroundColor Yellow

# Check if we're in the right directory
if (-not (Test-Path "pnpm-workspace.yaml")) {
    Write-Host "Error: Please run this script from the project root" -ForegroundColor Red
    exit 1
}

# Check if DATABASE_URL is set, if not, try to load from .env
if (-not $env:DATABASE_URL) {
    $envFile = "apps/api/.env"
    if (Test-Path $envFile) {
        Write-Host "Loading DATABASE_URL from $envFile..." -ForegroundColor Yellow
        Get-Content $envFile | ForEach-Object {
            if ($_ -match '^DATABASE_URL=(.+)$') {
                $env:DATABASE_URL = $matches[1]
                Write-Host "Loaded DATABASE_URL from .env file" -ForegroundColor Green
            }
        }
    }
}

# Check if DATABASE_URL still looks like Docker
if ($env:DATABASE_URL -and ($env:DATABASE_URL -match 'postgres:5432' -or $env:DATABASE_URL -match '@postgres:')) {
    Write-Host "" -ForegroundColor Red
    Write-Host "WARNING: DATABASE_URL appears to be configured for Docker!" -ForegroundColor Red
    Write-Host "Current DATABASE_URL: $env:DATABASE_URL" -ForegroundColor Yellow
    Write-Host "" -ForegroundColor Red
    Write-Host "Please set DATABASE_URL to your local database:" -ForegroundColor Yellow
    Write-Host '  $env:DATABASE_URL="postgresql://user:password@localhost:5432/propad?schema=public"' -ForegroundColor Cyan
    Write-Host "" -ForegroundColor Red
    $response = Read-Host "Do you want to continue anyway? (y/N)"
    if ($response -ne 'y' -and $response -ne 'Y') {
        Write-Host "Aborted." -ForegroundColor Yellow
        exit 1
    }
}

# Run the backfill script
npx tsx apps/api/prisma/migrations/backfill_listing_intent.ts

if ($LASTEXITCODE -eq 0) {
    Write-Host "Backfill completed successfully!" -ForegroundColor Green
} else {
    Write-Host "Backfill failed with exit code $LASTEXITCODE" -ForegroundColor Red
    exit $LASTEXITCODE
}

