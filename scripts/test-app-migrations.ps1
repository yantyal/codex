$ErrorActionPreference = "Stop"
$workspaceRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $workspaceRoot ".env.app"

# Use only the test database on port 3308 to protect development data.
if (-not (Test-Path -LiteralPath $envFile)) {
    throw ".env.app does not exist. Run npm run db:start first."
}

$passwordLine = Get-Content -LiteralPath $envFile | Where-Object {
    $_.StartsWith("APP_DB_PASSWORD=")
}
if (-not $passwordLine) {
    throw "APP_DB_PASSWORD is missing."
}
$password = $passwordLine.Split("=", 2)[1]
$env:DATABASE_URL = "mysql://career_growth:${password}@localhost:3308/career_growth_test"

& npm.cmd --workspace "@career-growth/api" run db:deploy
if ($LASTEXITCODE -ne 0) {
    throw "Test migration failed."
}
# Run the same migration again to verify that deployment is repeatable.
& npm.cmd --workspace "@career-growth/api" run db:deploy
if ($LASTEXITCODE -ne 0) {
    throw "Repeated test migration failed."
}
Write-Host "Test migrations are reproducible."
