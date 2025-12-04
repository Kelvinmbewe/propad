$headers = @{ "Content-Type" = "application/json" }

$adminBody = @{
    email = "admin@propad.co.zw"
    password = "password123"
    name = "Admin User"
} | ConvertTo-Json

$agentBody = @{
    email = "agent@propad.co.zw"
    password = "password123"
    name = "Verified Agent"
} | ConvertTo-Json

$userBody = @{
    email = "user@propad.co.zw"
    password = "password123"
    name = "Standard User"
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "http://localhost:3001/auth/register" -Method POST -Headers $headers -Body $adminBody
    Write-Host "Admin registered"
} catch {
    Write-Host "Admin registration failed: $_"
}

try {
    Invoke-RestMethod -Uri "http://localhost:3001/auth/register" -Method POST -Headers $headers -Body $agentBody
    Write-Host "Agent registered"
} catch {
    Write-Host "Agent registration failed: $_"
}

try {
    Invoke-RestMethod -Uri "http://localhost:3001/auth/register" -Method POST -Headers $headers -Body $userBody
    Write-Host "User registered"
} catch {
    Write-Host "User registration failed: $_"
}
