$body = @{
    email    = 'demo.user@propad.co.zw'
    password = 'PropAd123!'
}
try {
    $response = Invoke-RestMethod -Uri 'http://localhost:3001/auth/login' -Method Post -ContentType 'application/json' -Body ($body | ConvertTo-Json)
    Write-Host "Success! Token received."
    Write-Host "Access Token: $($response.accessToken)"
}
catch {
    Write-Host "Login Failed"
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)"
    Write-Host "Message: $($_.ErrorDetails.Message)"
}
