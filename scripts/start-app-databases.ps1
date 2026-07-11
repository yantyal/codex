$ErrorActionPreference = "Stop"
$workspaceRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $workspaceRoot ".env.app"
$composeFile = Join-Path $workspaceRoot "compose.app.yaml"

<#
.SYNOPSIS
ローカルDB用の推測されにくいランダム文字列を生成する。
.PARAMETER ByteLength
生成元になるランダムバイト数を指定する。
.OUTPUTS
16進数の文字列を返す。
.NOTES
生成した値を画面やログへ表示しない。
#>
function New-AppSecret {
    param([Parameter(Mandatory = $true)][int]$ByteLength)
    $bytes = New-Object byte[] $ByteLength
    $generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $generator.GetBytes($bytes) } finally { $generator.Dispose() }
    return [BitConverter]::ToString($bytes).Replace("-", "").ToLowerInvariant()
}

if (-not (Test-Path -LiteralPath $envFile)) {
    [System.IO.File]::WriteAllLines($envFile, @(
        "APP_DB_PASSWORD=$(New-AppSecret -ByteLength 24)"
        "APP_DB_ROOT_PASSWORD=$(New-AppSecret -ByteLength 24)"
    ))
}

docker compose --env-file $envFile -f $composeFile up -d --wait
if ($LASTEXITCODE -ne 0) { throw "Application databases failed to start." }
Write-Host "Development and test MySQL databases are ready."
