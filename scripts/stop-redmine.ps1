$ErrorActionPreference = "Stop"

$workspaceRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $workspaceRoot ".env.redmine"
$composeFile = Join-Path $workspaceRoot "redmine\compose.yaml"

if (-not (Test-Path -LiteralPath $envFile)) {
    throw ".env.redmine does not exist. Start Redmine first."
}

docker compose --env-file $envFile -f $composeFile down
if ($LASTEXITCODE -ne 0) {
    throw "Redmine containers failed to stop."
}
