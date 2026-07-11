$ErrorActionPreference = "Stop"

$workspaceRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $workspaceRoot ".env.redmine"
$composeFile = Join-Path $workspaceRoot "redmine\compose.yaml"
$serverEntry = Join-Path $workspaceRoot "tools\redmine-mcp\dist\server.js"
$redmineMcpLogin = "Codex"

if (-not (Test-Path -LiteralPath $envFile)) {
    throw ".env.redmine does not exist. Run scripts/start-redmine.ps1 first."
}

if (-not (Test-Path -LiteralPath $serverEntry)) {
    throw "Redmine MCP is not built. Run npm run build in tools/redmine-mcp."
}

$apiKey = docker compose --env-file $envFile -f $composeFile exec -T `
    -e REDMINE_MCP_LOGIN=$redmineMcpLogin `
    redmine bundle exec rails runner "print User.find_by!(login: ENV.fetch('REDMINE_MCP_LOGIN')).api_key"
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($apiKey)) {
    throw "Could not obtain a Redmine API key."
}

$env:REDMINE_URL = "http://localhost:8080"
$env:REDMINE_API_KEY = $apiKey.Trim()

node $serverEntry
