$ErrorActionPreference = "Stop"

$workspaceRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $workspaceRoot ".env.redmine"
$composeFile = Join-Path $workspaceRoot "redmine\compose.yaml"
$mcpDirectory = Join-Path $workspaceRoot "tools\redmine-mcp"

if (-not (Test-Path -LiteralPath $envFile)) {
    throw ".env.redmine does not exist. Run scripts/start-redmine.ps1 first."
}

$apiKey = docker compose --env-file $envFile -f $composeFile exec -T `
    redmine bundle exec rails runner "print User.find_by!(login: 'admin').api_key"
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($apiKey)) {
    throw "Could not obtain a Redmine API key."
}

$env:REDMINE_URL = "http://localhost:8080"
$env:REDMINE_API_KEY = $apiKey.Trim()

npm --prefix $mcpDirectory run import:mvp
if ($LASTEXITCODE -ne 0) {
    throw "MVP ticket import failed."
}
