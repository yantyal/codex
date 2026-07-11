$ErrorActionPreference = "Stop"

$workspaceRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $workspaceRoot ".env.redmine"
$composeFile = Join-Path $workspaceRoot "redmine\compose.yaml"

<#
.SYNOPSIS
暗号学的に安全なローカル用シークレットを生成する。
.PARAMETER ByteLength
生成元となるランダムバイト数を指定する。
.OUTPUTS
16進数文字列を返す。
.NOTES
生成した値を標準出力へ表示しない。
#>
function New-LocalSecret {
    param(
        [Parameter(Mandatory = $true)]
        [int]$ByteLength
    )

    $bytes = New-Object byte[] $ByteLength
    $generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $generator.GetBytes($bytes)
    }
    finally {
        $generator.Dispose()
    }

    return [BitConverter]::ToString($bytes).Replace("-", "").ToLowerInvariant()
}

<#
.SYNOPSIS
ローカル専用の環境変数ファイルを読み込む。
.PARAMETER Path
読み込む環境変数ファイルのパスを指定する。
.OUTPUTS
なし。
.NOTES
値をログへ表示せず、現在のプロセス環境だけへ設定する。
#>
function Import-LocalEnvironment {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    foreach ($line in Get-Content -LiteralPath $Path) {
        if ([string]::IsNullOrWhiteSpace($line) -or $line.StartsWith("#")) {
            continue
        }

        $name, $value = $line.Split("=", 2)
        [Environment]::SetEnvironmentVariable($name, $value, "Process")
    }
}

if (-not (Test-Path -LiteralPath $envFile)) {
    $values = @(
        "REDMINE_DB_PASSWORD=$(New-LocalSecret -ByteLength 24)"
        "REDMINE_SECRET_KEY_BASE=$(New-LocalSecret -ByteLength 64)"
        "REDMINE_ADMIN_PASSWORD=$(New-LocalSecret -ByteLength 24)"
    )
    [System.IO.File]::WriteAllLines($envFile, $values)
}

Import-LocalEnvironment -Path $envFile

docker compose --env-file $envFile -f $composeFile up -d --wait
if ($LASTEXITCODE -ne 0) {
    throw "Redmine containers failed to start."
}

docker compose --env-file $envFile -f $composeFile exec -T `
    redmine cp /usr/src/redmine/bootstrap.rb /tmp/redmine-bootstrap.rb
if ($LASTEXITCODE -ne 0) {
    throw "Could not copy the Redmine bootstrap file."
}

docker compose --env-file $envFile -f $composeFile exec -T `
    -e REDMINE_ADMIN_PASSWORD=$env:REDMINE_ADMIN_PASSWORD `
    redmine bundle exec rails runner /tmp/redmine-bootstrap.rb
if ($LASTEXITCODE -ne 0) {
    throw "Redmine bootstrap failed."
}

Write-Host "Redmine is ready at http://localhost:8080"
