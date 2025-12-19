# PowerShell script to run the backfill migration for listingIntent
# This updates existing properties in the database without breaking the system

Write-Host "Running backfill migration for listingIntent..." -ForegroundColor Cyan
Write-Host "This will update existing properties with missing listingIntent values." -ForegroundColor Yellow

# Check if we're in the right directory
if (-not (Test-Path "pnpm-workspace.yaml")) {
    Write-Host "Error: Please run this script from the project root" -ForegroundColor Red
    exit 1
}

# Run the backfill script
npx tsx apps/api/prisma/migrations/backfill_listing_intent.ts

if ($LASTEXITCODE -eq 0) {
    Write-Host "Backfill completed successfully!" -ForegroundColor Green
} else {
    Write-Host "Backfill failed with exit code $LASTEXITCODE" -ForegroundColor Red
    exit $LASTEXITCODE
}

